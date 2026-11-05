import React from "react";
import { createRoot } from "react-dom/client";
import { AppToaster, notify } from "../../src/components/ui/AppToaster";
import { SavedRentalsContent } from "../../src/app/favorites/SavedRentalsContent";

createRoot(document.getElementById("root")!).render(<><AppToaster /><div style={{ position: "fixed", bottom: 0, zIndex: 10 }}>{(["success", "info", "warning", "error", "loading"] as const).map(type => <button key={type} onClick={() => notify(type, "fixture-variant", `${type} notice`)}>Show {type}</button>)}</div><SavedRentalsContent userId="test-user" /></>);
