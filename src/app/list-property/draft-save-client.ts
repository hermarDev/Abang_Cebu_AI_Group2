export type DraftSaveFile = {
  kind: "photo" | "permit";
  operationId: string;
  file: File;
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
  deletePending(ownerId: string, intentId: string): Promise<void>;
  claimCreate(ownerId: string, operationId: string): Promise<boolean>;
  completeDraft(ownerId: string, draftId: string, revision: number): Promise<void>;
  getCanonicalDraft(ownerId: string): Promise<CanonicalDraft | null>;
};

export type DraftSaveResult = {
  draftId: string;
  revision: number;
};

export async function executeDraftSave(
  intent: DraftSaveIntent,
  repository: DraftIntentRepository,
  fetcher: typeof fetch = fetch,
): Promise<DraftSaveResult> {
  if (!intent.ownerId || !intent.operationId || !intent.id) throw new Error("Draft intent is incomplete.");
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

  await repository.deletePending(intent.ownerId, intent.id);
  return { draftId, revision };
}
