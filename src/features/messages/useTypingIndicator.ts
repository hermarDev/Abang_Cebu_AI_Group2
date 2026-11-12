"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface TypingPayload {
  userId: string;
  userName?: string;
  isTyping: boolean;
}

interface UseTypingIndicatorOptions {
  conversationId: string;
  userId: string;
  userName?: string;
  enabled?: boolean;
  /** Debounce ms for sending typing events */
  debounceMs?: number;
  /** Auto-expire ms after last typing event */
  expireMs?: number;
}

interface UseTypingIndicatorReturn {
  /** Whether the counterpart is currently typing */
  isCounterpartTyping: boolean;
  /** Call when user starts/stops typing */
  sendTyping: (isTyping: boolean) => void;
}

export function useTypingIndicator({
  conversationId,
  userId,
  userName,
  enabled = true,
  debounceMs = 300,
  expireMs = 3000,
}: UseTypingIndicatorOptions): UseTypingIndicatorReturn {
  const [isCounterpartTyping, setIsCounterpartTyping] = useState(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTypingRef = useRef(false);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
    if (channelRef.current) {
      const supabase = createClient();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setIsCounterpartTyping(false);
    pendingTypingRef.current = false;
  }, []);

  // Set up broadcast listener
  useEffect(() => {
    if (!enabled || !conversationId || !userId) return;

    const supabase = createClient();
    const channel = supabase.channel(`chat:${conversationId}`);

    channel
      .on(
        "broadcast",
        { event: "typing" },
        ({ payload }) => {
          const typingPayload = payload as TypingPayload;
          // Ignore own typing events
          if (typingPayload.userId === userId) return;

          if (typingPayload.isTyping) {
            setIsCounterpartTyping(true);
            // Reset expiry timer
            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
            }
            typingTimeoutRef.current = setTimeout(() => {
              setIsCounterpartTyping(false);
              typingTimeoutRef.current = null;
            }, expireMs);
          } else {
            setIsCounterpartTyping(false);
            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
              typingTimeoutRef.current = null;
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      cleanup();
    };
  }, [conversationId, userId, enabled, expireMs, cleanup]);

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!enabled || !channelRef.current || !conversationId || !userId) return;

      if (isTyping) {
        // Debounce the typing start
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
        if (!pendingTypingRef.current) {
          pendingTypingRef.current = true;
          debounceTimeoutRef.current = setTimeout(() => {
            channelRef.current?.send({
              type: "broadcast",
              event: "typing",
              payload: { userId, userName, isTyping: true } as TypingPayload,
            });
            debounceTimeoutRef.current = null;
          }, debounceMs);
        }
      } else {
        // Immediate typing stop (no debounce for stop)
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
          debounceTimeoutRef.current = null;
        }
        if (pendingTypingRef.current) {
          pendingTypingRef.current = false;
          channelRef.current.send({
            type: "broadcast",
            event: "typing",
            payload: { userId, userName, isTyping: false } as TypingPayload,
          });
        }
      }
    },
    [enabled, conversationId, userId, userName, debounceMs]
  );

  return { isCounterpartTyping, sendTyping };
}