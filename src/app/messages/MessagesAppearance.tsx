"use client";

import { AppearanceControls } from "@/features/map/AppearanceControls";
import { useFinderTheme } from "@/features/map/useFinderTheme";

export function MessagesAppearance() {
  const { preference, resolvedTheme, setPreference } = useFinderTheme();
  return <AppearanceControls preference={preference} resolvedTheme={resolvedTheme} onPreferenceChange={setPreference} expanded={false} />;
}
