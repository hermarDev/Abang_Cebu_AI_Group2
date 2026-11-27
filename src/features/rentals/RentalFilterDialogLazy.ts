import dynamic from "next/dynamic";

/** Advanced filter dialog stays out of the initial map bundle. */
export const RentalFilterDialogLazy = dynamic(
  () => import("./RentalFilterDialog").then((module) => module.RentalFilterDialog),
  { ssr: false },
);
