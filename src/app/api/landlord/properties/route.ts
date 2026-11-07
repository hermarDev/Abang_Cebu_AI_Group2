const headers = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  void request;
  // The listing workflow is still preview-only: the submission path is not revision-safe or verified end to end.
  return Response.json({ error: "Listing submission is unavailable in preview." }, { status: 503, headers });
}
