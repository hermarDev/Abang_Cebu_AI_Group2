import { describe, expect, it, vi } from "vitest";
import { executeDraftSave, releaseDraftUpload, restartReleasedDraftUpload, type DraftIntentRepository, type DraftSaveIntent } from "./draft-save-client";

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
    markReleasedUpload: vi.fn(async (ownerId, intentId, operationId) => {
      const current = pending.get(intentId);
      const file = current?.files.find((item) => item.operationId === operationId);
      if (!current || current.ownerId !== ownerId || !file) throw new Error("This upload changed in another tab. Reload before retrying.");
      const version = (current.storageVersion ?? 0) + 1;
      const updated = { ...current, storageVersion: version, files: current.files.map((item) => item === file ? { ...item, released: true } : item) };
      pending.set(intentId, updated);
      return updated;
    }),
    restartReleasedUpload: vi.fn(async (ownerId, intentId, oldId, newId, expectedVersion) => {
      const current = pending.get(intentId);
      const file = current?.files.find((item) => item.operationId === oldId);
      if (!current || current.ownerId !== ownerId || (current.storageVersion ?? 0) !== expectedVersion || !file?.released) throw new Error("This upload changed in another tab. Reload before retrying.");
      const version = (current.storageVersion ?? 0) + 1;
      pending.set(intentId, { ...current, storageVersion: version, files: current.files.map((item) => item === file ? { ...item, operationId: newId, released: false } : item) });
      return version;
    }),
    ...overrides,
  };
}

describe("durable draft save execution", () => {
  it("retries an uncertain release with the original operation and keeps the intent", async () => {
    const file = new File(["file"], "photo.jpg", { type: "image/jpeg" });
    const saved = intent({ draftId: "draft-a", revision: 1, phase: "created", files: [{ kind: "photo", operationId: "file-op", file }] });
    const store = repository();
    await store.putPending(saved);
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("lost response")).mockResolvedValueOnce(new Response(JSON.stringify({ state: "released" }), { status: 200 }));
    await expect(releaseDraftUpload(saved, "file-op", store, fetcher)).rejects.toThrow("lost response");
    expect(store.pending.has(saved.id)).toBe(true);
    await expect(releaseDraftUpload(saved, "file-op", store, fetcher)).resolves.toBe("released");
    expect(fetcher.mock.calls[0][1].body).toBe(fetcher.mock.calls[1][1].body);
    expect(saved.files[0].operationId).toBe("file-op");
    expect(saved.files[0].released).toBe(true);
    expect(store.pending.has(saved.id)).toBe(true);
  });
  it("persists a completed release response without overwriting a newer tab", async () => {
    const file = new File(["file"], "photo.jpg", { type: "image/jpeg" });
    const saved = intent({ draftId: "draft-a", revision: 1, phase: "created", files: [{ kind: "photo", operationId: "file-op", file }] });
    const store = repository();
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ state: "released" }), { status: 200 }));
    await expect(releaseDraftUpload(saved, "file-op", store, fetcher)).resolves.toBe("released");
    expect(store.markReleasedUpload).toHaveBeenCalledWith("owner-a", "intent-1", "file-op");
    expect(saved.files[0].released).toBe(true);
  });
  it("does not treat an absent reservation as safe to replace", async () => {
    const file = new File(["file"], "photo.jpg", { type: "image/jpeg" });
    const saved = intent({ draftId: "draft-a", revision: 1, phase: "created", files: [{ kind: "photo", operationId: "file-op", file }] });
    const store = repository();
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ state: "missing" }), { status: 200 }));
    await expect(releaseDraftUpload(saved, "file-op", store, fetcher)).rejects.toThrow(/not confirmed/i);
    expect(saved.files[0].released).not.toBe(true);
    expect(store.pending.has(saved.id)).toBe(true);
  });
  it("keeps released file information durable instead of reporting a complete save", async () => {
    const file = new File(["file"], "photo.jpg", { type: "image/jpeg" });
    const saved = intent({ draftId: "draft-a", revision: 1, phase: "created", files: [{ kind: "photo", operationId: "file-op", file, released: true }] });
    const store = repository();
    const fetcher = vi.fn();
    await expect(executeDraftSave(saved, store, fetcher)).rejects.toThrow(/released/i);
    expect(store.pending.get(saved.id)?.files[0].file.name).toBe("photo.jpg");
    expect(store.deletePending).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("retries a released file under a new stable operation without losing its bytes", async () => {
    const file = new File(["file"], "photo.jpg", { type: "image/jpeg" });
    const saved = intent({ draftId: "draft-a", revision: 1, phase: "created", files: [{ kind: "photo", operationId: "old-op", file, released: true }] });
    const store = repository();
    await store.putPending(saved);
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("response lost")).mockResolvedValueOnce(new Response("{}", { status: 200 }));
    await restartReleasedDraftUpload(saved, "old-op", store);
    await expect(executeDraftSave(saved, store, fetcher)).rejects.toThrow("response lost");
    const first = (fetcher.mock.calls[0][1].body as FormData).get("operationId");
    expect(first).not.toBe("old-op");
    expect(saved.files[0].operationId).toBe(first);
    expect(store.pending.get(saved.id)?.files[0].operationId).toBe(first);
    await executeDraftSave(saved, store, fetcher);
    expect((fetcher.mock.calls[1][1].body as FormData).get("operationId")).toBe(first);
    expect(await ((fetcher.mock.calls[1][1].body as FormData).get("file") as File).text()).toBe("file");
  });
  it("rejects a restart that returns a newer unrelated intent version", async () => {
    const saved = intent({ draftId: "draft-a", revision: 1, phase: "created", storageVersion: 3, files: [{ kind: "photo", operationId: "old-op", file: new File(["file"], "photo.jpg"), released: true }] });
    const store = repository({ restartReleasedUpload: vi.fn(async () => 5) });
    await expect(restartReleasedDraftUpload(saved, "old-op", store)).rejects.toThrow(/changed in another tab/i);
    expect(saved.storageVersion).toBe(3);
    expect(saved.files[0].operationId).toBe("old-op");
  });
  it("rejects malformed pending media intents before sending requests", async () => {
    for (const invalid of [null, { files: "bad" }, { files: [null] }, { files: [{ kind: "photo", operationId: "file-op", file: "not a file" }] }]) {
      const store = repository();
      const fetcher = vi.fn();
      await expect(executeDraftSave(invalid as unknown as DraftSaveIntent, store, fetcher)).rejects.toThrow(/incomplete|invalid/i);
      expect(fetcher).not.toHaveBeenCalled();
      expect(store.deletePending).not.toHaveBeenCalled();
    }
  });
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
