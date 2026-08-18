import { useAuth } from "@/_core/hooks/useAuth";
import { HistoryPanel } from "@/components/workspace/HistoryPanel";
import { AiSettingsDialog } from "@/components/workspace/AiSettingsDialog";
import { NotesWorkspace } from "@/components/workspace/NotesWorkspace";
import { PdfLibrary } from "@/components/workspace/PdfLibrary";
import { PdfViewer } from "@/components/workspace/PdfViewer";
import { StudyChat } from "@/components/workspace/StudyChat";
import { WorkspaceTabs } from "@/components/workspace/WorkspaceTabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useWorkspace, WorkspaceProvider, type LeftWorkspacePanel, type RightWorkspacePanel } from "@/contexts/WorkspaceContext";
import { cn } from "@/lib/utils";
import { startLogin } from "@/const";
import type { LucideIcon } from "lucide-react";
import { BookOpenText, ChevronLeft, ChevronRight, FileText, History, LibraryBig, Loader2, LogOut, PanelLeft, Settings, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import React from "react";

const leftItems: Array<{ id: LeftWorkspacePanel; label: string; icon: LucideIcon }> = [
  { id: "viewer", label: "Reader", icon: FileText },
  { id: "library", label: "Library", icon: LibraryBig },
];

const rightItems: Array<{ id: RightWorkspacePanel; label: string; icon: LucideIcon }> = [
  { id: "notes", label: "Notes", icon: BookOpenText },
  { id: "chat", label: "Assistant", icon: Sparkles },
  { id: "history", label: "History", icon: History },
];

export default function Home() {
  return <WorkspaceProvider><StudyWorkspace /></WorkspaceProvider>;
}

function StudyWorkspace() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const {
    documents,
    activeDocument,
    activeDocumentId,
    activePage,
    activeThreadId,
    leftPanel,
    rightPanel,
    railCollapsed,
    markdown,
    setActivePage,
    setLeftPanel,
    setRightPanel,
    setRailCollapsed,
    setMarkdown,
    saveNote,
    openDocument,
    uploadDocument,
    archiveDocument,
    deleteDocument,
    updatePageCount,
    restoreChatThread,
    documentsError,
    notesError,
    retryDocuments,
    retryNotes,
  } = useWorkspace();

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#0d0e0f]"><Loader2 className="size-5 animate-spin text-white/50" /></div>;
  if (!isAuthenticated) return <main className="flex min-h-screen items-center justify-center bg-[#0d0e0f] p-6 text-white"><section className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#151619] p-7 shadow-2xl"><div className="flex size-10 items-center justify-center rounded-xl bg-white text-sm font-bold text-black">C9</div><h1 className="mt-6 text-2xl font-semibold tracking-tight">Your study workspace is private.</h1><p className="mt-3 text-sm leading-6 text-white/55">Sign in to upload PDFs, create document-linked notes, configure the assistant, and access your private study history.</p><Button onClick={() => startLogin()} className="mt-6 h-10 w-full bg-white text-sm font-semibold text-black hover:bg-white/90">Sign in to continue</Button></section></main>;

  return (
    <div className="min-h-screen bg-[#0d0e0f] text-white">
      <div className="flex min-h-screen">
        <aside className={cn("relative hidden shrink-0 border-r border-white/[0.08] bg-[#101113] px-3 py-4 transition-[width] duration-200 md:flex md:flex-col", railCollapsed ? "w-[72px]" : "w-[214px]")}>
          <div className="flex items-center gap-2.5 px-1.5"><div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-bold tracking-tight text-black">C9</div>{!railCollapsed ? <div className="min-w-0"><p className="truncate text-sm font-semibold tracking-tight text-white">C-Nine</p><p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-white/35">Study workspace</p></div> : null}</div>
          <div className="mt-8 space-y-1">{leftItems.map(item => <RailButton key={item.id} item={item} active={leftPanel === item.id} collapsed={railCollapsed} onClick={() => setLeftPanel(item.id)} />)}</div>
          <div className="mt-7 border-t border-white/[0.08] pt-5"><p className={cn("mb-2 px-2.5 text-[10px] font-medium uppercase tracking-[0.15em] text-white/30", railCollapsed && "hidden")}>Workspace</p>{rightItems.map(item => <RailButton key={item.id} item={item} active={rightPanel === item.id} collapsed={railCollapsed} onClick={() => setRightPanel(item.id)} subtle />)}</div>
          <div className="mt-auto space-y-2"><button onClick={() => setSettingsOpen(true)} className={cn("flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-xs text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white/80", railCollapsed && "justify-center px-0")}><Settings className="size-3.5" />{!railCollapsed ? <span>Settings</span> : null}</button><div className={cn("flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.025] p-2", railCollapsed && "justify-center p-1.5")}><Avatar className="size-6 border border-white/[0.12]"><AvatarFallback className="bg-white/[0.08] text-[10px] text-white">{user?.name?.slice(0, 1).toUpperCase() ?? "U"}</AvatarFallback></Avatar>{!railCollapsed ? <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-medium text-white/80">{user?.name ?? "Study account"}</p><p className="truncate text-[10px] text-white/38">Private workspace</p></div> : null}{!railCollapsed ? <button onClick={logout} className="text-white/35 hover:text-white" aria-label="Sign out"><LogOut className="size-3.5" /></button> : null}</div></div>
          <button onClick={() => setRailCollapsed(value => !value)} className="absolute -right-3 top-5 hidden size-6 items-center justify-center rounded-full border border-white/[0.12] bg-[#18191c] text-white/45 shadow-lg hover:text-white md:flex" aria-label="Collapse navigation">{railCollapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}</button>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex min-h-16 items-center justify-between gap-3 border-b border-white/[0.08] bg-[#0d0e0f]/90 px-4 backdrop-blur sm:px-6"><div className="flex min-w-0 items-center gap-3"><button onClick={() => setRailCollapsed(value => !value)} className="flex size-8 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.025] text-white/60 hover:bg-white/[0.08] hover:text-white md:hidden" aria-label="Toggle navigation"><PanelLeft className="size-4" /></button><div className="min-w-0"><p className="truncate text-sm font-medium text-white">{activeDocument?.filename ?? "Select a document"}</p><p className="mt-0.5 truncate text-[11px] text-white/40">Private workspace · session protected</p></div></div>{activeDocument ? <span className="hidden rounded-full border border-emerald-300/15 bg-emerald-300/[0.07] px-2 py-1 text-[10px] font-medium text-emerald-100/75 sm:inline-flex">Page {activePage} context</span> : null}</header>
          {documentsError ? <div role="alert" className="mx-3 mt-3 flex items-center justify-between gap-3 rounded-xl border border-red-300/15 bg-red-300/[0.06] px-4 py-3 text-xs text-red-100/85 sm:mx-5"><span>Unable to load your document library. {documentsError}</span><Button variant="ghost" size="sm" onClick={retryDocuments} className="h-7 shrink-0 px-2 text-xs text-red-100 hover:bg-red-100/10 hover:text-red-50">Retry</Button></div> : null}
          <div className="flex min-h-0 flex-1 flex-col gap-4 p-3 sm:p-4 lg:flex-row lg:gap-4 lg:p-5">
            <section className="flex min-h-[450px] min-w-0 flex-[1.04] flex-col gap-2 lg:min-h-0"><WorkspaceTabs items={leftItems} active={leftPanel} onSelect={setLeftPanel} label={leftPanel === "viewer" ? "Reader" : "Library"} />{leftPanel === "viewer" ? <PdfViewer document={activeDocument} page={activePage} onPageChange={setActivePage} onPageCountResolved={updatePageCount} /> : <PdfLibrary documents={documents} activeDocumentId={activeDocumentId} onOpen={openDocument} onUpload={uploadDocument} onArchive={archiveDocument} onDelete={deleteDocument} />}</section>
            <section className="flex min-h-[500px] min-w-0 flex-1 flex-col gap-2 lg:min-h-0"><WorkspaceTabs items={rightItems} active={rightPanel} onSelect={setRightPanel} label={rightPanel} />{rightPanel === "notes" ? <NotesWorkspace markdown={markdown} documentName={activeDocument?.filename} activePage={activePage} errorMessage={notesError} onRetry={retryNotes} onChange={setMarkdown} onSave={saveNote} /> : null}{rightPanel === "chat" ? <StudyChat documentName={activeDocument?.filename} documentId={activeDocumentId} activePage={activePage} threadId={activeThreadId} /> : null}{rightPanel === "history" ? <HistoryPanel onRestoreDocument={openDocument} onRestoreThread={restoreChatThread} /> : null}</section>
          </div>
        </main>
      </div>
      <AiSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

function RailButton({ item, active, collapsed, onClick, subtle = false }: { item: { label: string; icon: LucideIcon }; active: boolean; collapsed: boolean; onClick: () => void; subtle?: boolean }) {
  const Icon = item.icon;
  return <Tooltip><TooltipTrigger asChild><button onClick={onClick} className={cn("flex h-10 w-full items-center gap-3 rounded-lg px-2.5 text-left text-xs transition-colors", active ? subtle ? "bg-white/[0.09] text-white" : "bg-white text-black" : "text-white/55 hover:bg-white/[0.07] hover:text-white", collapsed && "justify-center px-0")}><Icon className="size-4 shrink-0" />{!collapsed ? <span>{item.label}</span> : null}</button></TooltipTrigger><TooltipContent side="right" className={cn(!collapsed && "hidden")}>{item.label}</TooltipContent></Tooltip>;
}
