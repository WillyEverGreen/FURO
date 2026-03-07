import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { uploadLimiter } from "@/lib/ratelimit";
import {
  MAX_FILES_PER_SECTION,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/constants";
import { nanoid } from "nanoid";


// Step 1: Request a signed upload URL
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
    const { success } = await uploadLimiter.limit(ip);
    if (!success) {
      console.info(`[INFO] Rate limit hit: ${ip} on /api/upload`);
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const { section_id, page_slug, file_name, file_type, file_size } = body;

    if (!section_id || !page_slug || !file_name || !file_type || !file_size) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Validate file size
    if (file_size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "File too large (max 50 MB)." }, { status: 400 });
    }

    // Check file count for section
    const { count } = await supabaseAdmin
      .from("files")
      .select("*", { count: "exact", head: true })
      .eq("section_id", section_id);

    if ((count ?? 0) >= MAX_FILES_PER_SECTION) {
      return NextResponse.json(
        { error: `Max ${MAX_FILES_PER_SECTION} files per section.` },
        { status: 400 }
      );
    }

    const ext = file_name.split(".").pop();
    const unique_name = `${nanoid()}.${ext}`;
    const file_path = `uploads/${page_slug}/${unique_name}`;

    const { data, error } = await supabaseAdmin.storage
      .from("uploads")
      .createSignedUploadUrl(file_path);

    if (error || !data) {
      console.error(`[ERROR] Failed to generate signed URL:`, error);
      return NextResponse.json({ error: "Failed to generate upload URL." }, { status: 500 });
    }

    return NextResponse.json({
      signed_url: data.signedUrl,
      file_path,
      token: data.token,
    });
  } catch (err) {
    console.error("[ERROR] /api/upload unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
