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
  previewUrl?: string;
};

export type WorkspaceMessage = {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  createdAt: string;
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

export const demoDocuments: WorkspaceDocument[] = [
  {
    id: "demo-cognitive-science",
    filename: "cognitive-science-reading.pdf",
    sizeBytes: 4_860_000,
    pageCount: 18,
    uploadedAt: "2026-08-18T09:20:00.000Z",
    status: "ready",
    source: "web",
  },
  {
    id: "demo-systems",
    filename: "distributed-systems-notes.pdf",
    sizeBytes: 8_120_000,
    pageCount: 42,
    uploadedAt: "2026-08-17T14:10:00.000Z",
    status: "processing",
    source: "web",
  },
  {
    id: "demo-research-methods",
    filename: "research-methods.pdf",
    sizeBytes: 2_430_000,
    pageCount: 11,
    uploadedAt: "2026-08-15T16:45:00.000Z",
    status: "ready",
    source: "telegram",
  },
];

export const demoNotes = `# Learning map

## The idea in this document

The reading connects **attention**, **memory**, and **decision-making**. Keep the active page in view while turning each concept into a concise claim and evidence pair.

> Study prompt: What does this page add to the model already established in the earlier sections?





## Concept flow






\`\`\`mermaid
flowchart LR
  A[Observe] --> B[Encode]
  B --> C[Connect to prior knowledge]
  C --> D[Explain in your own words]
  D --> E[Retrieve and revise]
\`\`\`

## Page-linked note

When the current page changes, the chat assistant receives the page number and a bounded excerpt from the extracted document text. The final backend will retain this information **only inside the signed-in user's workspace**.
`;

export const demoActivities: WorkspaceActivity[] = [
  {
    id: "activity-1",
    kind: "chat",
    title: "Asked for a concise explanation",
    detail: "cognitive-science-reading.pdf · page 6",
    documentId: "demo-cognitive-science",
    threadId: "thread-concept-explanation",
    createdAt: "2026-08-18T10:05:00.000Z",
  },
  {
    id: "activity-2",
    kind: "note",
    title: "Updated learning map",
    detail: "cognitive-science-reading.pdf",
    documentId: "demo-cognitive-science",
    createdAt: "2026-08-18T09:56:00.000Z",
  },
  {
    id: "activity-3",
    kind: "document",
    title: "Opened research methods",
    detail: "research-methods.pdf · page 2",
    documentId: "demo-research-methods",
    createdAt: "2026-08-17T15:02:00.000Z",
  },
];

export function formatBytes(bytes: number) {
  if (bytes < 1_000_000) return `${Math.max(1, Math.round(bytes / 1_000))} KB`;
  return `${(bytes / 1_000_000).toFixed(bytes >= 10_000_000 ? 0 : 1)} MB`;
}

export function formatWorkspaceDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
