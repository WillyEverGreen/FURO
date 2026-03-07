import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";


// DELETE: remove a single file from storage + DB (requires edit_token)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const edit_token = req.headers.get("x-edit-token");
  const page_slug = req.headers.get("x-page-slug");

  if (!edit_token || !page_slug) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Validate token
  const { data: page } = await supabaseAdmin
    .from("pages")
    .select("id, edit_token")
    .eq("slug", page_slug)
    .single();

  if (!page || page.edit_token !== edit_token) {
    console.warn(`[WARN] Invalid token attempt (DELETE file) for slug: ${page_slug}`);
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  // Fetch file record
  const { data: file } = await supabaseAdmin
    .from("files")
    .select("id, file_path")
    .eq("id", id)
    .single();

  if (!file) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  // Delete from storage first
  const { error: storageErr } = await supabaseAdmin.storage
    .from("uploads")
    .remove([file.file_path]);

  if (storageErr) {
    console.error(`[ERROR] Failed to delete file from storage:`, storageErr);
  }

  // Delete from DB
  await supabaseAdmin.from("files").delete().eq("id", id);

  return NextResponse.json({ success: true });
}
