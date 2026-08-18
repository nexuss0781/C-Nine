import { and, asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  aiSettings,
  chatMessages,
  chatThreads,
  documents,
  documentTexts,
  type InsertUser,
  notes,
  processingEvents,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export type PageMapEntry = {
  page: number;
  text: string;
};

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database connection is unavailable");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listDocumentsForUser(userId: number) {
  const db = await requireDb();
  return db.select().from(documents).where(eq(documents.userId, userId)).orderBy(desc(documents.updatedAt));
}

export async function listDocumentsAwaitingExtraction(limit = 3) {
  const db = await requireDb();
  return db.select().from(documents).where(eq(documents.status, "processing")).orderBy(asc(documents.updatedAt)).limit(limit);
}

export async function getDocumentForUser(userId: number, documentId: number) {
  const db = await requireDb();
  const result = await db.select().from(documents).where(and(eq(documents.id, documentId), eq(documents.userId, userId))).limit(1);
  return result[0];
}

export async function createDocumentForUser(input: {
  userId: number;
  filename: string;
  storageKey: string;
  storageUrl: string;
  mimeType: string;
  sizeBytes: number;
  source?: "web" | "telegram";
}) {
  const db = await requireDb();
  const result = await db.insert(documents).values({ ...input, status: "processing", source: input.source ?? "web" });
  const id = Number(result[0].insertId);
  await addProcessingEvent({ userId: input.userId, documentId: id, stage: "upload", status: "succeeded", detail: "PDF stored securely." });
  await addProcessingEvent({ userId: input.userId, documentId: id, stage: "extract", status: "queued", detail: "Text extraction is queued." });
  return getDocumentForUser(input.userId, id);
}

export async function updateDocumentProcessingForUser(input: {
  userId: number;
  documentId: number;
  status: "uploaded" | "processing" | "ready" | "failed" | "archived";
  pageCount?: number;
}) {
  const db = await requireDb();
  await db.update(documents).set({ status: input.status, pageCount: input.pageCount }).where(and(eq(documents.id, input.documentId), eq(documents.userId, input.userId)));
  return getDocumentForUser(input.userId, input.documentId);
}

export async function archiveDocumentForUser(userId: number, documentId: number) {
  const db = await requireDb();
  await db.update(documents).set({ status: "archived", archivedAt: new Date() }).where(and(eq(documents.id, documentId), eq(documents.userId, userId)));
  return getDocumentForUser(userId, documentId);
}

export async function deleteDocumentForUser(userId: number, documentId: number) {
  const db = await requireDb();
  await db.delete(chatMessages).where(and(eq(chatMessages.userId, userId), eq(chatMessages.documentId, documentId)));
  await db.delete(chatThreads).where(and(eq(chatThreads.userId, userId), eq(chatThreads.documentId, documentId)));
  await db.delete(notes).where(and(eq(notes.userId, userId), eq(notes.documentId, documentId)));
  await db.delete(documentTexts).where(and(eq(documentTexts.userId, userId), eq(documentTexts.documentId, documentId)));
  await db.delete(processingEvents).where(and(eq(processingEvents.userId, userId), eq(processingEvents.documentId, documentId)));
  await db.delete(documents).where(and(eq(documents.userId, userId), eq(documents.id, documentId)));
}

export async function getNoteForUser(userId: number, documentId: number) {
  const db = await requireDb();
  const result = await db.select().from(notes).where(and(eq(notes.userId, userId), eq(notes.documentId, documentId))).limit(1);
  return result[0];
}

export async function upsertNoteForUser(input: { userId: number; documentId: number; title?: string; markdown: string }) {
  const db = await requireDb();
  await db.insert(notes).values({ ...input, title: input.title ?? "Study notes" }).onDuplicateKeyUpdate({
    set: { markdown: input.markdown, title: input.title ?? "Study notes", updatedAt: new Date() },
  });
  return getNoteForUser(input.userId, input.documentId);
}

export async function createThreadForUser(input: { userId: number; documentId: number; title?: string }) {
  const db = await requireDb();
  const result = await db.insert(chatThreads).values({ ...input, title: input.title ?? "New study thread" });
  const id = Number(result[0].insertId);
  return getThreadForUser(input.userId, id);
}

export async function getThreadForUser(userId: number, threadId: number) {
  const db = await requireDb();
  const result = await db.select().from(chatThreads).where(and(eq(chatThreads.id, threadId), eq(chatThreads.userId, userId))).limit(1);
  return result[0];
}

export async function listThreadsForUser(userId: number, documentId?: number) {
  const db = await requireDb();
  const condition = documentId ? and(eq(chatThreads.userId, userId), eq(chatThreads.documentId, documentId)) : eq(chatThreads.userId, userId);
  return db.select().from(chatThreads).where(condition).orderBy(desc(chatThreads.updatedAt));
}

export async function listMessagesForUser(userId: number, threadId: number) {
  const db = await requireDb();
  return db.select().from(chatMessages).where(and(eq(chatMessages.userId, userId), eq(chatMessages.threadId, threadId))).orderBy(asc(chatMessages.createdAt));
}

export async function addMessageForUser(input: {
  userId: number;
  threadId: number;
  documentId: number;
  role: "system" | "user" | "assistant";
  content: string;
  pageNumber?: number;
  model?: string;
}) {
  const db = await requireDb();
  const result = await db.insert(chatMessages).values(input);
  await db.update(chatThreads).set({ updatedAt: new Date() }).where(and(eq(chatThreads.id, input.threadId), eq(chatThreads.userId, input.userId)));
  return Number(result[0].insertId);
}

export async function getAiSettingsForUser(userId: number) {
  const db = await requireDb();
  const result = await db.select().from(aiSettings).where(eq(aiSettings.userId, userId)).limit(1);
  return result[0];
}

export async function upsertAiSettingsForUser(input: {
  userId: number;
  baseUrl?: string;
  encryptedApiKey?: string;
  keyMask?: string;
  selectedModel?: string;
}) {
  const db = await requireDb();
  await db.insert(aiSettings).values(input).onDuplicateKeyUpdate({
    set: {
      baseUrl: input.baseUrl,
      encryptedApiKey: input.encryptedApiKey,
      keyMask: input.keyMask,
      selectedModel: input.selectedModel,
      updatedAt: new Date(),
    },
  });
  return getAiSettingsForUser(input.userId);
}

export async function upsertExtractedTextForUser(input: {
  userId: number;
  documentId: number;
  extractedText: string;
  pageMap: PageMapEntry[];
  pageCount: number;
  extractorVersion: string;
}) {
  const db = await requireDb();
  await db.insert(documentTexts).values({
    userId: input.userId,
    documentId: input.documentId,
    extractedText: input.extractedText,
    pageMapJson: JSON.stringify(input.pageMap),
    extractorVersion: input.extractorVersion,
  }).onDuplicateKeyUpdate({
    set: {
      extractedText: input.extractedText,
      pageMapJson: JSON.stringify(input.pageMap),
      extractorVersion: input.extractorVersion,
      updatedAt: new Date(),
    },
  });
  await updateDocumentProcessingForUser({ userId: input.userId, documentId: input.documentId, status: "ready", pageCount: input.pageCount });
  await addProcessingEvent({ userId: input.userId, documentId: input.documentId, stage: "extract", status: "succeeded", detail: `Extracted ${input.pageCount} pages.` });
}

export async function getPageContextForUser(userId: number, documentId: number, pageNumber: number) {
  const db = await requireDb();
  const result = await db.select().from(documentTexts).where(and(eq(documentTexts.userId, userId), eq(documentTexts.documentId, documentId))).limit(1);
  const documentText = result[0];
  if (!documentText) return undefined;
  const pageMap = (documentText.pageMapJson ? JSON.parse(documentText.pageMapJson) : []) as PageMapEntry[];
  return {
    documentText: documentText.extractedText ?? "",
    pageText: pageMap.find(entry => entry.page === pageNumber)?.text ?? "",
    pageCount: pageMap.length,
  };
}

export async function addProcessingEvent(input: {
  userId: number;
  documentId: number;
  stage: "upload" | "extract" | "context";
  status: "queued" | "running" | "succeeded" | "failed";
  detail?: string;
  attempt?: number;
  completed?: boolean;
}) {
  const db = await requireDb();
  await db.insert(processingEvents).values({
    userId: input.userId,
    documentId: input.documentId,
    stage: input.stage,
    status: input.status,
    detail: input.detail,
    attempt: input.attempt ?? 1,
    completedAt: input.completed ? new Date() : null,
  });
}

export async function listProcessingEventsForUser(userId: number, documentId: number) {
  const db = await requireDb();
  return db.select().from(processingEvents).where(and(eq(processingEvents.userId, userId), eq(processingEvents.documentId, documentId))).orderBy(desc(processingEvents.createdAt));
}
