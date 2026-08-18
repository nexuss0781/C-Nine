import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import React from "react";

export function WorkspaceTabs<T extends string>({ items, active, onSelect, label }: { items: Array<{ id: T; label: string; icon: LucideIcon }>; active: T; onSelect: (item: T) => void; label: string }) {
  return <div className="flex items-center justify-between px-1"><div className="flex items-center rounded-lg border border-white/[0.1] bg-white/[0.025] p-0.5">{items.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => onSelect(item.id)} className={cn("flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white", active === item.id ? "bg-white text-black" : "text-white/48 hover:text-white")}><Icon className="size-3.5" />{item.label}</button>; })}</div><span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/32">{label}</span></div>;
}
