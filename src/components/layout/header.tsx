import Link from "next/link";
import { siteConfig } from "@/config/site";
import { MapPin, Sparkles } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-zinc-900 dark:text-zinc-50">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <MapPin className="h-5 w-5" />
          </div>
          <span>{siteConfig.name}</span>
          <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <Sparkles className="h-3 w-3" /> AI
          </span>
        </Link>

        <nav className="flex items-center gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          <Link href="/" className="hover:text-blue-600 transition-colors">
            Home
          </Link>
          <Link href="/map" className="hover:text-blue-600 transition-colors">
            Map Explorer
          </Link>
          <a
            href="https://github.com/hermarDev/Abang_Cebu_AI_Group2"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-600 transition-colors"
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}
