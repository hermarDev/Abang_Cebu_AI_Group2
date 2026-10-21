# Shared UI components

This library implements the SCRUM-153 Button, Input, Select, Card, Badge, Modal, Toast, and Skeleton primitives using the semantic Tailwind v4 tokens in `src/app/globals.css`. Existing color values, keyboard-focus utility, safe-area tokens, responsive breakpoints, and mobile input sizing remain the source of truth.

## Import

```tsx
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Modal,
  Select,
  Skeleton,
  Toast,
  ToastViewport,
} from "@/components/ui";
```

The component directory also permits focused imports such as `@/components/ui/button`.

## Examples

```tsx
<Button variant="primary" size="lg" onClick={submitSearch}>
  Search rentals
</Button>

<Input
  label="Location"
  placeholder="Search Cebu neighborhoods"
  helperText="Search by neighborhood, landmark, or district."
/>

<Input label="Monthly budget" type="number" min="0" error="Enter a valid budget." />

<Select label="Bedrooms" defaultValue="any">
  <option value="any">Any number</option>
  <option value="studio">Studio</option>
  <option value="one">1 bedroom</option>
</Select>

<Card>
  <CardHeader>
    <CardTitle>Rental results</CardTitle>
    <CardDescription>Available homes matching your current search.</CardDescription>
  </CardHeader>
  <CardContent>{/* Render real search results from the application. */}</CardContent>
  <CardFooter><Badge variant="success">Verified</Badge></CardFooter>
</Card>

<Skeleton className="h-5 w-2/3" />
```

`Button` defaults to `type="button"`; pass `type="submit"` inside forms. The `loading` state disables the action and exposes a live announcement. Buttons, inputs, selects, modal-close and toast-dismiss actions use the existing 44px `touch-target` utility and `focus-ring` utility where applicable.

### Modal

Use controlled state. Native `<dialog>` supplies modal focus containment and Escape handling; `Modal` exposes `open`, `onOpenChange`, `title`, and optional `description` props.

```tsx
const [open, setOpen] = useState(false);

<Modal open={open} onOpenChange={setOpen} title="Search filters">
  <p>Place your filter form here.</p>
</Modal>
```

Supply `initialFocusRef` to select a different initial focus target. Without it, the labelled close button receives initial focus.

### Toasts

Mount one fixed viewport near the root of the application and render controlled toast items inside it. Errors are assertive alerts; non-error notifications use polite status announcements. Keep dismissal state with the caller.

```tsx
<ToastViewport>
  <Toast
    open={saved}
    variant="success"
    title="Search saved"
    onDismiss={() => setSaved(false)}
  />
</ToastViewport>
```

`Toast` can also render inline with its live-region role and announcement. The viewport only positions/group items; it does not add a duplicate live region.

## Token and accessibility notes

- Components consume semantic `bg-*`, `text-*`, `border-*`, `ring-*`, and shared ergonomic utility classes; do not introduce literal palette colors in component styles.
- The default badge uses the `accent`/`accent-foreground` token pair. Several configured `secondary` and `primary` foreground pairs in the current theme do not meet 4.5:1 in every theme, so badges and variants with failing combinations are intentionally not used for normal text.
- Automated contrast tests compute the WCAG relative-luminance ratio for the checked semantic intent pairs in both light and dark themes. Manual rendered color/theme audit and a full screen-reader review remain required before treating the UI as fully accepted.
- `Input` and `Select` use associated labels, descriptions and invalid-state semantics. Keep visible labels for essential form fields.
- `Skeleton` is decorative and hidden from assistive technology; provide a separate status message if a loading operation needs announcing.
- The shared CSS provides a 16px mobile input rule and `focus-ring` utility. Browser-level computed sizes, contrast, keyboard behavior and viewport rendering are not established by static class assertions alone.

## Local checks

```sh
pnpm exec vitest run src/components/ui/ui.test.tsx src/components/ui/ui.acceptance.test.tsx
pnpm exec tsc --noEmit --pretty false
pnpm run lint
pnpm run build
```

The Vitest/jsdom checks verify rendered semantics and interactions; their native dialog shim does not replace testing the real browser implementation.

Validation results and evidence scope are tracked in `docs/testing/SCRUM-153-validation-evidence.md`.
