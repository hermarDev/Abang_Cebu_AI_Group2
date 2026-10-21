import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Badge } from "./badge";

afterEach(cleanup);

describe("secondary badge variant", () => {
  it("uses the accessible muted surface with foreground text", () => {
    render(<Badge variant="secondary">Active filter</Badge>);

    expect(screen.getByText("Active filter").className).toContain("bg-muted");
    expect(screen.getByText("Active filter").className).toContain("text-foreground");
  });
});
