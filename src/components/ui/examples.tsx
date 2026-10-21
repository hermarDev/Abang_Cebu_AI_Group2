"use client";

import { useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Select, Skeleton, Toast, ToastViewport } from "@/components/ui";

export function ComponentShowcase() {
  const [toastOpen, setToastOpen] = useState(false);

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-5xl content-start gap-8 px-4 py-10 text-foreground sm:px-6 lg:px-8">
      <header className="grid gap-3">
        <p className="text-sm font-semibold text-accent-foreground">AbangCebuAI design system</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Reusable UI components</h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          Token-based controls for rental discovery, with keyboard focus and mobile touch targets built in.
        </p>
      </header>

      <section aria-labelledby="actions-heading" className="grid gap-4">
        <div>
          <h2 id="actions-heading" className="text-2xl font-semibold">Buttons</h2>
          <p className="mt-1 text-sm text-muted-foreground">Consistent minimum 44px targets and visible keyboard focus.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button>Search rentals</Button>
          <Button variant="secondary">View map</Button>
          <Button variant="outline">More filters</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="destructive">Remove saved search</Button>
          <Button loading>Saving</Button>
        </div>
      </section>

      <section aria-labelledby="fields-heading" className="grid gap-4">
        <div>
          <h2 id="fields-heading" className="text-2xl font-semibold">Search fields</h2>
          <p className="mt-1 text-sm text-muted-foreground">Native, labelled controls with helper and validation states.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Input label="Location" placeholder="e.g. Lahug, Cebu City" helperText="Search by neighborhood, landmark, or district." />
          <Select label="Bedrooms" defaultValue="any">
            <option value="any">Any number</option>
            <option value="studio">Studio</option>
            <option value="one">1 bedroom</option>
            <option value="two">2 bedrooms</option>
          </Select>
          <Input label="Monthly budget" type="number" min="0" placeholder="₱ Minimum" error="Enter a valid monthly budget." />
        </div>
      </section>

      <section aria-labelledby="cards-heading" className="grid gap-4">
        <div>
          <h2 id="cards-heading" className="text-2xl font-semibold">Content cards</h2>
          <p className="mt-1 text-sm text-muted-foreground">Reusable structure; no sample property or invented listing data.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Search result panel</CardTitle>
            <CardDescription>Ready to show listings returned by the application.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Button onClick={() => setToastOpen(true)}>Show confirmation</Button>
          </CardContent>
        </Card>
      </section>

      <ToastViewport>
        <Toast
          open={toastOpen}
          title="Search settings saved"
          description="Your updated preferences are ready."
          variant="success"
          onDismiss={() => setToastOpen(false)}
        />
      </ToastViewport>
    </main>
  );
}
