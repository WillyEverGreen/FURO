import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { createLimiter } from "@/lib/ratelimit";
import {
  SLUG_REGEX,
  RESERVED_SLUGS,
  MAX_SECTIONS_PER_PAGE,
} from "@/lib/constants";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
    const { success } = await createLimiter.limit(ip);
    if (!success) {
      console.info(`[INFO] Rate limit hit: ${ip} on /api/create`);
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const { slug, password, expiration, title, content } = body;

    let finalSlug = slug;

    // Auto-generate slug if omitted
    if (!finalSlug) {
      const { generateSlug } = await import("random-word-slugs");
      finalSlug = generateSlug(3, { format: "kebab" }); // e.g. "big-red-fox"
    }

    // Validate slug
    if (!SLUG_REGEX.test(finalSlug)) {
      return NextResponse.json(
        {
          error:
            "Invalid slug. Use 3-50 alphanumeric chars, hyphens, or underscores.",
        },
        { status: 400 },
      );
    }
    if (RESERVED_SLUGS.has(finalSlug.toLowerCase())) {
      return NextResponse.json(
        { error: "That slug is reserved." },
        { status: 400 },
      );
    }

    // Check slug not taken
    const { data: existing } = await supabaseAdmin
      .from("pages")
      .select("id")
      .eq("slug", finalSlug)
      .single();
    if (existing) {
      return NextResponse.json(
        { error: "Slug already taken." },
        { status: 409 },
      );
    }

    const edit_token = nanoid(32);
    const password_hash = password ? await bcrypt.hash(password, 10) : null;

    let expires_at: string | null = null;
    if (expiration === "1h")
      expires_at = new Date(Date.now() + 3_600_000).toISOString();
    else if (expiration === "1d")
      expires_at = new Date(Date.now() + 86_400_000).toISOString();
    else if (expiration === "1w" || expiration === "7d")
      expires_at = new Date(Date.now() + 604_800_000).toISOString();
    else if (expiration === "30d")
      expires_at = new Date(Date.now() + 2_592_000_000).toISOString();

    // Create page
    const { data: page, error: pageErr } = await supabaseAdmin
      .from("pages")
      .insert({
        slug: finalSlug,
        edit_token,
        password_hash,
        visibility: password ? "private" : "public",
        expires_at,
      })
      .select()
      .single();

    if (pageErr || !page) {
      console.error(`[ERROR] Failed to create page:`, pageErr);
      return NextResponse.json(
        { error: "Failed to create page." },
        { status: 500 },
      );
    }

    // Create first section
    const { error: secErr } = await supabaseAdmin.from("sections").insert({
      page_id: page.id,
      title: title ?? "",
      content: content ?? "",
      sort_order: 0,
    });

    if (secErr) {
      console.error(`[ERROR] Failed to create first section:`, secErr);
      // Rollback page
      await supabaseAdmin.from("pages").delete().eq("id", page.id);
      return NextResponse.json(
        { error: "Failed to create section." },
        { status: 500 },
      );
    }

    return NextResponse.json({ slug: finalSlug, edit_token }, { status: 201 });
  } catch (err) {
    console.error("[ERROR] /api/create unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
