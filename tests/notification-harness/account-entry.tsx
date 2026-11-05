import React from "react";
import { createRoot } from "react-dom/client";
import { AppToaster } from "../../src/components/ui/AppToaster";
import { AccountSettingsForm } from "../../src/app/account/AccountSettingsForm";

createRoot(document.getElementById("root")!).render(<><AppToaster /><AccountSettingsForm profile={{ fullName: "Test User", phoneNumber: new URLSearchParams(location.search).get("phone"), email: "test@example.invalid", role: "renter", avatarUrl: null }} /></>);
