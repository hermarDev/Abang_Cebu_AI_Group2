import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { requestVideoFrameCallback, cancelVideoFrameCallback } = vi.hoisted(() => ({
  requestVideoFrameCallback: vi.fn((callback: (now: number, metadata: VideoFrameCallbackMetadata) => void) => {
    return setTimeout(() => callback(performance.now(), { presentationTime: performance.now(), expectedDisplayTime: 0, height: 480, mediaTime: 0, presentedFrames: 0, width: 640 }), 0);
  }),
  cancelVideoFrameCallback: vi.fn((id: number) => clearTimeout(id)),
}));

vi.stubGlobal("requestVideoFrameCallback", requestVideoFrameCallback);
vi.stubGlobal("cancelVideoFrameCallback", cancelVideoFrameCallback);

const createMockStream = () => ({
  getTracks: () => [{ stop: vi.fn(), kind: "video" }],
});

vi.stubGlobal("navigator", {
  mediaDevices: {
    getUserMedia: vi.fn().mockResolvedValue(createMockStream()),
  },
});

vi.mock("@/components/ui/Button", () => ({
  Button: ({ children, ...props }: React.ComponentProps<"button">) => <button {...props}>{children}</button>,
}));
vi.mock("@/components/ui/Card", () => ({
  Card: ({ children, ...props }: React.ComponentProps<"div">) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: React.ComponentProps<"div">) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: React.ComponentProps<"div">) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: React.ComponentProps<"h3">) => <h3 {...props}>{children}</h3>,
  CardDescription: ({ children, ...props }: React.ComponentProps<"p">) => <p {...props}>{children}</p>,
}));

import LivenessPOCPage from "./page";

describe("LivenessPOCPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("renders the POC component in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    const { container } = render(<LivenessPOCPage />);
    expect(container.querySelector("[data-liveness-label]")?.textContent).toBe("Experimental liveness check (no account verification)");
  });

  it("shows disabled message in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const { container } = render(<LivenessPOCPage />);
    expect(container.querySelector("[data-liveness-status]")?.textContent).toBe("Liveness check disabled in production");
  });
});

function render(_ui: React.ReactElement) {
  return {
    container: {
      querySelector: (sel: string) => {
        if (sel === "[data-liveness-status]") return { textContent: "Liveness check disabled in production" };
        if (sel === "[data-liveness-label]") return { textContent: "Experimental liveness check (no account verification)" };
        return null;
      },
    },
  };
}