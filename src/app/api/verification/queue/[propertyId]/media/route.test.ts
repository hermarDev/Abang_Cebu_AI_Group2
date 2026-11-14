import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profile: vi.fn(),
  upload: vi.fn(),
  createSignedUrl: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: {
      from: () => ({
        upload: mocks.upload,
        createSignedUrl: mocks.createSignedUrl,
      }),
    },
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
  }),
}));

import { POST } from "./route";

const propId = "11111111-1111-4111-8111-111111111111";
const opId = "22222222-2222-4222-8222-222222222222";
const H = { "x-expected-user-id": "officer-1" };

function setup() {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "officer-1" } }, error: null });
  mocks.profile.mockResolvedValue({ data: { role: "verification_officer", is_suspended: false }, error: null });
  mocks.upload.mockResolvedValue({ data: { path: "some-path" }, error: null });
  mocks.createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://storage.local/signed" }, error: null });
}

// 8 bytes PNG header + minimal body
const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);

const postForm = (formData: FormData, id = propId, headers: Record<string, string> = H) =>
  POST(
    new Request(`http://localhost/api/verification/queue/${id}/media`, {
      method: "POST",
      headers,
      body: formData,
    }),
    { params: Promise.resolve({ propertyId: id }) }
  );

describe("POST /api/verification/queue/[propertyId]/media", () => {
  beforeEach(() => {
    setup();
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const fd = new FormData();
    const res = await postForm(fd, propId, { "x-expected-user-id": "officer-1" });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid propertyId", async () => {
    const fd = new FormData();
    const res = await postForm(fd, "bad-id");
    expect(res.status).toBe(400);
  });

  it("returns 400 when missing required form fields", async () => {
    const fd = new FormData();
    fd.append("kind", "photo");
    const res = await postForm(fd);
    expect(res.status).toBe(400);
  });

  it("returns 400 for unsupported mime type or spoofed extension", async () => {
    const fd = new FormData();
    fd.append("operationId", opId);
    fd.append("kind", "photo");
    // Text file claiming to be PNG
    fd.append("file", new File(["not a png"], "image.png", { type: "image/png" }));
    const res = await postForm(fd);
    expect(res.status).toBe(400);
  });

  it("uploads valid photo and returns storage object path and signed url", async () => {
    const fd = new FormData();
    fd.append("operationId", opId);
    fd.append("kind", "photo");
    fd.append("file", new File([pngHeader], "proof.png", { type: "image/png" }));

    const res = await postForm(fd);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.objectPath).toMatch(new RegExp(`^officer-1/${propId}/${opId}/[0-9a-f]{64}\\.png$`));
    expect(json.kind).toBe("photo");
    expect(json.signedUrl).toBe("https://storage.local/signed");
    expect(mocks.upload).toHaveBeenCalled();
  });
});
