import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatBytes, formatWorkspaceDate, type WorkspaceDocument } from "@/lib/workspace";
import React from "react";
import {
  Archive,
  ArrowDownAZ,
  FileText,
  FolderOpen,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type PdfLibraryProps = {
  documents: WorkspaceDocument[];
  activeDocumentId?: string;
  onOpen: (documentId: string) => void;
  onUpload: (file: File) => void;
  onArchive: (documentId: string) => void;
  onDelete: (documentId: string) => void;
};

const MAX_FILE_SIZE = 30 * 1024 * 1024;

export function PdfLibrary({ documents, activeDocumentId, onOpen, onUpload, onArchive, onDelete }: PdfLibraryProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | WorkspaceDocument["status"]>("all");
  const [sort, setSort] = useState<"newest" | "name" | "size">("newest");
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredDocuments = useMemo(() => {
    const items = documents.filter(document => {
      const searchMatch = document.filename.toLowerCase().includes(query.trim().toLowerCase());
      const statusMatch = statusFilter === "all" || document.status === statusFilter;
      return searchMatch && statusMatch;
    });
    return items.sort((a, b) => {
      if (sort === "name") return a.filename.localeCompare(b.filename);
      if (sort === "size") return b.sizeBytes - a.sizeBytes;
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
    });
  }, [documents, query, sort, statusFilter]);

  const addFile = (file?: File) => {
    if (!file) return;
    const fileName = file.name.toLowerCase();
    if (file.type !== "application/pdf" || !fileName.endsWith(".pdf")) {
      toast.error("Only PDF files can be added to the study library.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("This PDF is larger than the 30 MB web upload limit.");
      return;
    }
    onUpload(file);
  };

  const statusStyle: Record<WorkspaceDocument["status"], string> = {
    ready: "border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-100/80",
    processing: "border-amber-300/20 bg-amber-300/[0.08] text-amber-100/80",
    failed: "border-red-300/20 bg-red-300/[0.08] text-red-100/80",
    archived: "border-white/[0.12] bg-white/[0.04] text-white/45",
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111214] shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
      <header className="border-b border-white/[0.08] px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">PDF library</h2>
            <p className="mt-1 text-xs text-white/45">Private documents scoped to the signed-in workspace.</p>
          </div>
          <Button onClick={() => inputRef.current?.click()} className="h-9 bg-white px-3 text-xs font-semibold text-black hover:bg-white/90">
            <UploadCloud className="mr-1.5 size-3.5" /> Add PDF
          </Button>
          <input ref={inputRef} className="hidden" type="file" accept="application/pdf,.pdf" onChange={event => addFile(event.target.files?.[0])} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <label className="flex h-9 min-w-[170px] flex-1 items-center gap-2 rounded-lg border border-white/[0.1] bg-black/20 px-3 text-white/60 focus-within:border-white/25">
            <Search className="size-3.5" />
            <Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search documents" className="h-auto border-0 bg-transparent p-0 text-xs text-white placeholder:text-white/35 focus-visible:ring-0" />
          </label>
          <Button variant="ghost" size="sm" className="h-9 border border-white/[0.1] bg-white/[0.025] px-3 text-xs text-white/65 hover:bg-white/[0.08] hover:text-white" onClick={() => setStatusFilter(value => value === "all" ? "ready" : value === "ready" ? "processing" : "all")}>
            <SlidersHorizontal className="mr-1.5 size-3.5" /> {statusFilter === "all" ? "All states" : statusFilter}
          </Button>
          <Button variant="ghost" size="sm" className="h-9 border border-white/[0.1] bg-white/[0.025] px-3 text-xs text-white/65 hover:bg-white/[0.08] hover:text-white" onClick={() => setSort(value => value === "newest" ? "name" : value === "name" ? "size" : "newest")}>
            <ArrowDownAZ className="mr-1.5 size-3.5" /> {sort === "newest" ? "Newest" : sort === "name" ? "Name" : "Size"}
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragEnter={event => { event.preventDefault(); setDragActive(true); }}
          onDragOver={event => { event.preventDefault(); setDragActive(true); }}
          onDragLeave={event => { event.preventDefault(); setDragActive(false); }}
          onDrop={event => { event.preventDefault(); setDragActive(false); addFile(event.dataTransfer.files?.[0]); }}
          className={cn(
            "mb-4 flex w-full items-center justify-between gap-4 rounded-xl border border-dashed px-4 py-4 text-left transition-colors",
            dragActive ? "border-white/55 bg-white/[0.08]" : "border-white/[0.14] bg-white/[0.018] hover:border-white/30 hover:bg-white/[0.04]"
          )}
        >
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-white/[0.08] text-white/75"><UploadCloud className="size-4" /></span>
            <span><span className="block text-xs font-medium text-white/85">Drop a PDF here</span><span className="mt-0.5 block text-[11px] text-white/45">or select a file · PDF only · 30 MB maximum</span></span>
          </div>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-white/35 sm:block">Secure intake</span>
        </button>

        {filteredDocuments.length ? (
          <div className="space-y-2">
            {filteredDocuments.map(document => (
              <article key={document.id} className={cn("group flex items-center gap-3 rounded-xl border p-3 transition-colors", activeDocumentId === document.id ? "border-white/28 bg-white/[0.075]" : "border-white/[0.07] bg-white/[0.018] hover:border-white/[0.15] hover:bg-white/[0.04]")}>
                <button type="button" onClick={() => onOpen(document.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-black/20 text-white/55"><FileText className="size-4" /></span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-white/90">{document.filename}</span>
                    <span className="mt-1 block text-[11px] text-white/43">{formatBytes(document.sizeBytes)} · {document.pageCount || "—"} pages · {formatWorkspaceDate(document.uploadedAt)} · {document.source}</span>
                  </span>
                </button>
                <Badge variant="outline" className={cn("hidden border px-2 py-0.5 text-[10px] font-medium capitalize sm:inline-flex", statusStyle[document.status])}>{document.status}</Badge>
                <div className="flex items-center gap-1 opacity-90 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                  <Button variant="ghost" size="icon" onClick={() => onArchive(document.id)} className="h-7 w-7 text-white/45 hover:bg-white/[0.09] hover:text-white" aria-label={`Archive ${document.filename}`}><Archive className="size-3.5" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(document.id)} className="h-7 w-7 text-white/45 hover:bg-red-300/[0.08] hover:text-red-100" aria-label={`Delete ${document.filename}`}><Trash2 className="size-3.5" /></Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.1] bg-white/[0.012] p-6 text-center">
            <FolderOpen className="size-6 text-white/30" />
            <p className="mt-3 text-sm font-medium text-white/75">No matching documents</p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-white/40">Try a different search, reset the filter, or add a PDF to this private workspace.</p>
          </div>
        )}
      </div>
      <footer className="flex h-11 items-center justify-between border-t border-white/[0.08] px-4 text-[10px] text-white/40"><span>{documents.length} document{documents.length === 1 ? "" : "s"} in library</span><span className="flex items-center gap-1"><MoreHorizontal className="size-3" /> Secure workspace storage</span></footer>
    </section>
  );
}
