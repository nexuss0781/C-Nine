import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import DOMPurify from "dompurify";
import mermaid from "mermaid";
import { BookOpenText, Code2, Edit3, Eye, Save, TriangleAlert } from "lucide-react";
import { useEffect, useId, useState } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";

type NotesWorkspaceProps = {
  markdown: string;
  documentName?: string;
  activePage: number;
  onChange: (value: string) => void;
  onSave?: (value: string) => void;
};

mermaid.initialize({
  startOnLoad: false,
  securityLevel: "strict",
  theme: "dark",
  themeVariables: {
    primaryColor: "#f2f2f2",
    primaryTextColor: "#111214",
    primaryBorderColor: "#858585",
    lineColor: "#a0a0a0",
    secondaryColor: "#202124",
    tertiaryColor: "#151619",
  },
});

function MermaidDiagram({ chart }: { chart: string }) {
  const id = `c-nine-mermaid-${useId().replace(/:/g, "")}`;
  const [markup, setMarkup] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      try {
        setError(null);
        const rendered = await mermaid.render(id, chart.trim());
        if (!cancelled) {
          setMarkup(DOMPurify.sanitize(rendered.svg, { USE_PROFILES: { svg: true, svgFilters: true } }));
        }
      } catch {
        if (!cancelled) setError("This Mermaid block has invalid syntax.");
      }
    }
    void render();
    return () => { cancelled = true; };
  }, [chart, id]);

  if (error) {
    return <div className="my-5 flex items-center gap-2 rounded-lg border border-amber-300/20 bg-amber-300/[0.06] px-3 py-3 text-xs text-amber-100/80"><TriangleAlert className="size-4 shrink-0" />{error}</div>;
  }
  return <div className="my-5 overflow-x-auto rounded-xl border border-white/[0.1] bg-black/20 p-4 [&_svg]:mx-auto [&_svg]:min-w-[420px]" dangerouslySetInnerHTML={{ __html: markup }} />;
}

export function NotesWorkspace({ markdown, documentName, activePage, onChange, onSave }: NotesWorkspaceProps) {
  const [editing, setEditing] = useState(false);
  const [savedAt, setSavedAt] = useState("just now");

  const save = () => {
    onSave?.(markdown);
    setSavedAt("just now");
    setEditing(false);
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111214] shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-white/[0.015] px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5"><span className="flex size-8 items-center justify-center rounded-lg bg-white/[0.07] text-white/70"><BookOpenText className="size-4" /></span><div className="min-w-0"><p className="truncate text-sm font-medium text-white">Study notes</p><p className="mt-0.5 truncate text-[11px] text-white/45">Linked to {documentName ?? "the selected document"} · page {activePage} · saved {savedAt}</p></div></div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)} className="h-8 px-2.5 text-xs text-white/60 hover:bg-white/[0.08] hover:text-white"><Eye className="mr-1.5 size-3.5" />Preview</Button>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="h-8 px-2.5 text-xs text-white/60 hover:bg-white/[0.08] hover:text-white"><Edit3 className="mr-1.5 size-3.5" />Edit</Button>
          {editing ? <Button size="sm" onClick={save} className="h-8 bg-white px-2.5 text-xs text-black hover:bg-white/90"><Save className="mr-1.5 size-3.5" />Save</Button> : null}
        </div>
      </header>
      {editing ? (
        <div className="flex min-h-0 flex-1 flex-col p-4"><div className="mb-3 flex items-center gap-2 text-[11px] text-white/45"><Code2 className="size-3.5" /> CommonMark and Mermaid fenced blocks are supported.</div><Textarea value={markdown} onChange={event => onChange(event.target.value)} className="min-h-0 flex-1 resize-none border-white/[0.1] bg-black/20 p-4 font-mono text-xs leading-6 text-white/80 placeholder:text-white/30 focus-visible:ring-white/35" /></div>
      ) : (
        <div className="workspace-markdown min-h-0 flex-1 overflow-y-auto px-5 py-6 text-sm leading-7 text-white/72 sm:px-7"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml urlTransform={defaultUrlTransform} components={{ a({ href, children, ...props }) { return <a href={href} target="_blank" rel="noreferrer" {...props}>{children}</a>; }, code({ className, children, ...props }) { const isMermaid = /language-mermaid/.test(className ?? ""); return isMermaid ? <MermaidDiagram chart={String(children).replace(/\n$/, "")} /> : <code className={className} {...props}>{children}</code>; } }}>{markdown}</ReactMarkdown></div>
      )}
    </section>
  );
}
