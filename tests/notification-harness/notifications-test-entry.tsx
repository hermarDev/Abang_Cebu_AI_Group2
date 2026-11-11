import React from "react";
import { createRoot } from "react-dom/client";
import { NotificationBell } from "@/features/notifications/NotificationBell";

function App() {
  return (
    <div className="p-8 flex justify-end">
      <NotificationBell userId="u-1" />
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
