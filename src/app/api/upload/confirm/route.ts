import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";


// Step 3: After client uploads to storage, confirm and record metadata
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { section_id, file_name, file_path, file_size, edit_token, page_slug } = body;

    if (!section_id || !file_name || !file_path || !file_size || !edit_token || !page_slug) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Validate edit token
    const { data: page } = await supabaseAdmin
      .from("pages")
      .select("id, edit_token")
      .eq("slug", page_slug)
      .single();

    if (!page || page.edit_token !== edit_token) {
      console.warn(`[WARN] Invalid token attempt on /api/upload/confirm for slug: ${page_slug}`);
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    // Verify file actually exists in storage before recording metadata
    const { data: listed } = await supabaseAdmin.storage
      .from("uploads")
      .list(file_path.split("/").slice(0, -1).join("/"));

    const fileName = file_path.split("/").pop();
    const fileExists = listed?.some((f) => f.name === fileName);
    if (!fileExists) {
      return NextResponse.json({ error: "File not found in storage." }, { status: 400 });
    }

    const { data: file, error } = await supabaseAdmin
      .from("files")
      .insert({ section_id, file_name, file_path, file_size })
      .select()
      .single();

    if (error || !file) {
      console.error("[ERROR] Failed to insert file metadata:", error);
      return NextResponse.json({ error: "Failed to record file." }, { status: 500 });
    }

    return NextResponse.json({ file }, { status: 201 });
  } catch (err) {
    console.error("[ERROR] /api/upload/confirm unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
