"use client";

interface Props {
  slug: string;
  editToken: string;
}

export default function EditTokenBanner({ slug, editToken }: Props) {
  const editUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/${slug}?edit=${editToken}`
      : `/${slug}?edit=${editToken}`;

  const copy = () => navigator.clipboard.writeText(editUrl);

  return (
    <div className="border border-border bg-muted/30 rounded-lg p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 animate-fade-in">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Edit Link</p>
        <p className="text-xs text-foreground font-mono truncate">{editUrl}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1 uppercase tracking-wider font-medium">Bookmark this link to edit your page in the future.</p>
      </div>
      <button 
        onClick={copy} 
        className="bg-card border border-border text-foreground hover:bg-accent px-4 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-colors shrink-0"
      >
        Copy Link
      </button>
    </div>
  );
}
