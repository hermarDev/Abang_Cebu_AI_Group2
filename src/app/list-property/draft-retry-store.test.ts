import { describe, expect, it, vi } from "vitest";
import { executeDraftSave, type DraftIntentRepository, type DraftSaveIntent } from "./draft-save-client";

function intent(overrides: Partial<DraftSaveIntent> = {}): DraftSaveIntent {
  return {
    id: "intent-1",
    ownerId: "owner-a",
    operationId: "11111111-1111-4111-8111-111111111111",
    payload: { property: { title: "One" }, unit: {} },
    values: { title: "One" },
    files: [],
    createdAt: 1,
    ...overrides,
  };
}

function repository(overrides: Partial<DraftIntentRepository> = {}): DraftIntentRepository & { pending: Map<string, DraftSaveIntent> } {
  const pending = new Map<string, DraftSaveIntent>();
  return {
    pending,
    putPending: vi.fn(async (value) => { pending.set(value.id, value); }),
    listPending: vi.fn(async (ownerId) => [...pending.values()].filter((value) => value.ownerId === ownerId)),
    deletePending: vi.fn(async (_ownerId, id) => { pending.delete(id); }),
    claimCreate: vi.fn(async () => true),
    completeDraft: vi.fn(async () => undefined),
    getCanonicalDraft: vi.fn(async () => null),
    ...overrides,
  };
}

describe("durable draft save execution", () => {
  it("persists the immutable intent before the first network request", async () => {
    const store = repository();
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ id: "22222222-2222-4222-8222-222222222222" }), { status: 200 }));
    await executeDraftSave(intent(), store, fetcher);
    expect(store.putPending).toHaveBeenCalledBefore(fetcher);
    expect(fetcher).toHaveBeenCalledWith("/api/property-drafts", expect.objectContaining({ method: "POST" }));
  });

  it("keeps the same operation and payload after a lost response so a retry cannot duplicate the draft", async () => {
    const store = repository();
    const fetcher = vi.fn()
      .mockRejectedValueOnce(new Error("response lost after commit"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "22222222-2222-4222-8222-222222222222" }), { status: 200 }));
    const saved = intent();
    await expect(executeDraftSave(saved, store, fetcher)).rejects.toThrow("response lost");
    expect(store.pending.has(saved.id)).toBe(true);
    await executeDraftSave(saved, store, fetcher);
    expect(fetcher.mock.calls[0]?.[1]?.body).toBe(fetcher.mock.calls[1]?.[1]?.body);
    expect(JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body)).operationId).toBe(saved.operationId);
    expect(store.pending.size).toBe(0);
  });

  it("repairs canonical state after an interrupted acknowledgement before uploading", async () => {
    const saved = intent({ draftId: "draft-a", revision: 2, phase: "updated" });
    const store = repository();
    await executeDraftSave(saved, store, vi.fn());
    expect(store.completeDraft).toHaveBeenCalledWith("owner-a", "draft-a", 2);
  });

  it("retains an update intent when the server returns an invalid revision", async () => {
    const saved = intent({ draftId: "draft-a", revision: 3 });
    const store = repository();
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ revision: 0 }), { status: 200 }));
    await expect(executeDraftSave(saved, store, fetcher)).rejects.toThrow("Draft save could not be confirmed.");
    expect(store.pending.has(saved.id)).toBe(true);
    expect(store.completeDraft).not.toHaveBeenCalled();
  });

  it("does not send anything when durable storage fails", async () => {
    const store = repository({ putPending: vi.fn(async () => { throw new Error("quota exceeded"); }) });
    const fetcher = vi.fn();
    await expect(executeDraftSave(intent(), store, fetcher)).rejects.toThrow("quota exceeded");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("keeps pending uploads for retry with their original operation ids and bytes", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "photo.jpg", { type: "image/jpeg" });
    const saved = intent({ files: [{ kind: "photo", operationId: "33333333-3333-4333-8333-333333333333", file }] });
    const store = repository();
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "22222222-2222-4222-8222-222222222222" }), { status: 200 }))
      .mockRejectedValueOnce(new Error("upload response lost"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await expect(executeDraftSave(saved, store, fetcher)).rejects.toThrow("upload response lost");
    expect(store.pending.has(saved.id)).toBe(true);
    await executeDraftSave(saved, store, fetcher);
    const uploads = fetcher.mock.calls.filter((call) => call[0] === "/api/property-drafts/media");
    expect(uploads).toHaveLength(2);
    const firstBody = uploads[0]?.[1]?.body as FormData;
    const body = uploads[1]?.[1]?.body as FormData;
    expect(firstBody.get("operationId")).toBe(saved.files[0]?.operationId);
    expect(body.get("operationId")).toBe(saved.files[0]?.operationId);
    expect(await (body.get("file") as File).arrayBuffer()).toEqual(await file.arrayBuffer());
    expect(store.pending.size).toBe(0);
  });

  it("isolates pending intents by owner", async () => {
    const store = repository();
    await store.putPending(intent({ id: "a", ownerId: "owner-a" }));
    await store.putPending(intent({ id: "b", ownerId: "owner-b" }));
    expect((await store.listPending("owner-a")).map((value) => value.id)).toEqual(["a"]);
  });

  it("rejects a concurrent create when another tab has already claimed the operation", async () => {
    const store = repository({ claimCreate: vi.fn(async () => false) });
    const fetcher = vi.fn();
    await expect(executeDraftSave(intent(), store, fetcher)).rejects.toThrow(/another tab/i);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
