import dynamic from "next/dynamic";

/** Heavy listing details sheet is only loaded when a listing is opened. */
export const PropertyDetailsSheetLazy = dynamic(
  () => import("./PropertyDetailsSheet").then((module) => module.PropertyDetailsSheet),
  { ssr: false },
);
