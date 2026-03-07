"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import PasswordPrompt from "@/components/PasswordPrompt";
import ExpirationBadge from "@/components/ExpirationBadge";
import FooterNav from "@/components/FooterNav";
import type { Page, Section } from "@/types";

interface Props {
  params: Promise<{ slug: string }>;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "UTC",
  }) + " UTC";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

export default function SlugPage({ params }: Props) {
  const { slug } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();

  const tokenFromUrl = searchParams.get("edit") ?? "";

  const [page, setPage] = useState<Page | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [unlockedPassword, setUnlockedPassword] = useState<string | null>(null);

  // Copy feedback per section
  const [copied, setCopied] = useState<string | null>(null);

  // Expanded section state (for grid view)
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);

  const fetchPage = useCallback(async (pwd?: string) => {
    setLoading(true);
    setError("");
    const headers: Record<string, string> = {};
    if (pwd) headers["x-page-password"] = pwd;
    const res = await fetch(`/api/page/${slug}`, { headers });
    const data = await res.json();
    if (res.status === 401 && data.requires_password) {
      setNeedsPassword(true); setLoading(false); return;
    }
    if (!res.ok) { setError(data.error ?? "Page not found."); setLoading(false); return; }
    setPage(data.page);
    setSections(data.page.sections ?? []);
    setNeedsPassword(false);
    setLoading(false);
  }, [slug]);

  // Validate if a real edit token was passed in URL
  const activateFromUrl = useCallback(async (token: string) => {
    const res = await fetch("/api/auth/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, edit_token: token }),
    });
    if (res.ok) router.replace(`/${slug}`);
  }, [slug, router]);

  useEffect(() => { fetchPage(); }, [fetchPage]);
  useEffect(() => {
    if (tokenFromUrl) {
      // Token in URL just means user came from edit; strip it and redirect to /slug/edit base
      activateFromUrl(tokenFromUrl);
    }
  }, [tokenFromUrl, activateFromUrl]);

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  // ── Loading / password / error states ──
  if (loading) return (
    <main className="min-h-screen flex items-center justify-center">
      <span className="spinner scale-150" />
    </main>
  );

  if (needsPassword) return (
    <PasswordPrompt slug={slug} onSuccess={(pwd) => { setUnlockedPassword(pwd); fetchPage(pwd); }} />
  );

  if (error) return (
    <main className="min-h-screen max-w-3xl mx-auto px-4 py-10">
      <div className="text-center py-24">
        <p className="text-[#333] text-6xl mb-4">404</p>
        <p className="text-[#555] text-sm mb-6">{error}</p>
        <a href="/" className="text-xs text-[#555] hover:text-white transition-colors">← new page</a>
      </div>
      <FooterNav />
    </main>
  );

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 min-h-screen flex flex-col">
      <div className="flex-1">
        {/* Slug header */}
        <div className="mb-6 flex items-center gap-3">
          <h1 className="text-sm font-mono text-[#888]">{slug}</h1>
          <ExpirationBadge expiresAt={page!.expires_at} />
          {page!.visibility === "private" && <span className="badge">🔒 Private</span>}
        </div>

        {/* Sections */}
        {sections.length === 0 ? (
          <div className="text-center py-16 text-[#333] text-sm">This page has no content yet.</div>
        ) : (
          <div className={sections.length > 3 ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-5"}>
            {sections.map((s) => (
              <div 
                key={s.id} 
                className={`card group flex flex-col ${sections.length > 3 ? "max-h-[300px] overflow-hidden relative cursor-pointer hover:border-[#333] transition-colors" : ""}`}
                onClick={() => { if (sections.length > 3) setExpandedSectionId(s.id); }}
              >
                {/* Section title */}
                {(s.title || sections.length > 3 || s.content) && (
                  <div className="flex items-center justify-between mb-3 shrink-0">
                    <h2 className="text-sm font-semibold text-[#ccc] truncate pr-2">{s.title || "Untitled"}</h2>
                    <div className="flex gap-2 items-center shrink-0">
                      <a 
                        href={`/${slug}/edit`} 
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-[#555] hover:text-white px-1.5 py-0.5 rounded hover:bg-[#1a1a1a]"
                        onClick={e => e.stopPropagation()}
                        title="Edit section"
                      >
                        Edit
                      </a>
                      {s.content && (
                        <button
                          onClick={(e) => { e.stopPropagation(); copyText(s.id, s.content); }}
                          title="Copy"
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-[#1a1a1a] text-[#555] hover:text-white"
                        >
                          {copied === s.id ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className={`prose-rentry flex-1 ${sections.length > 3 ? "overflow-hidden mask-bottom" : ""}`}>
                  {s.content ? (
                    <ReactMarkdown rehypePlugins={[rehypeSanitize]} remarkPlugins={[remarkGfm]}>
                      {s.content}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-[#444] text-sm italic">No content.</p>
                  )}
                </div>

                {/* Files — name badges only, no URLs */}
                {s.files && s.files.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#1a1a1a] flex flex-wrap gap-2 shrink-0 relative z-10">
                    {s.files.map(f => (
                      <div key={f.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0d0d0d] border border-[#1a1a1a] text-xs text-[#666]">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>
                        </svg>
                        <span className="max-w-[120px] truncate text-[#999]">{f.file_name}</span>
                        <span className="text-[#444] shrink-0">{formatBytes(f.file_size)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Click to expand hint overlay */}
                {sections.length > 3 && (
                  <div className="absolute inset-0 z-0 bg-transparent flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <span className="bg-[#111] border border-[#222] text-[#888] text-[10px] px-2 py-1 rounded shadow-lg">Click to expand</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expanded Modal */}
      {expandedSectionId && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm p-4 md:p-10 flex flex-col animate-fade-in overflow-y-auto"
          onClick={() => setExpandedSectionId(null)}
        >
          {sections.filter(s => s.id === expandedSectionId).map(s => (
            <div 
              key={s.id} 
              className="card w-full max-w-4xl mx-auto my-auto relative shadow-2xl border-[#333]"
              onClick={e => e.stopPropagation()}
            >
              <button 
                className="absolute top-4 right-4 p-2 text-[#555] hover:text-white bg-[#111] rounded-full hover:bg-[#222] transition-colors"
                onClick={() => setExpandedSectionId(null)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              
              <div className="flex items-center gap-3 mb-6 pr-10 border-b border-[#1a1a1a] pb-4">
                <h2 className="text-lg font-semibold text-[#eee]">{s.title || "Untitled Section"}</h2>
                <a href={`/${slug}/edit`} className="btn btn-ghost text-xs px-2 py-1">Edit</a>
              </div>
              
              <div className="prose-rentry text-base leading-relaxed">
                {s.content ? (
                  <ReactMarkdown rehypePlugins={[rehypeSanitize]} remarkPlugins={[remarkGfm]}>
                    {s.content}
                  </ReactMarkdown>
                ) : (
                  <p className="text-[#444] italic">No content.</p>
                )}
              </div>

              {s.files && s.files.length > 0 && (
                <div className="mt-8 pt-4 border-t border-[#1a1a1a] flex flex-wrap gap-2">
                  {s.files.map(f => (
                    <a 
                      key={f.id} href={f.url ?? "#"} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0d0d0d] border border-[#2a2a2a] hover:border-[#444] text-xs text-[#888] hover:text-white transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                      <span className="truncate">{f.file_name}</span>
                      <span className="text-[#555] shrink-0 font-mono">{formatBytes(f.file_size)}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}


      {/* ── Bottom bar — Edit button + metadata ── */}
      <div className="mt-10 pt-4 border-t border-[#1a1a1a] flex items-end justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <a href={`/${slug}/edit`} className="btn btn-ghost text-xs px-3 py-1.5">Edit</a>
        </div>
        <div className="text-right text-[10px] text-[#444] leading-relaxed">
          <div>Pub: {page?.created_at ? fmt(page.created_at) : "—"}</div>
        </div>
      </div>

      <FooterNav />
    </main>
  );
}
