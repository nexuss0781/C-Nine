import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { WorkspaceDocument } from "@/lib/workspace";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ChevronLeft,
  ChevronRight,
  Expand,
  FileWarning,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  ScanLine,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import type { DocumentInitParameters } from "pdfjs-dist/types/src/display/api";
import { useEffect, useRef, useState } from "react";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type PdfViewerProps = {
  document?: WorkspaceDocument;
  page: number;
  onPageChange: (page: number) => void;
  onPageCountResolved: (documentId: string, pageCount: number) => void;
};

export function PdfViewer({
  document,
  page,
  onPageChange,
  onPageCountResolved,
}: PdfViewerProps) {
  const { isAuthenticated } = useAuth();
  const numericDocumentId = Number(document?.id);
  const fileAccessQuery = trpc.documents.fileAccess.useQuery({ documentId: numericDocumentId || 1 }, { enabled: isAuthenticated && Number.isInteger(numericDocumentId) && numericDocumentId > 0 });
  const documentUrl = isAuthenticated ? fileAccessQuery.data?.url : document?.previewUrl;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [pdfDocument, setPdfDocument] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [zoom, setZoom] = useState(1.15);
  const [loading, setLoading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const totalPages = pdfDocument?.numPages ?? document?.pageCount ?? 0;

  useEffect(() => {
    let disposed = false;
    let loadingTask: ReturnType<typeof pdfjsLib.getDocument> | undefined;

    async function loadDocument() {
      setPdfDocument(null);
      setError(null);
      if (!document || !documentUrl) return;

      setLoading(true);
      try {
        const source: DocumentInitParameters = { url: documentUrl };
        loadingTask = pdfjsLib.getDocument(source);
        const loadedDocument = await loadingTask.promise;
        if (disposed) return;
        setPdfDocument(loadedDocument);
        onPageCountResolved(document.id, loadedDocument.numPages);
        if (page > loadedDocument.numPages) onPageChange(loadedDocument.numPages);
      } catch {
        if (!disposed) setError("This PDF could not be rendered. Try uploading it again.");
      } finally {
        if (!disposed) setLoading(false);
      }
    }

    void loadDocument();
    return () => {
      disposed = true;
      loadingTask?.destroy();
    };
  }, [document?.id, documentUrl]);

  useEffect(() => {
    let cancelled = false;
    async function renderPage() {
      if (!pdfDocument || !canvasRef.current) return;
      setRendering(true);
      setError(null);
      try {
        const pdfPage = await pdfDocument.getPage(page);
        const viewport = pdfPage.getViewport({ scale: zoom });
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        if (!context || cancelled) return;
        const devicePixelRatio = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * devicePixelRatio);
        canvas.height = Math.floor(viewport.height * devicePixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        await pdfPage.render({
          canvas,
          canvasContext: context,
          viewport,
          transform: [devicePixelRatio, 0, 0, devicePixelRatio, 0, 0],
        }).promise;
      } catch {
        if (!cancelled) setError("The selected page could not be rendered.");
      } finally {
        if (!cancelled) setRendering(false);
      }
    }
    void renderPage();
    return () => {
      cancelled = true;
    };
  }, [pdfDocument, page, zoom]);

  const setSafePage = (value: number) => {
    if (!totalPages) return;
    onPageChange(Math.min(Math.max(value, 1), totalPages));
  };

  const fitPage = async (mode: "width" | "page") => {
    if (!pdfDocument || !surfaceRef.current) return;
    const pdfPage = await pdfDocument.getPage(page);
    const baseViewport = pdfPage.getViewport({ scale: 1 });
    const bounds = surfaceRef.current.getBoundingClientRect();
    const widthScale = Math.max(0.65, (bounds.width - 72) / baseViewport.width);
    const heightScale = Math.max(0.65, (bounds.height - 72) / baseViewport.height);
    setZoom(Math.min(2.25, mode === "width" ? widthScale : Math.min(widthScale, heightScale)));
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111214] shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
      <header className="flex min-h-16 items-center justify-between gap-3 border-b border-white/[0.08] bg-white/[0.015] px-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{document?.filename ?? "No document selected"}</p>
          <p className="mt-0.5 text-xs text-white/45">
            {document ? `${totalPages || "—"} pages · ${document.status}` : "Select a document from your library"}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:bg-white/[0.08] hover:text-white" onClick={() => setZoom(value => Math.max(0.65, value - 0.15))} aria-label="Zoom out">
            <Minus className="size-4" />
          </Button>
          <span className="w-10 text-center font-mono text-[11px] text-white/55">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:bg-white/[0.08] hover:text-white" onClick={() => setZoom(value => Math.min(2.25, value + 0.15))} aria-label="Zoom in">
            <Plus className="size-4" />
          </Button>
          <span className="mx-1 h-4 w-px bg-white/[0.1]" />
          <Button variant="ghost" size="sm" className="h-8 px-2 text-[11px] text-white/65 hover:bg-white/[0.08] hover:text-white" onClick={() => void fitPage("width")}>
            Fit width
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-[11px] text-white/65 hover:bg-white/[0.08] hover:text-white" onClick={() => void fitPage("page")}>
            Fit page
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden w-16 shrink-0 border-r border-white/[0.08] bg-black/15 py-3 sm:block">
          <div className="mb-3 flex items-center justify-center text-[10px] font-medium uppercase tracking-[0.14em] text-white/35">Pages</div>
          <div className="h-full space-y-2 overflow-y-auto px-2 pb-6">
            {Array.from({ length: totalPages || 5 }, (_, index) => index + 1).map(item => (
              <button
                key={item}
                onClick={() => setSafePage(item)}
                className={cn(
                  "flex h-10 w-full items-center justify-center rounded-md border text-[10px] font-mono transition-colors",
                  item === page
                    ? "border-white/35 bg-white text-black"
                    : "border-white/[0.08] bg-white/[0.025] text-white/45 hover:border-white/20 hover:text-white"
                )}
                aria-label={`Open page ${item}`}
              >
                {item}
              </button>
            ))}
          </div>
        </aside>

        <div ref={surfaceRef} className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[#090a0b] p-7 sm:p-10">
          {loading || rendering ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#090a0b]/70 backdrop-blur-[1px]">
              <Loader2 className="size-5 animate-spin text-white/60" />
              <span className="text-xs text-white/50">{loading ? "Opening document" : "Rendering page"}</span>
            </div>
          ) : null}
          {error ? (
            <div className="flex max-w-sm flex-col items-center gap-3 rounded-xl border border-red-300/15 bg-red-300/[0.05] p-6 text-center">
              <FileWarning className="size-6 text-red-200/70" />
              <p className="text-sm font-medium text-white/85">Unable to display this page</p>
              <p className="text-xs leading-5 text-white/50">{error}</p>
            </div>
          ) : documentUrl ? (
            <canvas ref={canvasRef} className="max-w-none rounded-sm bg-white shadow-[0_20px_50px_rgba(0,0,0,0.55)]" />
          ) : document ? (
            <div className="relative w-full max-w-[560px] overflow-hidden rounded-sm bg-[#f2f0ea] px-9 py-12 text-[#282725] shadow-[0_20px_50px_rgba(0,0,0,0.55)] sm:px-14 sm:py-16">
              <div className="absolute inset-x-0 top-0 h-1 bg-[#1d1d1c]" />
              <div className="mb-10 flex items-center justify-between border-b border-[#282725]/15 pb-4 text-[10px] uppercase tracking-[0.18em] text-[#282725]/55">
                <span>Reading preview</span><span>Page {page}</span>
              </div>
              <h2 className="max-w-sm font-serif text-3xl font-medium tracking-tight">Upload a PDF to begin active reading.</h2>
              <p className="mt-6 max-w-md text-sm leading-7 text-[#282725]/65">The viewer is ready for a signed-in user's document. The library validates PDF files and limits web uploads to 30 MB before a document is sent to protected storage.</p>
              <div className="mt-11 space-y-3">
                <div className="h-2 w-full rounded-full bg-[#282725]/10" />
                <div className="h-2 w-[88%] rounded-full bg-[#282725]/10" />
                <div className="h-2 w-[95%] rounded-full bg-[#282725]/10" />
                <div className="h-2 w-[61%] rounded-full bg-[#282725]/10" />
              </div>
              <div className="mt-14 border-t border-[#282725]/15 pt-4 text-right font-mono text-[10px] text-[#282725]/50">C-NINE STUDY WORKSPACE</div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center text-white/45">
              <ScanLine className="size-8 stroke-[1.2]" />
              <p className="text-sm">Open a document to start reading.</p>
            </div>
          )}
        </div>
      </div>

      <footer className="flex min-h-14 items-center justify-between gap-3 border-t border-white/[0.08] bg-white/[0.015] px-4">
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:bg-white/[0.08] hover:text-white" onClick={() => setSafePage(page - 1)} disabled={page <= 1} aria-label="Previous page"><ChevronLeft className="size-4" /></Button>
          <div className="flex items-center gap-1 text-xs text-white/55">
            <span>Page</span>
            <Input value={page} inputMode="numeric" onChange={event => setSafePage(Number(event.target.value) || 1)} className="h-7 w-10 border-white/[0.12] bg-black/20 px-1 text-center font-mono text-xs text-white focus-visible:ring-white/35" aria-label="Current page" />
            <span>of {totalPages || "—"}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:bg-white/[0.08] hover:text-white" onClick={() => setSafePage(page + 1)} disabled={!totalPages || page >= totalPages} aria-label="Next page"><ChevronRight className="size-4" /></Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/55 hover:bg-white/[0.08] hover:text-white" onClick={() => setZoom(1.15)} aria-label="Reset zoom"><RotateCcw className="size-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/55 hover:bg-white/[0.08] hover:text-white" aria-label="Open full screen placeholder"><Expand className="size-3.5" /></Button>
        </div>
      </footer>
    </section>
  );
}
