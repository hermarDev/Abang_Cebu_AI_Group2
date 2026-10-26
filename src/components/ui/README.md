# UI primitives

Token-based form controls, actions, status, cards, dialogs, and loading placeholders. `Select` is a styled Radix single-select with a scrollable popup; import from `@/components/ui` or an individual component file. Pass visible labels or `aria-label` on controls; `Input` and `Select` intentionally do not generate labels.

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
    <label className="grid gap-1">Area<Select aria-label="Area" options={[{ value: "cebu-city", label: "Cebu City" }]} defaultValue="cebu-city" /></label>
    <Badge variant="secondary">Available</Badge>
  </CardContent>
  <Button>Apply filters</Button>
</Card>
```

A complete interactive example (including `Modal`, `Toast`, and `Skeleton`) is in `examples.tsx`. `Select` accepts an `options` array of `{ value, label, disabled? }` and calls `onValueChange` with the selected string; an empty string is supported for a “Any” choice. Triggering Select marks the option with `aria-selected`; the accessible name/description and invalid state are supplied to the trigger. Modals require a title and close callback; native `<dialog>` provides Escape handling, modal focus behavior, and focus restoration. Toasts announce status/errors and dismiss after five seconds by default (`duration={0}` disables the timer). Interactive controls retain at least 44px minimum height/width; use a visible label for every form control.
