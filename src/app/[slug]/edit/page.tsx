"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import SectionCard from "@/components/SectionCard";
import PasswordPrompt from "@/components/PasswordPrompt";
import FooterNav from "@/components/FooterNav";
import type { Page, Section } from "@/types";
import { MAX_SECTIONS_PER_PAGE } from "@/lib/constants";
import { nanoid } from "nanoid";

interface Props {
  params: Promise<{ slug: string }>;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

export default function EditPage({ params }: Props) {
  const { slug } = use(params);
  const router = useRouter();

  // Page data
  const [page, setPage] = useState<Page | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [unlockedPwd, setUnlockedPwd] = useState<string | null>(null);

  // Auth
  const [editCode, setEditCode] = useState("");
  const [newEditCode, setNewEditCode] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [editToken, setEditToken] = useState("");

  // Save / delete
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [deleting, setDeleting] = useState(false);

  const fetchPage = useCallback(async (pwd?: string) => {
    setLoading(true);
    setPageError("");
    const headers: Record<string, string> = {};
    if (pwd) headers["x-page-password"] = pwd;
    const res = await fetch(`/api/page/${slug}`, { headers });
    const data = await res.json();
    if (res.status === 401 && data.requires_password) {
      setNeedsPassword(true); setLoading(false); return;
    }
    if (!res.ok) { setPageError(data.error ?? "Page not found."); setLoading(false); return; }
    setPage(data.page);
    setSections(data.page.sections ?? []);
    setNeedsPassword(false);
    setLoading(false);
  }, [slug]);

  useEffect(() => { fetchPage(); }, [fetchPage]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCode.trim()) return;
    setAuthLoading(true); setAuthError("");
    const res = await fetch("/api/auth/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, edit_token: editCode.trim() }),
    });
    if (res.ok) {
      setEditToken(editCode.trim());
      setIsEditMode(true);
    } else {
      setAuthError("Wrong edit code.");
    }
    setAuthLoading(false);
  };

  const handleSave = async () => {
    setSaving(true); setSaveMsg("");
    const body: Record<string, unknown> = { sections };
    if (newUrl.trim()) body.new_slug = newUrl.trim();
    const res = await fetch(`/api/page/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-edit-token": editToken },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setSaveMsg("Saved ✓");
      setTimeout(() => setSaveMsg(""), 2500);
      if (newUrl.trim()) router.push(`/${newUrl.trim()}`);
    } else {
      const d = await res.json();
      setSaveMsg(d.error ?? "Save failed.");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("Permanently delete this page?")) return;
    setDeleting(true);
    await fetch(`/api/page/${slug}`, { method: "DELETE", headers: { "x-edit-token": editToken } });
    router.push("/");
  };

  const addSection = () => {
    if (sections.length >= MAX_SECTIONS_PER_PAGE) return;
    setSections(prev => [...prev, {
      id: `temp_${nanoid(8)}`, page_id: page!.id,
      title: "", content: "", sort_order: prev.length,
      created_at: new Date().toISOString(), files: [],
    }]);
  };

  // ── States ──
  if (loading) return (
    <main className="min-h-screen flex items-center justify-center">
      <span className="spinner scale-150" />
    </main>
  );

  if (needsPassword) return (
    <PasswordPrompt slug={slug} onSuccess={(pwd) => { setUnlockedPwd(pwd); fetchPage(pwd); }} />
  );

  if (pageError) return (
    <main className="max-w-3xl mx-auto px-4 py-10 min-h-screen flex flex-col">
      <div className="text-center py-24 flex-1">
        <p className="text-[#333] text-6xl mb-4">404</p>
        <p className="text-[#555] text-sm">{pageError}</p>
        <a href="/" className="text-xs text-[#555] hover:text-white transition-colors mt-4 inline-block">← new page</a>
      </div>
      <FooterNav />
    </main>
  );

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 min-h-screen flex flex-col">
      <div className="flex-1">
        {/* Slug breadcrumb */}
        <div className="mb-6 text-xs text-[#555] flex items-center gap-2">
          <a href="/" className="hover:text-white transition-colors">Rentry</a>
          <span>/</span>
          <a href={`/${slug}`} className="hover:text-white transition-colors">{slug}</a>
          <span>/</span>
          <span className="text-[#888]">edit</span>
        </div>

        {/* ── Sections: read-only preview (dimmed) before unlock, full editor after ── */}
        {!isEditMode ? (
          /* Dimmed preview */
          <div className={sections.length > 3 ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 opacity-50 pointer-events-none select-none" : "space-y-5 mb-8 opacity-50 pointer-events-none select-none"}>
            {sections.length === 0 ? (
              <div className="text-center py-12 text-[#333] text-sm col-span-full">No sections yet.</div>
            ) : sections.map(s => (
              <div key={s.id} className={`card ${sections.length > 3 ? "max-h-[300px] overflow-hidden flex flex-col" : ""}`}>
                {s.title && <h2 className="text-sm font-semibold text-[#ccc] mb-3 shrink-0">{s.title}</h2>}
                <div className={`prose-rentry text-sm flex-1 ${sections.length > 3 ? "overflow-hidden mask-bottom" : ""}`}>
                  {s.content ? (
                    <ReactMarkdown rehypePlugins={[rehypeSanitize]} remarkPlugins={[remarkGfm]}>
                      {s.content}
                    </ReactMarkdown>
                  ) : <p className="text-[#444] text-sm italic">No content.</p>}
                </div>
                {s.files && s.files.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#1a1a1a] flex flex-wrap gap-2 shrink-0">
                    {s.files.map(f => (
                      <div key={f.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0d0d0d] border border-[#1a1a1a] text-xs text-[#666]">
                        <span className="truncate max-w-[140px]">{f.file_name}</span>
                        <span className="text-[#444]">{formatBytes(f.file_size)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

        ) : (
          /* Full editor */
          <div className="space-y-4 mb-8">
            {sections.map(s => (
              <SectionCard
                key={s.id} section={s} isEditMode={true}
                pageSlug={slug} editToken={editToken}
                onUpdate={updated => setSections(prev => prev.map(x => x.id === updated.id ? updated : x))}
                onDelete={id => setSections(prev => prev.filter(x => x.id !== id))}
              />
            ))}
            {sections.length < MAX_SECTIONS_PER_PAGE && (
              <div className="flex justify-center mt-2">
                <button
                  onClick={addSection}
                  className="btn btn-ghost py-2 px-6"
                  style={{ borderStyle: "dashed" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2 inline">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add Section
                </button>
              </div>
            )}

          </div>
        )}

        {/* ── Edit form at bottom — matches reference image exactly ── */}
        <div className="border-t border-[#1a1a1a] pt-5">
          {saveMsg && (
            <div className="mb-3 text-sm text-center text-[#888] border border-[#2a2a2a] rounded-lg py-2 animate-fade-in">
              {saveMsg}
            </div>
          )}

          <form onSubmit={isEditMode ? (e) => { e.preventDefault(); handleSave(); } : handleUnlock}>
            {/* Row 1: edit code + optional fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
              <input
                type="password"
                className="input text-sm py-2"
                placeholder="Enter edit code"
                value={editCode}
                onChange={e => setEditCode(e.target.value)}
                disabled={isEditMode}
                autoComplete="off"
                autoFocus={!isEditMode}
              />
              <input
                type="text"
                className="input text-sm py-2"
                placeholder="New edit code — optional"
                value={newEditCode}
                onChange={e => setNewEditCode(e.target.value)}
                disabled={!isEditMode}
              />
              <input
                type="text"
                className="input text-sm py-2"
                placeholder="New url — optional"
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                disabled={!isEditMode}
              />
            </div>

            {authError && <p className="text-red-400 text-xs mb-2">{authError}</p>}

            {/* Row 2: action buttons */}
            <div className="flex items-center gap-2">
              {!isEditMode ? (
                <>
                  <button type="submit" className="btn btn-primary text-xs px-4 py-2" disabled={authLoading || !editCode.trim()}>
                    {authLoading ? <><span className="spinner" /> …</> : "Edit →"}
                  </button>
                  <a href={`/${slug}`} className="btn btn-ghost text-xs px-4 py-2">Back</a>
                </>
              ) : (
                <>
                  <button type="submit" className="btn btn-primary text-xs px-4 py-2" disabled={saving}>
                    {saving ? <><span className="spinner" /> Saving…</> : "Save"}
                  </button>
                  <a href={`/${slug}`} className="btn btn-ghost text-xs px-4 py-2">Back</a>
                  <div className="flex-1" />
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="btn btn-danger text-xs px-4 py-2"
                  >
                    {deleting ? "Deleting…" : "Delete"}
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>

      <FooterNav />
    </main>
  );
}
