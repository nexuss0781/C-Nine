export type DocumentSource = "web" | "telegram";
export type DocumentStatus = "ready" | "processing" | "failed" | "archived";

export type WorkspaceDocument = {
  id: string;
  filename: string;
  sizeBytes: number;
  pageCount: number;
  uploadedAt: string;
  status: DocumentStatus;
  source: DocumentSource;
};

export type WorkspaceActivity = {
  id: string;
  kind: "document" | "chat" | "note";
  title: string;
  detail: string;
  documentId: string;
  threadId?: string;
  createdAt: string;
};

export function formatBytes(bytes: number) {
  if (bytes < 1_000_000) return `${Math.max(1, Math.round(bytes / 1_000))} KB`;
  return `${(bytes / 1_000_000).toFixed(bytes >= 10_000_000 ? 0 : 1)} MB`;
}

export function formatWorkspaceDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}
