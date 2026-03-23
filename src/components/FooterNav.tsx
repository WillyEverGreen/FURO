"use client";

import Link from "next/link";

export default function FooterNav() {
  return (
    <footer className="border-t border-border mt-20 pt-10 pb-20 flex items-center justify-center gap-4 text-muted-foreground/40 text-[10px] tracking-[0.25em] uppercase font-bold select-none">
      <Link href="/" className="transition-colors hover:text-foreground">NEW</Link>
      <span className="opacity-10 font-thin">|</span>
      <span className="cursor-default">ABOUT</span>
      <span className="opacity-10 font-thin">|</span>
      <span className="cursor-default">FAQ</span>
      <span className="opacity-10 font-thin">|</span>
      <span className="cursor-default">LEGAL</span>
      <span className="opacity-10 font-thin">|</span>
      <span className="cursor-default">CONTACT</span>
    </footer>
  );
}
