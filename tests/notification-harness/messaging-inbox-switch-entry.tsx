import React from "react";
import { createRoot } from "react-dom/client";
import { MessagingInbox } from "../../src/features/messages/MessagingInbox";

const threads = JSON.parse(document.getElementById("seed")!.textContent!);
const root = createRoot(document.getElementById("root")!);
// Same root, new userId: exercises the prop-change path (u1 seeds threads; any other user loads its own list).
const render = (userId: string) => root.render(<MessagingInbox userId={userId} userRole="renter" initialThreads={userId === "u1" ? threads : undefined} />);
(window as unknown as { __render: typeof render }).__render = render;
render("u1");
