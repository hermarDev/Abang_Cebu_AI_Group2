import dynamic from "next/dynamic";

/** Heavy assistant UI is only loaded when the user opens it. */
export const FinderAssistantLazy = dynamic(
  () => import("./FinderAssistant").then((module) => module.FinderAssistant),
  { ssr: false },
);
