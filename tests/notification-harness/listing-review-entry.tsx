import React from "react";
import { createRoot } from "react-dom/client";
import { ListPropertyForm } from "../../src/app/list-property/ListPropertyForm";

const params = new URLSearchParams(window.location.search);
const restoreTarget = params.has("draftId") && params.has("revision") ? { draftId: params.get("draftId")!, revision: params.get("revision")! } : null;
createRoot(document.getElementById("root")!).render(<ListPropertyForm userId="test-landlord" restoreTarget={restoreTarget} />);
