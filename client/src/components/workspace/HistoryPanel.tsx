import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { formatWorkspaceDate, type WorkspaceActivity } from "@/lib/workspace";
import { BookOpenText, FileText, History, MessageSquareText, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

type HistoryPanelProps = {
  onRestoreDocument: (documentId: string) => void;
  onRestoreThread: (documentId: string, threadId?: string) => void;
};

const activityIcon = {
  document: FileText,
  chat: MessageSquareText,
  note: BookOpenText,
};

export function HistoryPanel({ onRestoreDocument, onRestoreThread }: HistoryPanelProps) {
  const { isAuthenticated } = useAuth();
  const historyQuery = trpc.history.list.useQuery(undefined, { enabled: isAuthenticated });
  const [filter, setFilter] = useState<"all" | WorkspaceActivity["kind"]>("all");
  const storedActivities = useMemo<WorkspaceActivity[]>(() => (historyQuery.data ?? []).map(item => ({
    id: item.id,
    kind: item.kind,
    title: item.title,
    detail: item.detail,
    documentId: String(item.documentId),
    threadId: item.kind === "chat" && item.threadId ? String(item.threadId) : undefined,
    createdAt: item.createdAt.toISOString(),
  })), [historyQuery.data]);
  const filtered = useMemo(() => storedActivities.filter(item => filter === "all" || item.kind === filter), [storedActivities, filter]);

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111214] shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
      <header className="border-b border-white/[0.08] bg-white/[0.015] px-4 py-4 sm:px-5"><div className="flex items-center gap-2.5"><span className="flex size-8 items-center justify-center rounded-lg bg-white/[0.07] text-white/70"><History className="size-4" /></span><div><p className="text-sm font-medium text-white">Workspace history</p><p className="mt-0.5 text-[11px] text-white/45">Restore a study thread or reopen its source document.</p></div></div><div className="mt-4 flex gap-1.5">{(["all", "document", "chat", "note"] as const).map(item => <Button key={item} variant="ghost" size="sm" onClick={() => setFilter(item)} className={cn("h-7 rounded-md px-2.5 text-[11px] capitalize", filter === item ? "bg-white text-black hover:bg-white/90 hover:text-black" : "text-white/52 hover:bg-white/[0.08] hover:text-white")}>{item}</Button>)}</div></header>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">{historyQuery.isLoading ? <div className="flex h-full min-h-52 items-center justify-center text-xs text-white/45">Loading workspace history…</div> : historyQuery.isError ? <div role="alert" className="flex h-full min-h-52 flex-col items-center justify-center gap-3 text-center"><History className="size-6 text-red-100/60" /><p className="text-sm font-medium text-white/75">History could not be loaded</p><p className="max-w-xs text-xs leading-5 text-white/40">{historyQuery.error.message}</p><Button variant="ghost" size="sm" onClick={() => void historyQuery.refetch()} className="h-8 border border-white/[0.12] px-3 text-xs text-white/70 hover:bg-white/[0.08] hover:text-white">Retry</Button></div> : filtered.length ? <div className="space-y-2">{filtered.map(item => { const Icon = activityIcon[item.kind]; const isThread = item.kind === "chat"; return <article key={item.id} className="group flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.018] p-3 transition-colors hover:border-white/[0.14] hover:bg-white/[0.04]"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-black/20 text-white/55"><Icon className="size-3.5" /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-white/85">{item.title}</p><p className="mt-1 truncate text-[11px] text-white/42">{item.detail} · {formatWorkspaceDate(item.createdAt)}</p></div><Button variant="ghost" size="sm" onClick={() => isThread ? onRestoreThread(item.documentId, item.threadId) : onRestoreDocument(item.documentId)} className="h-7 px-2 text-[11px] text-white/50 opacity-100 hover:bg-white/[0.08] hover:text-white sm:opacity-0 sm:group-hover:opacity-100"><RotateCcw className="mr-1.5 size-3.5" />{isThread ? "Thread" : "Document"}</Button></article>; })}</div> : <div className="flex h-full min-h-52 flex-col items-center justify-center text-center"><History className="size-6 text-white/30" /><p className="mt-3 text-sm font-medium text-white/75">No workspace activity yet</p><p className="mt-1 max-w-xs text-xs leading-5 text-white/40">Open a document, save notes, or start a chat to build your study history.</p></div>}</div>
    </section>
  );
}
