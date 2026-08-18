import {
  demoDocuments,
  demoNotes,
  type WorkspaceDocument,
} from "@/lib/workspace";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export type LeftWorkspacePanel = "viewer" | "library";
export type RightWorkspacePanel = "notes" | "chat" | "history";

type WorkspaceContextValue = {
  documents: WorkspaceDocument[];
  activeDocument?: WorkspaceDocument;
  activeDocumentId?: string;
  activePage: number;
  leftPanel: LeftWorkspacePanel;
  rightPanel: RightWorkspacePanel;
  railCollapsed: boolean;
  markdown: string;
  activeThreadId?: string;
  setActivePage: (page: number) => void;
  setLeftPanel: (panel: LeftWorkspacePanel) => void;
  setRightPanel: (panel: RightWorkspacePanel) => void;
  setRailCollapsed: (collapsed: boolean | ((current: boolean) => boolean)) => void;
  setMarkdown: (markdown: string) => void;
  saveNote: () => void;
  openDocument: (documentId: string) => void;
  uploadDocument: (file: File) => void;
  archiveDocument: (documentId: string) => void;
  deleteDocument: (documentId: string) => void;
  updatePageCount: (documentId: string, pageCount: number) => void;
  restoreChatThread: (documentId: string, threadId?: string) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

type StoredDocument = {
  id: number;
  filename: string;
  storageUrl: string;
  sizeBytes: number;
  pageCount: number;
  status: WorkspaceDocument["status"] | "uploaded";
  source: WorkspaceDocument["source"];
  createdAt: Date;
};

function toWorkspaceDocument(document: StoredDocument): WorkspaceDocument {
  return {
    id: String(document.id),
    filename: document.filename,
    previewUrl: document.storageUrl,
    sizeBytes: document.sizeBytes,
    pageCount: document.pageCount,
    status: document.status === "uploaded" ? "processing" : document.status,
    source: document.source,
    uploadedAt: document.createdAt.toISOString(),
  };
}

function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The PDF could not be read in this browser."));
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result.split(",")[1] : undefined;
      if (!value) reject(new Error("The PDF could not be encoded for upload."));
      else resolve(value);
    };
    reader.readAsDataURL(file);
  });
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [documents, setDocuments] = useState<WorkspaceDocument[]>(demoDocuments);
  const [activeDocumentId, setActiveDocumentId] = useState<string | undefined>(demoDocuments[0]?.id);
  const [activePage, setActivePage] = useState(1);
  const [leftPanel, setLeftPanel] = useState<LeftWorkspacePanel>("viewer");
  const [rightPanel, setRightPanel] = useState<RightWorkspacePanel>("notes");
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [notesByDocument, setNotesByDocument] = useState<Record<string, string>>(
    () => Object.fromEntries(demoDocuments.map(document => [document.id, demoNotes]))
  );
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>();
  const activeDocument = documents.find(item => item.id === activeDocumentId);
  const markdown = activeDocumentId ? notesByDocument[activeDocumentId] ?? demoNotes : demoNotes;
  const activeDocumentNumber = Number(activeDocumentId);
  const documentListQuery = trpc.documents.list.useQuery(undefined, { enabled: isAuthenticated });
  const noteInput = useMemo(() => ({ documentId: activeDocumentNumber || 1 }), [activeDocumentNumber]);
  const noteQuery = trpc.notes.get.useQuery(noteInput, { enabled: isAuthenticated && Number.isInteger(activeDocumentNumber) && activeDocumentNumber > 0 });
  const uploadMutation = trpc.documents.upload.useMutation();
  const archiveMutation = trpc.documents.archive.useMutation();
  const deleteMutation = trpc.documents.delete.useMutation();
  const noteMutation = trpc.notes.save.useMutation();

  useEffect(() => {
    if (!isAuthenticated || !documentListQuery.data) return;
    const storedDocuments = documentListQuery.data.map(document => toWorkspaceDocument(document));
    setDocuments(storedDocuments);
    setActiveDocumentId(current => storedDocuments.some(document => document.id === current) ? current : storedDocuments[0]?.id);
  }, [documentListQuery.data, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !activeDocumentId || !noteQuery.data) return;
    setNotesByDocument(previous => ({ ...previous, [activeDocumentId]: noteQuery.data?.markdown ?? "" }));
  }, [activeDocumentId, isAuthenticated, noteQuery.data]);

  const value = useMemo<WorkspaceContextValue>(() => ({
    documents,
    activeDocument,
    activeDocumentId,
    activePage,
    leftPanel,
    rightPanel,
    railCollapsed,
    markdown,
    activeThreadId,
    setActivePage,
    setLeftPanel,
    setRightPanel,
    setRailCollapsed,
    setMarkdown: (value) => {
      if (!activeDocumentId) return;
      setNotesByDocument(previous => ({ ...previous, [activeDocumentId]: value }));
    },
    saveNote: () => {
      const documentId = Number(activeDocumentId);
      if (!isAuthenticated || !Number.isInteger(documentId)) {
        toast.success("Notes saved in this local preview.");
        return;
      }
      noteMutation.mutate({ documentId, markdown }, {
        onSuccess: () => {
          void utils.notes.get.invalidate({ documentId });
          toast.success("Notes saved to your private workspace.");
        },
        onError: error => toast.error(error.message),
      });
    },
    openDocument: (documentId) => {
      setActiveDocumentId(documentId);
      setActivePage(1);
      setLeftPanel("viewer");
    },
    uploadDocument: (file) => {
      if (!isAuthenticated) {
        const previewDocument: WorkspaceDocument = {
          id: crypto.randomUUID(),
          filename: file.name,
          sizeBytes: file.size,
          pageCount: 0,
          uploadedAt: new Date().toISOString(),
          status: "processing",
          source: "web",
          previewUrl: URL.createObjectURL(file),
        };
        setDocuments(previous => [previewDocument, ...previous]);
        setActiveDocumentId(previewDocument.id);
        setActivePage(1);
        setLeftPanel("viewer");
        return;
      }
      void toBase64(file).then(base64 => uploadMutation.mutate({ filename: file.name, mimeType: "application/pdf", base64 }, {
        onSuccess: async document => {
          const mapped = toWorkspaceDocument(document);
          setActiveDocumentId(mapped.id);
          setActivePage(1);
          setLeftPanel("viewer");
          await utils.documents.list.invalidate();
          toast.success("PDF saved to your private workspace and queued for extraction.");
        },
        onError: error => toast.error(error.message),
      })).catch(error => toast.error(error.message));
    },
    archiveDocument: (documentId) => {
      const storedId = Number(documentId);
      if (isAuthenticated && Number.isInteger(storedId)) {
        archiveMutation.mutate({ documentId: storedId }, { onSuccess: () => void utils.documents.list.invalidate(), onError: error => toast.error(error.message) });
        return;
      }
      setDocuments(previous => previous.map(document => document.id === documentId ? { ...document, status: "archived" } : document));
      toast.success("Document archived in this workspace preview.");
    },
    deleteDocument: (documentId) => {
      const storedId = Number(documentId);
      if (isAuthenticated && Number.isInteger(storedId)) {
        deleteMutation.mutate({ documentId: storedId }, { onSuccess: () => void utils.documents.list.invalidate(), onError: error => toast.error(error.message) });
        return;
      }
      setDocuments(previous => previous.filter(document => document.id !== documentId));
      if (documentId === activeDocumentId) {
        setActiveDocumentId(documents.find(document => document.id !== documentId)?.id);
        setActivePage(1);
      }
      toast.success("Document removed from this workspace preview.");
    },
    updatePageCount: (documentId, pageCount) => {
      setDocuments(previous => previous.map(document => document.id === documentId ? { ...document, pageCount, status: "ready" } : document));
    },
    restoreChatThread: (documentId, threadId) => {
      setActiveDocumentId(documentId);
      setActivePage(1);
      setActiveThreadId(threadId);
      setRightPanel("chat");
    },
  }), [activeDocument, activeDocumentId, activePage, activeThreadId, archiveMutation, deleteMutation, documentListQuery.data, documents, isAuthenticated, leftPanel, markdown, noteMutation, noteQuery.data, railCollapsed, rightPanel, uploadMutation, utils.documents.list, utils.notes.get]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return context;
}
