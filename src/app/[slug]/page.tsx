"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import PasswordPrompt from "@/components/PasswordPrompt";
import { Button } from "@/components/ui/button";
import type { Page, Section } from "@/types";
import Link from "next/link";
import { formatBytes } from "@/lib/utils";

interface Props {
  params: Promise<{ slug: string }>;
}

export default function ViewPage({ params }: Props) {
  const { slug } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();

  const tokenFromUrl = searchParams.get("edit") ?? "";

  const [page, setPage] = useState<Page | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [isGridView, setIsGridView] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

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
    if (tokenFromUrl) activateFromUrl(tokenFromUrl);
  }, [tokenFromUrl, activateFromUrl]);
  useEffect(() => {
    if (sections.length > 3) setIsGridView(true);
    
    // Default to collapsed if > 1 section
    const initialExpanded: Record<string, boolean> = {};
    sections.forEach(s => {
      initialExpanded[s.id] = sections.length <= 1;
    });
    setExpandedSections(initialExpanded);
  }, [sections]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <span className="spinner" />
    </div>
  );

  if (needsPassword) return (
    <PasswordPrompt slug={slug} onSuccess={(pwd) => { fetchPage(pwd); }} />
  );

  if (error || !page) return (
    <div className="animate-fade-in flex flex-col items-center justify-center py-24 text-center">
      <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em]">{error || "Page not found."}</p>
      <Button variant="link" onClick={() => router.push("/")} className="mt-4 text-[10px] uppercase font-bold tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity">Back to Home</Button>
    </div>
  );

  return (
    <div className="animate-fade-in flex flex-col min-h-[calc(100vh-140px)]">
      {/* Breadcrumb */}
      <nav className="flex items-center justify-between mb-12 select-none">
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
          <Link href="/" className="hover:text-foreground transition-all underline decoration-muted-foreground/20 underline-offset-4">RENTRY</Link>
          <span className="opacity-20 font-light">/</span>
          <span className="text-foreground tracking-[0.3em]">{page.slug.toUpperCase()}</span>
        </div>
        
        {sections.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsGridView(!isGridView)}
            className="text-muted-foreground hover:text-foreground h-7 text-[9px] uppercase font-bold tracking-[0.2em] px-2"
          >
            {isGridView ? "List View" : "Grid View"}
          </Button>
        )}
      </nav>

      {/* Content */}
      <div className={`flex-1 ${isGridView ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 auto-rows-max" : "space-y-6"}`}>
        {sections.map((s) => {
          const isExpanded = expandedSections[s.id];
          return (
            <div 
              key={s.id} 
              className={`rounded-lg border border-border/30 bg-[#0a0a0a]/50 flex flex-col transition-all duration-300 animate-fade-in-up ${
                isExpanded ? "p-8 space-y-6" : "p-4 hover:bg-[#0f0f0f]/80"
              } ${isGridView ? "max-h-[400px] overflow-y-auto" : ""}`}
            >
              {/* Section Header */}
              <div 
                className={`flex items-center justify-between cursor-pointer group/header ${isExpanded && s.title ? "pb-4 border-b border-border/30" : ""}`}
                onClick={() => toggleSection(s.id)}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`transition-transform duration-200 ${isExpanded ? "rotate-90" : "rotate-0 opacity-40"}`}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                  <h2 className={`text-[10px] font-bold text-foreground uppercase tracking-[0.2em] truncate ${!isExpanded ? "opacity-60" : ""}`}>
                    {s.title || "Untitled Section"}
                  </h2>
                </div>

                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(s.content || "");
                    }}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground/40 hover:text-foreground transition-all"
                    title="Copy Content"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                  {!isExpanded && (
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/30 px-2 py-0.5 border border-border/20 rounded">
                      Expand
                    </span>
                  )}
                </div>
              </div>

              {/* Section Body */}
              {isExpanded && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="prose-rentry text-[13px] font-mono leading-relaxed text-foreground/80 selection:bg-primary/20">
                    <ReactMarkdown rehypePlugins={[rehypeSanitize]} remarkPlugins={[remarkGfm]}>
                      {s.content || "Empty page."}
                    </ReactMarkdown>
                  </div>
                  {s.files && s.files.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-border/20 flex flex-wrap gap-3">
                      {s.files.map(f => (
                        <a 
                          key={f.id} 
                          href={f.url ?? "#"} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-3 px-4 py-2 rounded bg-[#0f0f0f] border border-border/40 text-[10px] font-bold text-muted-foreground/80 uppercase tracking-widest hover:text-foreground hover:border-border transition-all"
                        >
                          <span className="truncate max-w-[200px]">{f.file_name}</span>
                          <span className="opacity-30 font-medium">({formatBytes(f.file_size)})</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {sections.length === 0 && (

          <div className="rounded-lg border border-border/30 bg-[#0a0a0a]/50 p-12 text-center">
            <p className="text-muted-foreground/60 text-[10px] font-bold uppercase tracking-[0.3em]">Empty page.</p>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="border-t border-border mt-20 pt-6 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em]">
        <Link href={`/${page.slug}/edit`} className="text-muted-foreground hover:text-foreground transition-colors">
          EDIT PAGE
        </Link>
        <div className="flex items-center gap-6 text-muted-foreground/30">
          <span>{new Date(page.created_at).toLocaleDateString()}</span>
          <span className="opacity-50 font-light">|</span>
          <span>VIEWS: {page.views || 0}</span>
        </div>
      </div>
      
    </div>
  );
}
