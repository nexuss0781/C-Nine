import { and, asc, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "parad/drizzle";
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

type CnineDb = Awaited<ReturnType<typeof drizzle>>;
let _db: CnineDb | null = null;

async function ensureParadoxSchema(db: CnineDb) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, openId TEXT NOT NULL UNIQUE, name TEXT, email TEXT, loginMethod TEXT, role TEXT NOT NULL DEFAULT 'user', createdAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000), updatedAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000), lastSignedIn INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000))`,
    `CREATE TABLE IF NOT EXISTS documents (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER NOT NULL, filename TEXT NOT NULL, storageKey TEXT NOT NULL, storageUrl TEXT NOT NULL, mimeType TEXT NOT NULL DEFAULT 'application/pdf', sizeBytes INTEGER NOT NULL, pageCount INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'uploaded', source TEXT NOT NULL DEFAULT 'web', archivedAt INTEGER, createdAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000), updatedAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000))`,
    `CREATE TABLE IF NOT EXISTS documentTexts (id INTEGER PRIMARY KEY AUTOINCREMENT, documentId INTEGER NOT NULL UNIQUE, userId INTEGER NOT NULL, extractedText TEXT, pageMapJson TEXT, extractorVersion TEXT, createdAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000), updatedAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000))`,
    `CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER NOT NULL, documentId INTEGER NOT NULL, title TEXT NOT NULL DEFAULT 'Study notes', markdown TEXT NOT NULL, createdAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000), updatedAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000), UNIQUE(userId, documentId))`,
    `CREATE TABLE IF NOT EXISTS chatThreads (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER NOT NULL, documentId INTEGER NOT NULL, title TEXT NOT NULL DEFAULT 'New study thread', createdAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000), updatedAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000))`,
    `CREATE TABLE IF NOT EXISTS chatMessages (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER NOT NULL, threadId INTEGER NOT NULL, documentId INTEGER NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, pageNumber INTEGER, model TEXT, createdAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000))`,
    `CREATE TABLE IF NOT EXISTS aiSettings (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER NOT NULL UNIQUE, baseUrl TEXT, encryptedApiKey TEXT, keyMask TEXT, selectedModel TEXT, createdAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000), updatedAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000))`,
    `CREATE TABLE IF NOT EXISTS processingEvents (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER NOT NULL, documentId INTEGER NOT NULL, stage TEXT NOT NULL, status TEXT NOT NULL, attempt INTEGER NOT NULL DEFAULT 1, detail TEXT, createdAt INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000), completedAt INTEGER)`,
    `CREATE INDEX IF NOT EXISTS documents_user_updated_idx ON documents(userId, updatedAt)`,
    `CREATE INDEX IF NOT EXISTS documents_user_status_idx ON documents(userId, status)`,
    `CREATE INDEX IF NOT EXISTS document_text_user_idx ON documentTexts(userId)`,
    `CREATE INDEX IF NOT EXISTS notes_document_idx ON notes(documentId)`,
    `CREATE INDEX IF NOT EXISTS threads_user_document_updated_idx ON chatThreads(userId, documentId, updatedAt)`,
    `CREATE INDEX IF NOT EXISTS messages_thread_created_idx ON chatMessages(threadId, createdAt)`,
    `CREATE INDEX IF NOT EXISTS messages_user_document_idx ON chatMessages(userId, documentId)`,
    `CREATE INDEX IF NOT EXISTS processing_user_document_created_idx ON processingEvents(userId, documentId, createdAt)`,
  ];
  for (const statement of statements) await db.run(sql.raw(statement));
}
let _dbPromise: Promise<CnineDb | null> | null = null;

export type PageMapEntry = {
  page: number;
  text: string;
};

export async function getDb() {
  if (_db) return _db;
  if (!process.env.DATABASE_URL) return null;
  if (!process.env.DATABASE_URL.startsWith("parad://")) {
    throw new Error("DATABASE_URL must be a canonical parad:// URL");
  }
  if (!_dbPromise) {
    _dbPromise = drizzle(process.env.DATABASE_URL, {
      schema: { users, documents, documentTexts, notes, chatThreads, chatMessages, aiSettings, processingEvents },
    }).then(async db => {
      await ensureParadoxSchema(db);
      _db = db;
      return db;
    }).catch(error => {
      console.warn("[Database] Failed to initialize Paradox:", error instanceof Error ? error.message : String(error));
      _dbPromise = null;
      return null;
    });
  }
  return _dbPromise;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Paradox database connection is unavailable");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await requireDb();
  const values = {
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    lastSignedIn: user.lastSignedIn ?? new Date(),
    role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"),
  } as const;
  await db.insert(users).values(values).onConflictDoUpdate({
    target: users.openId,
    set: {
      name: values.name,
      email: values.email,
      loginMethod: values.loginMethod,
      lastSignedIn: values.lastSignedIn,
      role: values.role,
    },
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await requireDb();
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
  const result = await db.insert(documents).values({ ...input, status: "processing", source: input.source ?? "web" }).returning({ id: documents.id });
  const id = Number(result[0]?.id);
  if (!id) throw new Error("Paradox did not return a document id");
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
  await db.update(documents).set({ status: input.status, updatedAt: new Date(), ...(input.pageCount === undefined ? {} : { pageCount: input.pageCount }) }).where(and(eq(documents.id, input.documentId), eq(documents.userId, input.userId)));
  return getDocumentForUser(input.userId, input.documentId);
}

export async function archiveDocumentForUser(userId: number, documentId: number) {
  const db = await requireDb();
  await db.update(documents).set({ status: "archived", archivedAt: new Date(), updatedAt: new Date() }).where(and(eq(documents.id, documentId), eq(documents.userId, userId)));
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
  const title = input.title ?? "Study notes";
  await db.insert(notes).values({ ...input, title }).onConflictDoUpdate({
    target: [notes.userId, notes.documentId],
    set: { markdown: input.markdown, title, updatedAt: new Date() },
  });
  return getNoteForUser(input.userId, input.documentId);
}

export async function createThreadForUser(input: { userId: number; documentId: number; title?: string }) {
  const db = await requireDb();
  const result = await db.insert(chatThreads).values({ ...input, title: input.title ?? "New study thread" }).returning({ id: chatThreads.id });
  const id = Number(result[0]?.id);
  if (!id) throw new Error("Paradox did not return a thread id");
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
  const result = await db.insert(chatMessages).values(input).returning({ id: chatMessages.id });
  await db.update(chatThreads).set({ updatedAt: new Date() }).where(and(eq(chatThreads.id, input.threadId), eq(chatThreads.userId, input.userId)));
  const id = Number(result[0]?.id);
  if (!id) throw new Error("Paradox did not return a message id");
  return id;
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
  await db.insert(aiSettings).values(input).onConflictDoUpdate({
    target: aiSettings.userId,
    set: {
      baseUrl: input.baseUrl ?? null,
      encryptedApiKey: input.encryptedApiKey ?? null,
      keyMask: input.keyMask ?? null,
      selectedModel: input.selectedModel ?? null,
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
  const values = {
    userId: input.userId,
    documentId: input.documentId,
    extractedText: input.extractedText,
    pageMapJson: JSON.stringify(input.pageMap),
    extractorVersion: input.extractorVersion,
  };
  await db.insert(documentTexts).values(values).onConflictDoUpdate({
    target: documentTexts.documentId,
    set: {
      extractedText: values.extractedText,
      pageMapJson: values.pageMapJson,
      extractorVersion: values.extractorVersion,
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
