import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { POST } from "./route";

const threadUuid = "12345678-1234-4234-8234-123456789abc";
const validUser = "u1";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profile: vi.fn(),
  conv: vi.fn(),
  upload: vi.fn(),
  createSignedUrl: vi.fn(),
  adminStorage: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: mocks.profile,
            }),
          }),
        };
      }
      if (table === "rental_conversations") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: mocks.conv,
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: vi.fn() }) }) };
    },
  }),
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

const validJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]);

function headers(userId: string = validUser): Headers {
  return new Headers({
    "x-expected-user-id": userId,
  });
}

function postRequest(
  file: File | null,
  h: Headers = headers()
): Request {
  const form = new FormData();
  if (file) {
    form.append("file", file);
  }
  return new Request(`http://localhost/api/messages/threads/${threadUuid}/attachments`, {
    method: "POST",
    headers: h,
    body: form,
  });
}

describe("POST /api/messages/threads/[threadId]/attachments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: validUser } }, error: null });
    mocks.profile.mockResolvedValue({
      data: { role: "renter", is_suspended: false, is_verified: true, full_name: "Test User" },
      error: null,
    });
    mocks.conv.mockResolvedValue({
      data: {
        id: threadUuid,
        status: "active",
        renter_id: validUser,
        landlord_id: "landlord-2",
      },
      error: null,
    });
    mocks.upload.mockResolvedValue({ error: null });
    mocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://storage.example.com/signed-att-1" },
      error: null,
    });
  });

  it("returns 401 when user is signed out", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const res = await POST(postRequest(null), { params: Promise.resolve({ threadId: threadUuid }) });
    expect(res.status).toBe(401);
  });

  it("returns 409 on expected user mismatch", async () => {
    const res = await POST(postRequest(null, headers("other-user")), {
      params: Promise.resolve({ threadId: threadUuid }),
    });
    expect(res.status).toBe(409);
  });

  it("returns 400 on invalid threadId UUID", async () => {
    const res = await POST(postRequest(null), { params: Promise.resolve({ threadId: "not-a-uuid" }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("valid conversation");
  });

  it("returns 403 when user is not a participant in the conversation", async () => {
    mocks.conv.mockResolvedValueOnce({
      data: {
        id: threadUuid,
        status: "active",
        renter_id: "other-renter",
        landlord_id: "other-landlord",
      },
      error: null,
    });
    const res = await POST(
      postRequest(new File([validJpeg], "test.jpg", { type: "image/jpeg" })),
      { params: Promise.resolve({ threadId: threadUuid }) }
    );
    expect(res.status).toBe(403);
  });

  it("returns 403 when conversation is not active", async () => {
    mocks.conv.mockResolvedValueOnce({
      data: {
        id: threadUuid,
        status: "closed",
        renter_id: validUser,
        landlord_id: "landlord-2",
      },
      error: null,
    });
    const res = await POST(
      postRequest(new File([validJpeg], "test.jpg", { type: "image/jpeg" })),
      { params: Promise.resolve({ threadId: threadUuid }) }
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("closed");
  });

  it("returns 400 when no file is uploaded", async () => {
    const res = await POST(postRequest(null), {
      params: Promise.resolve({ threadId: threadUuid }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("valid image file");
  });

  it("returns 400 when unsupported file format is uploaded", async () => {
    const textFile = new File(["not an image"], "doc.txt", { type: "text/plain" });
    const res = await POST(postRequest(textFile), {
      params: Promise.resolve({ threadId: threadUuid }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Only JPEG, PNG, and WebP");
  });

  it("returns 201 with signed URL and storage path on valid image upload", async () => {
    const file = new File([validJpeg], "kitchen.jpg", { type: "image/jpeg" });
    const res = await POST(postRequest(file), {
      params: Promise.resolve({ threadId: threadUuid }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.storagePath).toContain(`${threadUuid}/${validUser}/`);
    expect(body.url).toBe("https://storage.example.com/signed-att-1");
    expect(body.fileName).toBe("kitchen.jpg");
    expect(body.mimeType).toBe("image/jpeg");
    expect(mocks.upload).toHaveBeenCalledTimes(1);
  });
});
