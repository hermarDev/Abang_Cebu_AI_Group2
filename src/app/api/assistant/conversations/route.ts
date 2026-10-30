import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

type ConversationMessage = { role: "user" | "assistant"; content: string };
const responseHeaders = { "Cache-Control": "no-store" };
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maxMessages = 120;
const maxUserMessageLength = 2_000;
const maxAssistantMessageLength = 8_000;
const maxConversationBytes = 60_000;

async function getAuthenticatedClient() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return error || !user ? null : { supabase, user };
}

function parseMessages(value: unknown): ConversationMessage[] | null {
  if (!Array.isArray(value) || value.length < 2 || value.length > maxMessages) return null;
  const messages: ConversationMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string" || !content.trim()) return null;
    const maxMessageLength = role === "user" ? maxUserMessageLength : maxAssistantMessageLength;
    if (content.length > maxMessageLength) return null;
    messages.push({ role, content: content.trim() });
  }

  const serializedBytes = new TextEncoder().encode(JSON.stringify(messages)).byteLength;
  return serializedBytes <= maxConversationBytes && messages.some((message) => message.role === "user") ? messages : null;
}

function conversationTitle(messages: ConversationMessage[]) {
  const firstQuestion = messages.find((message) => message.role === "user")?.content.replace(/\s+/g, " ").trim();
  return firstQuestion ? firstQuestion.slice(0, 60) : "New chat";
}

function conversationPreview(messages: ConversationMessage[]) {
  const lastMessage = messages.at(-1);
  if (!lastMessage) return "";
  const sender = lastMessage.role === "assistant" ? "AbangCebu assistant" : "You";
  return `${sender}: ${lastMessage.content.replace(/\s+/g, " ").trim()}`.slice(0, 140);
}

function serializeConversation(row: { id: string; title: string; messages: Json; created_at: string; updated_at: string }) {
  const messages = parseMessages(row.messages);
  return {
    id: row.id,
    title: row.title,
    preview: messages ? conversationPreview(messages) : "",
    messages: messages ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(request: Request) {
  const authenticated = await getAuthenticatedClient();
  if (!authenticated) return Response.json({ error: "Sign in to access saved chats." }, { status: 401, headers: responseHeaders });

  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    if (!idPattern.test(id)) return Response.json({ error: "This chat could not be found." }, { status: 400, headers: responseHeaders });
    const { data, error } = await authenticated.supabase.from("assistant_conversations")
      .select("id,title,messages,created_at,updated_at")
      .eq("id", id)
      .eq("user_id", authenticated.user.id)
      .maybeSingle();
    if (error) return Response.json({ error: "Chat history is unavailable right now." }, { status: 503, headers: responseHeaders });
    if (!data) return Response.json({ error: "This chat could not be found." }, { status: 404, headers: responseHeaders });
    return Response.json({ conversation: serializeConversation(data) }, { headers: responseHeaders });
  }

  const { data, error } = await authenticated.supabase.from("assistant_conversations")
    .select("id,title,messages,created_at,updated_at")
    .eq("user_id", authenticated.user.id)
    .order("updated_at", { ascending: false })
    .limit(30);
  if (error) return Response.json({ error: "Chat history is unavailable right now." }, { status: 503, headers: responseHeaders });

  const conversations = (data ?? []).map((row) => {
    const saved = serializeConversation(row);
    return { id: saved.id, title: saved.title, preview: saved.preview, createdAt: saved.createdAt, updatedAt: saved.updatedAt };
  });
  return Response.json({ conversations }, { headers: responseHeaders });
}

export async function POST(request: Request) {
  const authenticated = await getAuthenticatedClient();
  if (!authenticated) return Response.json({ error: "Sign in to save chats to your account." }, { status: 401, headers: responseHeaders });

  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Send a valid conversation." }, { status: 400, headers: responseHeaders }); }
  const messages = body && typeof body === "object" ? parseMessages((body as { messages?: unknown }).messages) : null;
  if (!messages) return Response.json({ error: "This conversation is invalid or too long to save." }, { status: 400, headers: responseHeaders });

  const { data, error } = await authenticated.supabase.from("assistant_conversations")
    .insert({ title: conversationTitle(messages), messages: messages as unknown as Json })
    .select("id,title,messages,created_at,updated_at")
    .single();
  if (error || !data) return Response.json({ error: "Chat history could not be saved." }, { status: 503, headers: responseHeaders });
  return Response.json({ conversation: serializeConversation(data) }, { status: 201, headers: responseHeaders });
}

export async function PATCH(request: Request) {
  const authenticated = await getAuthenticatedClient();
  if (!authenticated) return Response.json({ error: "Sign in to save chats to your account." }, { status: 401, headers: responseHeaders });

  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Send a valid conversation." }, { status: 400, headers: responseHeaders }); }
  const id = body && typeof body === "object" ? (body as { id?: unknown }).id : undefined;
  const messages = body && typeof body === "object" ? parseMessages((body as { messages?: unknown }).messages) : null;
  if (typeof id !== "string" || !idPattern.test(id) || !messages) {
    return Response.json({ error: "This conversation is invalid or too long to save." }, { status: 400, headers: responseHeaders });
  }

  const { data, error } = await authenticated.supabase.from("assistant_conversations")
    .update({ messages: messages as unknown as Json })
    .eq("id", id)
    .eq("user_id", authenticated.user.id)
    .select("id,title,messages,created_at,updated_at")
    .maybeSingle();
  if (error) return Response.json({ error: "Chat history could not be updated." }, { status: 503, headers: responseHeaders });
  if (!data) return Response.json({ error: "This chat could not be found." }, { status: 404, headers: responseHeaders });
  return Response.json({ conversation: serializeConversation(data) }, { headers: responseHeaders });
}

export async function DELETE(request: Request) {
  const authenticated = await getAuthenticatedClient();
  if (!authenticated) return Response.json({ error: "Sign in to manage saved chats." }, { status: 401, headers: responseHeaders });

  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Choose a chat to delete." }, { status: 400, headers: responseHeaders }); }
  const id = body && typeof body === "object" ? (body as { id?: unknown }).id : undefined;
  if (typeof id !== "string" || !idPattern.test(id)) return Response.json({ error: "Choose a valid chat to delete." }, { status: 400, headers: responseHeaders });

  const { data, error } = await authenticated.supabase.from("assistant_conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", authenticated.user.id)
    .select("id")
    .maybeSingle();
  if (error) return Response.json({ error: "This chat could not be deleted." }, { status: 503, headers: responseHeaders });
  if (!data) return Response.json({ error: "This chat could not be found." }, { status: 404, headers: responseHeaders });
  return Response.json({ success: true }, { headers: responseHeaders });
}
