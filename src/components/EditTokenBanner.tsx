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
    <div className="border border-[#2a2a2a] bg-[#111] rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 animate-fade-in">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#888] font-medium uppercase tracking-wide mb-1">Edit Link</p>
        <p className="text-xs text-[#555] font-mono truncate">{editUrl}</p>
        <p className="text-xs text-[#444] mt-0.5">Bookmark this link to edit your page in the future.</p>
      </div>
      <button onClick={copy} className="btn-ghost text-xs shrink-0">
        Copy Link
      </button>
    </div>
  );
}
