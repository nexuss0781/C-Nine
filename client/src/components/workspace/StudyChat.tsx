import { AIChatBox, type Message } from "@/components/AIChatBox";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { FileText, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

type StudyChatProps = {
  documentName?: string;
  documentId?: string;
  activePage: number;
  threadId?: string;
};

export function StudyChat({ documentName, documentId, activePage, threadId }: StudyChatProps) {
  const { isAuthenticated } = useAuth();
  const numericDocumentId = Number(documentId);
  const [storedThreadId, setStoredThreadId] = useState<number | undefined>(() => Number(threadId) || undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [retryPrompt, setRetryPrompt] = useState<string | null>(null);
  const [streamingLabel, setStreamingLabel] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messageQuery = trpc.chat.messages.useQuery({ threadId: storedThreadId ?? 1 }, { enabled: isAuthenticated && Boolean(storedThreadId) });
  const chatMutation = trpc.ai.chat.useMutation();

  useEffect(() => {
    setStoredThreadId(Number(threadId) || undefined);
  }, [threadId]);

  useEffect(() => {
    if (!messageQuery.data) return;
    setMessages(messageQuery.data.map(message => ({ role: message.role, content: message.content })));
  }, [messageQuery.data]);

  const send = (content: string) => {
    setMessages(previous => [...previous, { role: "user", content }]);
    setLoading(true);
    setRetryPrompt(null);
    setErrorMessage(null);
    setStreamingLabel("Reading the active page context…");
    window.setTimeout(() => setStreamingLabel("Drafting a page-aware response…"), 250);
    if (isAuthenticated && Number.isInteger(numericDocumentId) && numericDocumentId > 0) {
      chatMutation.mutate({ documentId: numericDocumentId, threadId: storedThreadId, pageNumber: activePage, message: content }, {
        onSuccess: async response => {
          setStoredThreadId(response.threadId);
          setMessages(previous => [...previous, { role: "assistant", content: response.content }]);
          setLoading(false);
          setStreamingLabel(null);
          await messageQuery.refetch();
        },
        onError: error => {
          setLoading(false);
          setStreamingLabel(null);
          setRetryPrompt(content);
          setErrorMessage(error.message);
        },
      });
      return;
    }
    setLoading(false);
    setStreamingLabel(null);
    setRetryPrompt(content);
    setErrorMessage("Select a document before sending a question.");
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111214] shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
      <header className="border-b border-white/[0.08] bg-white/[0.015] px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-2.5"><span className="flex size-8 items-center justify-center rounded-lg bg-white/[0.07] text-white/70"><Sparkles className="size-4" /></span><div><p className="text-sm font-medium text-white">Document assistant</p><p className="mt-0.5 text-[11px] text-white/45">Assistant context is constrained to your selected document.</p></div></div>
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/[0.09] bg-black/20 px-3 py-2 text-[11px] text-white/55"><FileText className="size-3.5 text-white/65" /><span className="truncate">{documentName ?? "No document selected"}</span><span className="ml-auto shrink-0 font-mono text-white/45">PAGE {activePage}</span></div>
        {threadId ? <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.11em] text-white/34">Restored thread · {threadId}</p> : null}
      </header>
      {messageQuery.isError ? <div role="alert" className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center"><Sparkles className="size-7 stroke-[1.25] text-red-100/70" /><p className="text-sm font-medium text-white/75">Conversation could not be loaded</p><p className="max-w-xs text-xs leading-5 text-white/40">{messageQuery.error.message}</p><Button variant="ghost" size="sm" onClick={() => void messageQuery.refetch()} className="h-8 border border-white/[0.12] px-3 text-xs text-white/70 hover:bg-white/[0.08] hover:text-white">Retry</Button></div> : <AIChatBox messages={messages} onSendMessage={send} isLoading={loading} height="100%" className="min-h-0 flex-1 rounded-none border-0 bg-transparent shadow-none" placeholder={documentId ? "Ask about this page…" : "Select a document to begin"} suggestedPrompts={documentId ? ["Explain the central idea on this page", "Make three retrieval questions", "Compare this page to the prior section"] : []} />}
      {streamingLabel ? <div role="status" className="border-t border-white/[0.08] bg-white/[0.025] px-4 py-2.5 text-xs text-white/52"><span className="mr-2 inline-block size-1.5 animate-pulse rounded-full bg-white/70" />{streamingLabel}</div> : null}
      {retryPrompt && errorMessage ? <div role="alert" className="flex items-center justify-between gap-3 border-t border-amber-300/15 bg-amber-300/[0.05] px-4 py-2.5 text-xs text-amber-100/80"><span>{errorMessage}</span>{documentId ? <Button variant="ghost" size="sm" onClick={() => send(retryPrompt)} className="h-7 px-2 text-xs text-amber-100 hover:bg-amber-100/10 hover:text-amber-50"><RefreshCw className="mr-1.5 size-3.5" />Retry</Button> : null}</div> : null}
    </section>
  );
}
