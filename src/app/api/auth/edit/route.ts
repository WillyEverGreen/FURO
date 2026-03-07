import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";


// POST: validate edit token and set secure HTTP-only cookie
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { slug, edit_token } = body;

  if (!slug || !edit_token) {
    return NextResponse.json({ error: "Missing slug or token." }, { status: 400 });
  }

  const { data: page } = await supabaseAdmin
    .from("pages")
    .select("edit_token")
    .eq("slug", slug)
    .single();

  if (!page || page.edit_token !== edit_token) {
    console.warn(`[WARN] Invalid token attempt on /api/auth/edit for slug: ${slug}`);
    return NextResponse.json({ error: "Invalid edit token." }, { status: 403 });
  }

  const response = NextResponse.json({ success: true });

  // Secure, HTTP-only cookie: prevents token from leaking in browser history/logs
  response.cookies.set(`edit_session_${slug}`, "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/${slug}`,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return response;
}
