import { useState } from "react";
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
} from "@/components/ui";

export function UIExamples() {
  const [modalOpen, setModalOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  return (
    <section aria-label="UI component examples" className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Listing summary</CardTitle>
          <CardDescription>Example card with token-based status and actions.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Badge variant="secondary">Available</Badge>
          <label className="grid gap-1 text-sm">
            Search listings
            <Input aria-label="Search listings" placeholder="Neighborhood or landmark" />
          </label>
          <label className="grid gap-1 text-sm">
            Location
            <Select aria-label="Location" defaultValue="cebu-city">
              <option value="cebu-city">Cebu City</option>
              <option value="mandaue">Mandaue</option>
            </Select>
          </label>
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
        <CardFooter>
          <Button onClick={() => setModalOpen(true)}>View details</Button>
          <Button variant="outline" onClick={() => setToastOpen(true)}>Save</Button>
        </CardFooter>
      </Card>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Listing details" description="A labelled dialog example.">
        <p>Modal content goes here.</p>
        <Button className="mt-4" onClick={() => setModalOpen(false)}>Close</Button>
      </Modal>
      <Toast open={toastOpen} onClose={() => setToastOpen(false)} variant="success">
        Listing saved.
      </Toast>
    </section>
  );
}
