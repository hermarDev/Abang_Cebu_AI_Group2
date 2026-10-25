"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Empty } from "@/components/ui/Empty";
import styles from "./RestoredFinderShell.module.css";

export function FinderAssistant({ open, onOpenChange: setOpen, onSearch, onFilters }: { open: boolean; onOpenChange: (open: boolean) => void; onSearch: () => void; onFilters: () => void }) {
  return <div className={styles.assistant}>
    {open && <section className={styles.chatPanel} aria-label="AbangCebu assistant">
      <header className={styles.chatHeader}><Image src="/icons/chatbot_logo.png" alt="" width={36} height={36} /><div><b>AbangCebu assistant</b><span>Rental chat is not connected</span></div><button type="button" onClick={() => setOpen(false)} aria-label="Close chat"><X size={18} /></button></header>
      <div className={styles.chatMessages}>
        <Empty aria-labelledby="assistant-offline-title" className="content-start justify-items-stretch gap-3 border-0 bg-transparent p-0 text-left">
          <Alert>
            <h2 id="assistant-offline-title" className="font-semibold">AI Assistant Not Connected</h2>
            <span className="mt-1 block">Live recommendations are unavailable. Use place search and filters to explore verified rentals.</span>
          </Alert>
          <div className={styles.suggestions}>
            <button type="button" onClick={() => { setOpen(false); onSearch(); }}>Search places</button>
            <button type="button" onClick={() => { setOpen(false); onFilters(); }}>Open filters</button>
          </div>
        </Empty>
      </div>
    </section>}
  </div>;
}
