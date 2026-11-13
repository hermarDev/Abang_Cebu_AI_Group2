import React from "react";
import { createRoot } from "react-dom/client";
import { ListPropertyForm } from "../../src/app/list-property/ListPropertyForm";

createRoot(document.getElementById("root")!).render(<div className="mx-auto grid w-full max-w-4xl gap-4"><ListPropertyForm userId="test-landlord" /></div>);
