import type { CanonicalDraft, DraftIntentRepository, DraftSaveIntent } from "./draft-save-client";

const databaseName = "abangcebu-property-drafts";
const databaseVersion = 1;

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
    this.databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, databaseVersion);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains("pending")) {
          const store = database.createObjectStore("pending", { keyPath: "id" });
          store.createIndex("ownerId", "ownerId", { unique: false });
        }
        if (!database.objectStoreNames.contains("canonical")) database.createObjectStore("canonical", { keyPath: "ownerId" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Draft browser storage is unavailable."));
      request.onblocked = () => reject(new Error("Draft browser storage is busy in another tab."));
    });
    return this.databasePromise;
  }

  async putPending(intent: DraftSaveIntent): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction("pending", "readwrite");
    transaction.objectStore("pending").put(intent);
    await transactionDone(transaction);
  }

  async listPending(ownerId: string): Promise<DraftSaveIntent[]> {
    const database = await this.open();
    const transaction = database.transaction("pending", "readonly");
    const records = await requestResult(transaction.objectStore("pending").index("ownerId").getAll(ownerId));
    await transactionDone(transaction);
    return records as DraftSaveIntent[];
  }

  async deletePending(ownerId: string, intentId: string): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction("pending", "readwrite");
    const store = transaction.objectStore("pending");
    const record = await requestResult(store.get(intentId)) as DraftSaveIntent | undefined;
    if (!record || record.ownerId === ownerId) store.delete(intentId);
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
