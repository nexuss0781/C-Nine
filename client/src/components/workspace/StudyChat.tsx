import { AIChatBox, type Message } from "@/components/AIChatBox";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { FileText, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type StudyChatProps = {
  documentName?: string;
  documentId?: string;
  activePage: number;
  threadId?: string;
};

const initialMessages: Message[] = [
  { role: "assistant", content: "I’m ready to help you study this document. Ask about the active page, request a short explanation, or turn a section into retrieval questions." },
];

export function StudyChat({ documentName, documentId, activePage, threadId }: StudyChatProps) {
  const { isAuthenticated } = useAuth();
  const numericDocumentId = Number(documentId);
  const [storedThreadId, setStoredThreadId] = useState<number | undefined>(() => Number(threadId) || undefined);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
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

    window.setTimeout(() => {
      setLoading(false);
      setStreamingLabel(null);
      if (content.toLowerCase().includes("retry")) {
        setRetryPrompt(content);
        setErrorMessage("The assistant response did not complete. You can try the same prompt again.");
        return;
      }
      setMessages(previous => [...previous, { role: "assistant", content: `Working from **${documentName ?? "the selected document"}**, page **${activePage}**: this is a frontend preview response. The production AI route will use the authenticated user’s selected model together with bounded document text and active-page context.` }]);
    }, 700);
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111214] shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
      <header className="border-b border-white/[0.08] bg-white/[0.015] px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-2.5"><span className="flex size-8 items-center justify-center rounded-lg bg-white/[0.07] text-white/70"><Sparkles className="size-4" /></span><div><p className="text-sm font-medium text-white">Document assistant</p><p className="mt-0.5 text-[11px] text-white/45">Assistant context is constrained to your selected document.</p></div></div>
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/[0.09] bg-black/20 px-3 py-2 text-[11px] text-white/55"><FileText className="size-3.5 text-white/65" /><span className="truncate">{documentName ?? "No document selected"}</span><span className="ml-auto shrink-0 font-mono text-white/45">PAGE {activePage}</span></div>
        {threadId ? <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.11em] text-white/34">Restored thread · {threadId}</p> : null}
      </header>
      <AIChatBox messages={messages} onSendMessage={send} isLoading={loading} height="100%" className="min-h-0 flex-1 rounded-none border-0 bg-transparent shadow-none" placeholder="Ask about this page…" suggestedPrompts={["Explain the central idea on this page", "Make three retrieval questions", "Compare this page to the prior section"]} />
      {streamingLabel ? <div role="status" className="border-t border-white/[0.08] bg-white/[0.025] px-4 py-2.5 text-xs text-white/52"><span className="mr-2 inline-block size-1.5 animate-pulse rounded-full bg-white/70" />{streamingLabel}</div> : null}
      {retryPrompt && errorMessage ? <div role="alert" className="flex items-center justify-between gap-3 border-t border-amber-300/15 bg-amber-300/[0.05] px-4 py-2.5 text-xs text-amber-100/80"><span>{errorMessage}</span><Button variant="ghost" size="sm" onClick={() => { if (!isAuthenticated) toast.message("Sign in and configure the assistant to use a live AI model."); send(retryPrompt.replace(/^retry\s*/i, "")); }} className="h-7 px-2 text-xs text-amber-100 hover:bg-amber-100/10 hover:text-amber-50"><RefreshCw className="mr-1.5 size-3.5" />Retry</Button></div> : null}
    </section>
  );
}
