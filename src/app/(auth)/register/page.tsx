import type { Metadata } from "next";
import { RestoredFinderShell } from "@/features/map/RestoredFinderShell";

export const metadata: Metadata = {
  title: "Register — AbangCebu",
  description: "Create an account on AbangCebu to discover or list rentals",
};

export default function RegisterPage() {
  return <RestoredFinderShell initialAccountOpen initialAccountMode="sign-up" />;
}
