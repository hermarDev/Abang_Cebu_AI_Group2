# Typing Indicator Implementation Plan for AbangCebuAI Messaging

## Research Summary

### Approach: Supabase Realtime Broadcast (Recommended)
- **No database changes needed** - Broadcast events are ephemeral, not persisted
- **Lightweight** - Just WebSocket messages, no WAL overhead
- **Real-time** - Sub-millisecond delivery
- **Self-cleaning** - Offline clients simply miss events (by design)
- **Filterable** - Per-conversation channel with `conversation_id` filter

### Existing Assets to Reuse
1. **CSS Animation** - `.chatTypingDots` with `chat-dot-pulse` keyframes in `RestoredFinderShell.module.css`
2. **Message List Structure** - `MessageScroller` with `<ol>` for messages
3. **Realtime Infrastructure** - Already have `createClient()` and channel management in `MessagingInbox.tsx`

## Implementation Plan

### 1. Add Typing Indicator CSS to Message Components
Create a shared CSS module or extend existing chat components with typing indicator styles (reusing the existing animation).

### 2. Create `useTypingIndicator` Hook
```typescript
// src/features/messages/useTypingIndicator.ts
- Debounced typing broadcast (300ms debounce, 3s auto-expire)
- Listens for broadcast events on conversation-scoped channel
- Returns: { isCounterpartTyping: boolean, sendTyping: (isTyping: boolean) => void }
```

### 3. Integrate into MessagingInbox
- Add hook call in `MessagingInboxInner` when `selectedId` exists
- Render typing indicator in message list (above composer, below messages)
- Broadcast typing on textarea `onChange` with debounce

### 4. Channel Strategy
- Reuse existing realtime channel or create separate broadcast channel
- Channel name: `chat:${conversationId}` (separate from postgres_changes channel)
- Events: `typing` with payload `{ userId, userName, isTyping }`

## Detailed Steps

### Step 1: Create Typing Indicator Hook
**File:** `src/features/messages/useTypingIndicator.ts`

### Step 2: Add Typing Indicator UI Component
**File:** `src/components/ui/chat/TypingIndicator.tsx` (new)

### Step 3: Add CSS for Typing Indicator
**File:** `src/components/ui/chat/TypingIndicator.module.css` (new) - reuse existing animation

### Step 4: Integrate in MessagingInbox
- Import and use hook when `selectedId` is set
- Render `TypingIndicator` component in message list area
- Call `sendTyping(true)` on textarea input, with auto-reset

### Step 5: Tests
- Unit test hook behavior (debounce, expiry)
- Component test for TypingIndicator rendering
- Integration test for broadcast send/receive

## Architecture Diagram

```
User A types in textarea
    ↓
onChange → sendTyping(true) [debounced 300ms]
    ↓
Supabase Broadcast: channel.send({type:'broadcast', event:'typing', payload:{userId:A, isTyping:true}})
    ↓
User B's channel.on('broadcast', {event:'typing'}) fires
    ↓
setIsCounterpartTyping(true) → renders TypingIndicator
    ↓
Auto-expire after 3s of no new typing events
    ↓
setIsCounterpartTyping(false) → hides indicator
```

## Security
- Broadcast channel requires authenticated Supabase client
- RLS not needed for broadcast (ephemeral, no database access)
- Payload only includes `userId` and `isTyping` (no message content)
- Channel scoped to `conversationId` - users only join their conversations

## Rollback
- Feature flag or simply don't call the hook
- No database migration needed
- Zero risk to existing messaging

## Estimated Effort
- Hook: ~50 lines
- Component: ~30 lines  
- CSS: ~20 lines (reuse existing)
- Integration: ~20 lines
- Tests: ~50 lines
**Total: ~170 lines, 2-3 files new, 1 file modified**