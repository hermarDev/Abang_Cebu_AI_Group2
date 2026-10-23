# UI primitives

Token-based, native HTML primitives for forms, actions, status, cards, dialogs, and loading placeholders. Import from `@/components/ui` or individual component files. Pass visible labels or `aria-label` on controls; `Input` and `Select` intentionally do not generate labels.

## Examples

```tsx
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Select } from "@/components/ui";

<Card>
  <CardHeader>
    <CardTitle>Listing filters</CardTitle>
    <CardDescription>Choose an area and search.</CardDescription>
  </CardHeader>
  <CardContent className="grid gap-3">
    <label className="grid gap-1">Search<Input aria-label="Search listings" /></label>
    <label className="grid gap-1">Area<Select aria-label="Area"><option>Cebu City</option></Select></label>
    <Badge variant="secondary">Available</Badge>
  </CardContent>
  <Button>Apply filters</Button>
</Card>
```

A complete interactive example (including `Modal`, `Toast`, and `Skeleton`) is in `examples.tsx`. Modals require a title and close callback; native `<dialog>` provides Escape handling, modal focus behavior, and focus restoration. Toasts announce status/errors and dismiss after five seconds by default (`duration={0}` disables the timer). Interactive controls retain at least 44px minimum height/width; use a visible label for every form control.
