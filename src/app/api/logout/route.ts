import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logout } from "@/lib/auth/logout";

export async function POST(request: Request) {
  const text = await request.text();
  if (text.trim().length > 0) {
    try {
      const payload = JSON.parse(text);
      if (payload !== null && typeof payload !== "object") {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_REQUEST", message: "Invalid logout request." } },
          { status: 400 },
        );
      }
    } catch {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_REQUEST", message: "Invalid logout request." } },
        { status: 400 },
      );
    }
  }

  try {
    await logout(await cookies());
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "LOGOUT_FAILED", message: "Unable to revoke the session. Please try again." } },
      { status: 500 },
    );
  }
}
