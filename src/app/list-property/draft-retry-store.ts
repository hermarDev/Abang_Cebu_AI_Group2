import type { CanonicalDraft, DraftIntentRepository, DraftSaveIntent } from "./draft-save-client";

const databaseName = "abangcebu-property-drafts";
const databaseVersion = 2;

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Draft browser storage failed."));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Draft browser storage failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Draft browser storage was interrupted."));
  });
}

export class BrowserDraftIntentRepository implements DraftIntentRepository {
  private databasePromise: Promise<IDBDatabase> | null = null;

  private open(): Promise<IDBDatabase> {
    if (this.databasePromise) return this.databasePromise;
    const opening = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, databaseVersion);
      let abandoned = false;
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains("pending")) {
          const store = database.createObjectStore("pending", { keyPath: "id" });
          store.createIndex("ownerId", "ownerId", { unique: false });
        }
        if (!database.objectStoreNames.contains("canonical")) database.createObjectStore("canonical", { keyPath: "ownerId" });
        if (!database.objectStoreNames.contains("completed")) database.createObjectStore("completed", { keyPath: "id" });
      };
      request.onsuccess = () => {
        if (abandoned) { request.result.close(); return; }
        const database = request.result;
        const forget = () => { if (this.databasePromise === opening) this.databasePromise = null; };
        database.onversionchange = () => { database.close(); forget(); };
        database.onclose = forget;
        resolve(database);
      };
      request.onerror = () => reject(request.error ?? new Error("Draft browser storage is unavailable."));
      request.onblocked = () => { abandoned = true; reject(new Error("Draft browser storage is busy in another tab.")); };
    });
    this.databasePromise = opening;
    void opening.catch(() => { if (this.databasePromise === opening) this.databasePromise = null; });
    return opening;
  }

  async putPending(intent: DraftSaveIntent): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(["pending", "completed"], "readwrite");
    const store = transaction.objectStore("pending");
    const completed = await requestResult(transaction.objectStore("completed").get(intent.id));
    if (completed) {
      await transactionDone(transaction);
      throw new Error("This upload was already completed. Reload before retrying.");
    }
    const current = await requestResult(store.get(intent.id)) as DraftSaveIntent | undefined;
    if (current && (current.ownerId !== intent.ownerId || (current.storageVersion ?? 0) !== (intent.storageVersion ?? 0))) {
      await transactionDone(transaction);
      throw new Error("This upload changed in another tab. Reload before retrying.");
    }
    if (!current && (intent.storageVersion ?? 0) !== 0) {
      await transactionDone(transaction);
      throw new Error("This upload no longer exists. Reload before retrying.");
    }
    const version = (intent.storageVersion ?? 0) + 1;
    store.put({ ...intent, storageVersion: version });
    await transactionDone(transaction);
    intent.storageVersion = version;
  }

  async markReleasedUpload(ownerId: string, intentId: string, operationId: string): Promise<DraftSaveIntent> {
    const database = await this.open();
    const transaction = database.transaction("pending", "readwrite");
    const store = transaction.objectStore("pending");
    const current = await requestResult(store.get(intentId)) as DraftSaveIntent | undefined;
    const file = current?.files.find((item) => item.operationId === operationId);
    if (!current || current.ownerId !== ownerId || !file) {
      await transactionDone(transaction);
      throw new Error("This upload changed in another tab. Reload before retrying.");
    }
    if (file.released) { await transactionDone(transaction); return current; }
    const version = (current.storageVersion ?? 0) + 1;
    const updated = { ...current, storageVersion: version, files: current.files.map((item) => item === file ? { ...item, released: true } : item) };
    store.put(updated);
    await transactionDone(transaction);
    return updated;
  }

  async restartReleasedUpload(ownerId: string, intentId: string, oldOperationId: string, newOperationId: string, expectedVersion: number): Promise<number> {
    const database = await this.open();
    const transaction = database.transaction("pending", "readwrite");
    const store = transaction.objectStore("pending");
    const current = await requestResult(store.get(intentId)) as DraftSaveIntent | undefined;
    const file = current?.files.find((item) => item.operationId === oldOperationId);
    if (!current || current.ownerId !== ownerId || (current.storageVersion ?? 0) !== expectedVersion || !file?.released) {
      await transactionDone(transaction);
      throw new Error("This upload changed in another tab. Reload before retrying.");
    }
    const version = (current.storageVersion ?? 0) + 1;
    store.put({ ...current, storageVersion: version, files: current.files.map((item) => item === file ? { ...item, operationId: newOperationId, released: false } : item) });
    await transactionDone(transaction);
    return version;
  }

  async listPending(ownerId: string): Promise<DraftSaveIntent[]> {
    const database = await this.open();
    const transaction = database.transaction("pending", "readonly");
    const records = await requestResult(transaction.objectStore("pending").index("ownerId").getAll(ownerId));
    await transactionDone(transaction);
    return records as DraftSaveIntent[];
  }

  async deletePending(ownerId: string, intentId: string, expectedVersion: number): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(["pending", "completed"], "readwrite");
    const store = transaction.objectStore("pending");
    const record = await requestResult(store.get(intentId)) as DraftSaveIntent | undefined;
    if (!record || record.ownerId !== ownerId || (record.storageVersion ?? 0) !== expectedVersion) {
      await transactionDone(transaction);
      throw new Error("This upload changed in another tab. Reload before retrying.");
    }
    transaction.objectStore("completed").put({ id: intentId, ownerId });
    store.delete(intentId);
    await transactionDone(transaction);
  }

  async claimCreate(ownerId: string, operationId: string): Promise<boolean> {
    const database = await this.open();
    const transaction = database.transaction("canonical", "readwrite");
    const store = transaction.objectStore("canonical");
    const current = await requestResult(store.get(ownerId)) as CanonicalDraft | undefined;
    if (!current) {
      store.put({ ownerId, createOperationId: operationId, draftId: null, revision: null } satisfies CanonicalDraft);
      await transactionDone(transaction);
      return true;
    }
    const claimed = current.createOperationId === operationId;
    await transactionDone(transaction);
    return claimed;
  }

  async completeDraft(ownerId: string, draftId: string, revision: number): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction("canonical", "readwrite");
    const store = transaction.objectStore("canonical");
    const current = await requestResult(store.get(ownerId)) as CanonicalDraft | undefined;
    if (current?.draftId && current.draftId !== draftId) throw new Error("Another draft is active in browser storage.");
    if (current?.revision && current.revision > revision) throw new Error("A newer draft revision is already stored.");
    store.put({ ownerId, createOperationId: current?.createOperationId ?? null, draftId, revision } satisfies CanonicalDraft);
    await transactionDone(transaction);
  }

  async getCanonicalDraft(ownerId: string): Promise<CanonicalDraft | null> {
    const database = await this.open();
    const transaction = database.transaction("canonical", "readonly");
    const current = await requestResult(transaction.objectStore("canonical").get(ownerId)) as CanonicalDraft | undefined;
    await transactionDone(transaction);
    return current ?? null;
  }
}
