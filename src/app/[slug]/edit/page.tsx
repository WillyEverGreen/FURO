"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import SectionCard from "@/components/SectionCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Page, Section } from "@/types";
import { MAX_SECTIONS_PER_PAGE } from "@/lib/constants";
import { nanoid } from "nanoid";

interface Props {
  params: Promise<{ slug: string }>;
}

export default function EditPage({ params }: Props) {
  const { slug } = use(params);
  const router = useRouter();

  // Page data
  const [page, setPage] = useState<Page | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  // Auth/Save state
  const [editCode, setEditCode] = useState("");
  const [newEditCode, setNewEditCode] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchPage = useCallback(async () => {
    setLoading(true);
    setPageError("");
    // Use x-intent: edit to bypass view password check for the editor preview
    const res = await fetch(`/api/page/${slug}`, { 
      headers: { "x-intent": "edit" } 
    });
    const data = await res.json();
    if (!res.ok) { setPageError(data.error ?? "Page not found."); setLoading(false); return; }
    setPage(data.page);
    setSections(data.page.sections ?? []);
    setLoading(false);
  }, [slug]);

  useEffect(() => { fetchPage(); }, [fetchPage]);

  const handleSave = async () => {
    if (!editCode.trim()) {
      setError("Enter the Current Edit Code to save changes.");
      return;
    }

    setSaving(true);
    setError("");

    const body: Record<string, unknown> = {
      sections,
      password: newEditCode.trim() || undefined,
    };

    const res = await fetch(`/api/page/${slug}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json", 
        "x-edit-token": editCode.trim() 
      },
      body: JSON.stringify(body),
    });
    
    if (res.ok) {
      router.push(`/${slug}`);
    } else {
      const d = await res.json();
      setError(d.error ?? "Save failed. Check your edit code.");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!editCode.trim()) {
      setError("Enter the Current Edit Code to delete this page.");
      return;
    }
    if (!confirm("Are you sure you want to delete this page?")) return;
    
    setDeleting(true);
    setError("");
    
    const res = await fetch(`/api/page/${slug}`, { 
      method: "DELETE", 
      headers: { "x-edit-token": editCode.trim() } 
    });

    if (res.ok) {
      router.push("/");
    } else {
      const d = await res.json();
      setError(d.error ?? "Delete failed. Check your edit code.");
      setDeleting(false);
    }
  };

  const addSection = () => {
    if (sections.length >= MAX_SECTIONS_PER_PAGE) return;
    setSections(prev => [...prev, {
      id: crypto.randomUUID(), page_id: page!.id,
      title: "New Section", content: "", sort_order: prev.length,
      created_at: new Date().toISOString(), files: [],
    }]);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <span className="spinner" />
    </div>
  );

  if (pageError || !page) return (
    <div className="animate-fade-in flex flex-col items-center justify-center py-24 text-center">
      <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em]">{pageError || "Page not found."}</p>
      <Button variant="link" onClick={() => router.push("/")} className="mt-4 text-[10px] uppercase font-bold tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity">Back to Home</Button>
    </div>
  );

  return (
    <div className="animate-fade-in flex flex-col min-h-[calc(100vh-140px)]">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-10 select-none">
        <a href="/" className="hover:text-foreground transition-all underline decoration-muted-foreground/20 underline-offset-4">RENTRY</a>
        <span className="opacity-20 font-light">/</span>
        <a href={`/${slug}`} className="hover:text-foreground transition-all underline decoration-muted-foreground/20 underline-offset-4 tracking-[0.3em]">{slug.toUpperCase()}</a>
        <span className="opacity-20 font-light">/</span>
        <span className="text-foreground tracking-[0.3em]">EDIT</span>
      </nav>

      <div className="flex-1">
        <div className="space-y-6">
          {/* Active Editor Sections */}
          {sections.map(s => (
            <SectionCard
              key={s.id} 
              section={s} 
              isEditMode={true}
              pageSlug={slug} 
              editToken={editCode} // token is passed but won't be valid until Save is clicked
              onUpdate={updated => setSections(prev => prev.map(x => x.id === updated.id ? updated : x))}
              onDelete={id => setSections(prev => prev.filter(x => x.id !== id))}
            />
          ))}

          {/* Add Section Button */}
          {sections.length < MAX_SECTIONS_PER_PAGE && (
             <button
               onClick={addSection}
               className="w-full border-2 border-dashed border-border/30 rounded-lg py-6 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground hover:border-ring transition-all bg-[#0a0a0a]/50"
             >
               + Add Section
             </button>
          )}

          {/* Authorization & Save Area */}
          <div className="border-t border-border mt-12 pt-10 pb-12">
            <div className="w-full space-y-8">
              <div>
                <h3 className="text-[10px] font-bold text-foreground mb-1 uppercase tracking-[0.3em]">
                  Authorize Changes
                </h3>
                <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-[0.2em] opacity-40">
                  Enter your edit code to save or delete this page.
                </p>
              </div>

              {error && (
                <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider py-1">{error}</p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-2 block ml-1">
                    Current Edit Code
                  </label>
                  <Input
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    placeholder="••••••••"
                    type="password"
                    className="bg-[#0f0f0f] border-border/40 text-foreground placeholder:text-muted-foreground/20 h-11"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-2 block ml-1">
                    New Edit Code (Optional)
                  </label>
                  <Input
                    value={newEditCode}
                    onChange={(e) => setNewEditCode(e.target.value)}
                    placeholder="Optional"
                    type="password"
                    className="bg-[#0f0f0f] border-border/40 text-foreground placeholder:text-muted-foreground/20 h-11"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 sm:flex-none bg-[#111] border border-border/60 text-foreground hover:bg-[#1a1a1a] px-12 h-12 text-[10px] font-bold uppercase tracking-[0.3em] shadow-sm transition-all"
                  >
                    {saving ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => router.push(`/${slug}`)}
                    className="flex-1 sm:flex-none text-muted-foreground hover:text-foreground h-12 px-6 text-[10px] font-bold uppercase tracking-[0.2em]"
                  >
                    Cancel
                  </Button>
                </div>
                <Button
                  onClick={handleDelete}
                  disabled={deleting}
                  variant="ghost"
                  className="w-full sm:w-auto text-red-400/60 hover:text-red-500 h-12 px-6 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors"
                >
                  {deleting ? "Deleting..." : "Delete Page"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
