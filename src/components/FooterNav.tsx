// Shared bottom nav, identical to rentry.co's footer
export default function FooterNav() {
  return (
    <div className="border-t border-[#1a1a1a] mt-10 pt-4 pb-8 text-center text-xs text-[#444]">
      <nav className="flex items-center justify-center gap-1 flex-wrap">
        <a href="/" className="hover:text-[#888] transition-colors">new</a>
        <span>·</span>
        <span className="text-[#333] cursor-default">what</span>
        <span>·</span>
        <span className="text-[#333] cursor-default">how</span>
        <span>·</span>
        <span className="text-[#333] cursor-default">langs</span>
        <span>·</span>
        <span className="text-[#333] cursor-default">contacts</span>
        <span className="ml-2">🌙</span>
      </nav>
    </div>
  );
}
