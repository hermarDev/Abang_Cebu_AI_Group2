import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import Loading from "./loading";

it("announces account loading without showing private account data", () => {
  const html = renderToStaticMarkup(<Loading />);
  expect(html).toContain('role="status"');
  expect(html).toContain("Loading account settings");
  expect(html).not.toContain("email@example");
  expect(html).not.toContain('type="password"');
});
