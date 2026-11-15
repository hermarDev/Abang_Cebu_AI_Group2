import type { VerificationQueueItem } from "./VerificationQueue";

export async function loadPendingVerificationMap(
  userId: string,
  signal: AbortSignal
): Promise<VerificationQueueItem[]> {
  const allItems: VerificationQueueItem[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    if (signal.aborted) {
      throw new Error("Aborted");
    }

    const params = new URLSearchParams({
      status: "pending_verification",
      limit: String(limit),
      offset: String(offset),
    });

    const res = await fetch(`/api/verification/queue?${params}`, {
      headers: { "x-expected-user-id": userId },
      signal,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Failed to load verification queue.");
    }

    const data = await res.json();
    if (!data || !Array.isArray(data.queue) || data.queue.some((item: unknown) => !item || typeof item !== "object" || typeof (item as { id?: unknown }).id !== "string")) {
      throw new Error("Invalid verification queue response.");
    }
    const queue = data.queue as VerificationQueueItem[];

    if (queue.length === 0) {
      break;
    }

    const existingIds = new Set(allItems.map((item) => item.id));
    for (const item of queue) {
      if (!existingIds.has(item.id)) {
        allItems.push(item);
        existingIds.add(item.id);
      }
    }

    if (queue.length < limit) {
      break;
    }

    offset += limit;
  }

  return allItems;
}

export function mapCoordinates(item: Pick<VerificationQueueItem, "latitude" | "longitude">): [number, number] | null {
  const { latitude, longitude } = item;

  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return null;
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }

  return [longitude, latitude];
}