import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 60;

// Vercel Cron: runs every hour
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/cleanup", "schedule": "0 * * * *" }] }
export async function GET(req: NextRequest) {
  // Only allow Vercel cron or internal requests
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();

  // 1. Fetch expired pages
  const { data: expiredPages } = await supabaseAdmin
    .from("pages")
    .select("id")
    .lt("expires_at", now)
    .not("expires_at", "is", null);

  if (!expiredPages || expiredPages.length === 0) {
    return NextResponse.json({ deleted: 0 });
  }

  const pageIds = expiredPages.map((p: { id: string }) => p.id);

  // 2. Fetch all section IDs for expired pages
  const { data: sections } = await supabaseAdmin
    .from("sections")
    .select("id")
    .in("page_id", pageIds);

  const sectionIds = (sections ?? []).map((s: { id: string }) => s.id);

  // 3. Fetch all file paths and delete from storage first
  if (sectionIds.length > 0) {
    const { data: files } = await supabaseAdmin
      .from("files")
      .select("file_path")
      .in("section_id", sectionIds);

    if (files && files.length > 0) {
      const paths = files.map((f: { file_path: string }) => f.file_path);
      const { error } = await supabaseAdmin.storage.from("uploads").remove(paths);
      if (error) {
        console.error("[ERROR] Cron: failed to delete storage files:", error);
      }
    }
  }

  // 4. Delete pages (cascades sections + files in DB)
  const { error } = await supabaseAdmin.from("pages").delete().in("id", pageIds);
  if (error) {
    console.error("[ERROR] Cron: failed to delete expired pages:", error);
    return NextResponse.json({ error: "Partial failure" }, { status: 500 });
  }

  console.info(`[INFO] Cron: deleted ${pageIds.length} expired pages.`);
  return NextResponse.json({ deleted: pageIds.length });
}
