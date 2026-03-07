import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { MAX_SECTIONS_PER_PAGE, MAX_SECTION_CONTENT_BYTES } from "@/lib/constants";
import bcrypt from "bcryptjs";


// GET: fetch a page with its sections and file metadata
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data: page, error } = await supabaseAdmin
    .from("pages")
    .select("id, slug, visibility, created_at, expires_at, password_hash")
    .eq("slug", slug)
    .single();

  if (error || !page) {
    return NextResponse.json({ error: "Page not found." }, { status: 404 });
  }

  // Check expiration
  if (page.expires_at && new Date(page.expires_at) < new Date()) {
    return NextResponse.json({ error: "This page has expired." }, { status: 410 });
  }

  // Password check for private pages
  if (page.visibility === "private") {
    const passwordHeader = req.headers.get("x-page-password");
    if (!passwordHeader) {
      return NextResponse.json({ error: "Password required.", requires_password: true }, { status: 401 });
    }
    const valid = await bcrypt.compare(passwordHeader, page.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 403 });
    }
  }

  // Fetch sections
  const { data: sections } = await supabaseAdmin
    .from("sections")
    .select("id, page_id, title, content, sort_order, created_at")
    .eq("page_id", page.id)
    .order("sort_order", { ascending: true });

  // Fetch files for all sections and generate signed URLs
  interface FileWithUrl {
    id: string;
    section_id: string;
    file_name: string;
    file_path: string;
    file_size: number;
    uploaded_at: string;
    url: string | null;
  }
  const sectionIds = (sections ?? []).map((s: { id: string }) => s.id);
  let filesWithUrls: FileWithUrl[] = [];

  if (sectionIds.length > 0) {
    const { data: files } = await supabaseAdmin
      .from("files")
      .select("*")
      .in("section_id", sectionIds);

    // Generate signed read URLs for each file (valid 1 hour)
    filesWithUrls = await Promise.all(
      (files ?? []).map(async (f: Omit<FileWithUrl, "url">) => {
        const { data: signed } = await supabaseAdmin.storage
          .from("uploads")
          .createSignedUrl(f.file_path, 3600);
        return { ...f, url: signed?.signedUrl ?? null };
      })
    );
  }

  // Group files by section
  const sectionsWithFiles = (sections ?? []).map((s: { id: string; [key: string]: unknown }) => ({
    ...s,
    files: filesWithUrls.filter((f) => f.section_id === s.id),
  }));

  return NextResponse.json({
    page: {
      id: page.id,
      slug: page.slug,
      visibility: page.visibility,
      created_at: page.created_at,
      expires_at: page.expires_at,
      sections: sectionsWithFiles,
    },
  });
}

// PUT: update sections (requires valid edit_token)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const edit_token = req.headers.get("x-edit-token");

  if (!edit_token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: page } = await supabaseAdmin
    .from("pages")
    .select("id, edit_token")
    .eq("slug", slug)
    .single();

  if (!page || page.edit_token !== edit_token) {
    console.warn(`[WARN] Invalid token attempt (PUT) for slug: ${slug}`);
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  const body = await req.json();
  const { sections } = body;

  if (!Array.isArray(sections)) {
    return NextResponse.json({ error: "Invalid sections data." }, { status: 400 });
  }

  if (sections.length > MAX_SECTIONS_PER_PAGE) {
    return NextResponse.json({ error: `Max ${MAX_SECTIONS_PER_PAGE} sections allowed.` }, { status: 400 });
  }

  for (const s of sections) {
    if (s.content && Buffer.byteLength(s.content, "utf8") > MAX_SECTION_CONTENT_BYTES) {
      return NextResponse.json({ error: "Section content exceeds 100KB limit." }, { status: 400 });
    }
  }

  // Delete existing sections and replace (simpler than diffing)
  await supabaseAdmin.from("sections").delete().eq("page_id", page.id);

  const inserts = sections.map((s: { title: string; content: string; sort_order: number }, i: number) => ({
    page_id: page.id,
    title: s.title ?? "",
    content: s.content ?? "",
    sort_order: s.sort_order ?? i,
  }));

  const { error } = await supabaseAdmin.from("sections").insert(inserts);
  if (error) {
    console.error("[ERROR] Failed to update sections:", error);
    return NextResponse.json({ error: "Failed to update sections." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE: delete page and all storage files (requires edit_token)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const edit_token = req.headers.get("x-edit-token");

  if (!edit_token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: page } = await supabaseAdmin
    .from("pages")
    .select("id, edit_token")
    .eq("slug", slug)
    .single();

  if (!page || page.edit_token !== edit_token) {
    console.warn(`[WARN] Invalid token attempt (DELETE) for slug: ${slug}`);
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  // Fetch all file paths before deletion
  const { data: sections } = await supabaseAdmin
    .from("sections")
    .select("id")
    .eq("page_id", page.id);

  const sectionIds = (sections ?? []).map((s: { id: string }) => s.id);

  if (sectionIds.length > 0) {
    const { data: files } = await supabaseAdmin
      .from("files")
      .select("file_path")
      .in("section_id", sectionIds);

    if (files && files.length > 0) {
      const paths = files.map((f: { file_path: string }) => f.file_path);
      await supabaseAdmin.storage.from("uploads").remove(paths);
    }
  }

  // Delete page (cascades sections + files)
  await supabaseAdmin.from("pages").delete().eq("id", page.id);

  return NextResponse.json({ success: true });
}
