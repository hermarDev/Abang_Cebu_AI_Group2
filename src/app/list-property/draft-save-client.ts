export type DraftSaveFile = {
  kind: "photo" | "permit";
  operationId: string;
  file: File;
  released?: boolean;
};

export type DraftSaveIntent = {
  id: string;
  ownerId: string;
  operationId: string;
  payload: Record<string, unknown>;
  values: Record<string, unknown>;
  files: DraftSaveFile[];
  draftId?: string;
  revision?: number;
  phase?: "prepared" | "created" | "updated";
  createdAt: number;
  storageVersion?: number;
};

export type CanonicalDraft = {
  ownerId: string;
  draftId: string | null;
  revision: number | null;
  createOperationId: string | null;
};

export type DraftIntentRepository = {
  putPending(intent: DraftSaveIntent): Promise<void>;
  listPending(ownerId: string): Promise<DraftSaveIntent[]>;
  deletePending(ownerId: string, intentId: string, expectedVersion: number): Promise<void>;
  claimCreate(ownerId: string, operationId: string): Promise<boolean>;
  completeDraft(ownerId: string, draftId: string, revision: number): Promise<void>;
  getCanonicalDraft(ownerId: string): Promise<CanonicalDraft | null>;
  markReleasedUpload(ownerId: string, intentId: string, operationId: string): Promise<DraftSaveIntent>;
  restartReleasedUpload(ownerId: string, intentId: string, oldOperationId: string, newOperationId: string, expectedVersion: number): Promise<number>;
};

export type DraftSaveResult = {
  draftId: string;
  revision: number;
};

export async function releaseDraftUpload(
  intent: DraftSaveIntent,
  operationId: string,
  repository: DraftIntentRepository,
  fetcher: typeof fetch = fetch,
): Promise<"released" | "confirmed" | "missing"> {
  if (!intent.ownerId || !intent.draftId || !intent.files.some((file) => file.operationId === operationId)) throw new Error("Upload recovery information is incomplete.");
  await repository.putPending(intent);
  const response = await fetcher("/api/property-drafts/media", {
    method: "DELETE",
    headers: { "content-type": "application/json", "x-expected-user-id": intent.ownerId },
    body: JSON.stringify({ draftId: intent.draftId, operationId }),
  });
  if (!response.ok) throw new Error("The file status could not be confirmed. Retry the same request.");
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !("state" in body) || (body.state !== "released" && body.state !== "confirmed" && body.state !== "missing")) throw new Error("The file status could not be confirmed. Retry the same request.");
  if (body.state === "missing") throw new Error("The file status was not confirmed. Retry the original upload before replacing it.");
  if (body.state === "released") {
    const updated = await repository.markReleasedUpload(intent.ownerId, intent.id, operationId);
    Object.assign(intent, updated);
  }
  return body.state;
}

export async function restartReleasedDraftUpload(intent: DraftSaveIntent, operationId: string, repository: DraftIntentRepository): Promise<void> {
  const file = intent.files.find((item) => item.operationId === operationId);
  if (!file?.released) throw new Error("This upload has not been released.");
  const newOperationId = crypto.randomUUID();
  const version = await repository.restartReleasedUpload(intent.ownerId, intent.id, operationId, newOperationId, intent.storageVersion ?? 0);
  if (version !== (intent.storageVersion ?? 0) + 1) throw new Error("This upload changed in another tab. Reload before retrying.");
  intent.storageVersion = version;
  intent.files = intent.files.map((item) => item === file ? { ...item, operationId: newOperationId, released: false } : item);
}

export async function executeDraftSave(
  intent: DraftSaveIntent,
  repository: DraftIntentRepository,
  fetcher: typeof fetch = fetch,
): Promise<DraftSaveResult> {
  if (!intent || typeof intent !== "object" || typeof intent.ownerId !== "string" || !intent.ownerId || typeof intent.operationId !== "string" || !intent.operationId || typeof intent.id !== "string" || !intent.id || !Array.isArray(intent.files) || intent.files.some((item) => !item || typeof item !== "object" || (item.kind !== "photo" && item.kind !== "permit") || typeof item.operationId !== "string" || !item.operationId || !(item.file instanceof File))) throw new Error("Draft intent is incomplete or invalid.");
  await repository.putPending(intent);

  let draftId = intent.draftId;
  let revision = intent.revision;
  if (!draftId) {
    const claimed = await repository.claimCreate(intent.ownerId, intent.operationId);
    if (!claimed) throw new Error("Another tab already created this draft. Reload the saved draft before retrying.");
  }

  if (!draftId) {
    const response = await fetcher("/api/property-drafts", {
      method: "POST",
      headers: { "content-type": "application/json", "x-expected-user-id": intent.ownerId },
      body: JSON.stringify({ operationId: intent.operationId, payload: intent.payload }),
    });
    if (!response.ok) throw new Error(response.status === 409 ? "This draft conflicts with an earlier save." : "Draft could not be saved.");
    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || !("id" in body) || typeof body.id !== "string") throw new Error("Draft save could not be confirmed.");
    draftId = body.id;
    revision = 1;
    intent.draftId = draftId;
    intent.revision = revision;
    intent.phase = "created";
    await repository.putPending(intent);
    await repository.completeDraft(intent.ownerId, draftId, revision);
  } else if (intent.phase !== "created" && intent.phase !== "updated") {
    if (!Number.isSafeInteger(revision) || !revision || revision < 1) throw new Error("Draft revision is invalid.");
    const response = await fetcher("/api/property-drafts", {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-expected-user-id": intent.ownerId },
      body: JSON.stringify({ draftId, operationId: intent.operationId, revision, payload: intent.payload }),
    });
    if (!response.ok) throw new Error(response.status === 409 ? "This draft changed elsewhere. Reload the saved draft before retrying." : "Draft could not be saved.");
    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || !("revision" in body) || !Number.isSafeInteger(body.revision) || (body.revision as number) < 1) throw new Error("Draft save could not be confirmed.");
    revision = body.revision as number;
    intent.revision = revision;
    intent.phase = "updated";
    await repository.putPending(intent);
    await repository.completeDraft(intent.ownerId, draftId, revision);
  }

  if (!draftId || !revision) throw new Error("Draft save could not be confirmed.");
  await repository.completeDraft(intent.ownerId, draftId, revision);
  for (const fileIntent of intent.files) {
    if (fileIntent.released) throw new Error("This upload was released. Your file is still stored locally and needs recovery.");
    const body = new FormData();
    body.set("draftId", draftId);
    body.set("operationId", fileIntent.operationId);
    body.set("kind", fileIntent.kind);
    body.set("file", fileIntent.file);
    const response = await fetcher("/api/property-drafts/media", {
      method: "POST",
      headers: { "x-expected-user-id": intent.ownerId },
      body,
    });
    if (!response.ok) throw new Error(response.status === 409 ? "This file conflicts with an earlier upload." : "One or more files could not be saved.");
  }

  await repository.deletePending(intent.ownerId, intent.id, intent.storageVersion ?? 0);
  return { draftId, revision };
}
