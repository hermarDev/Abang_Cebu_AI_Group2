import { FinderOverlayHost } from "./FinderOverlayHost";

export default function FinderLayout({
  children,
  overlay,
}: {
  children: React.ReactNode;
  overlay: React.ReactNode;
}) {
  return <FinderOverlayHost overlay={overlay}>{children}</FinderOverlayHost>;
}
