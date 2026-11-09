import { isValidElement } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/map/useFinderTheme", () => ({ useFinderTheme: () => ({ resolvedTheme: "dark" }) }));
import { Toaster, toast } from "sonner";
import { AppToaster, notify } from "./AppToaster";

describe("AppToaster", () => {
  it("places enlarged toasts top-right below the header", () => {
    const element = AppToaster();
    expect(isValidElement(element) && element.type).toBe(Toaster);
    expect(element.props).toMatchObject({
      theme: "dark",
      position: "top-right",
      offset: { top: "76px", right: "20px" },
      mobileOffset: { top: "68px", left: "12px", right: "12px" },
      visibleToasts: 4,
      closeButton: true,
      toastOptions: { className: "abang-toast" },
    });
  });

  it("forwards id, duration, action and description to sonner", () => {
    const spy = vi.spyOn(toast, "success").mockReturnValue("id");
    const action = { label: "Undo", onClick: vi.fn() };
    notify("success", "t1", "Saved", { action, description: "Details" });
    expect(spy).toHaveBeenCalledWith("Saved", { id: "t1", duration: 4000, action, description: "Details" });
    notify("error", "t2", "Failed");
    expect(spy.mock.calls.length).toBe(1);
    spy.mockRestore();
  });

  it("stays backward compatible without options", () => {
    const spy = vi.spyOn(toast, "error").mockReturnValue("id");
    notify("error", "t2", "Failed");
    expect(spy).toHaveBeenCalledWith("Failed", { id: "t2", duration: 6000 });
    spy.mockRestore();
  });
});
