import { describe, expect, it } from "vitest";
import { toast } from "sonner";
import { notify } from "./AppToaster";

describe("action notification policy", () => {
  it.each([
    ["success", 3000], ["info", 3000], ["warning", 3000], ["error", 3000], ["loading", Infinity],
  ] as const)("applies the %s duration and stable operation ID", (type, duration) => {
    const id = `test-${type}`;
    notify(type, id, "First message");
    notify(type, id, "Updated message");
    const entries = toast.getToasts().filter((item) => item.id === id);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ id, type, duration, title: "Updated message" });
  });
});
