import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" }).notNull().default(sql`(strftime('%s','now') * 1000)`);
const nullableTimestamp = (name: string) => integer(name, { mode: "timestamp_ms" });

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin"] as const }).notNull().default("user"),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
  lastSignedIn: timestamp("lastSignedIn"),
});

export const documents = sqliteTable("documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  filename: text("filename").notNull(),
  storageKey: text("storageKey").notNull(),
  storageUrl: text("storageUrl").notNull(),
  mimeType: text("mimeType").notNull().default("application/pdf"),
  sizeBytes: integer("sizeBytes").notNull(),
  pageCount: integer("pageCount").notNull().default(0),
  status: text("status", { enum: ["uploaded", "processing", "ready", "failed", "archived"] as const }).notNull().default("uploaded"),
  source: text("source", { enum: ["web", "telegram"] as const }).notNull().default("web"),
  archivedAt: nullableTimestamp("archivedAt"),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
}, table => [
  index("documents_user_updated_idx").on(table.userId, table.updatedAt),
  index("documents_user_status_idx").on(table.userId, table.status),
]);

export const documentTexts = sqliteTable("documentTexts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  documentId: integer("documentId").notNull(),
  userId: integer("userId").notNull(),
  extractedText: text("extractedText"),
  pageMapJson: text("pageMapJson"),
  extractorVersion: text("extractorVersion"),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
}, table => [
  uniqueIndex("document_text_document_unique").on(table.documentId),
  index("document_text_user_idx").on(table.userId),
]);

export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  documentId: integer("documentId").notNull(),
  title: text("title").notNull().default("Study notes"),
  markdown: text("markdown").notNull(),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
}, table => [
  uniqueIndex("notes_user_document_unique").on(table.userId, table.documentId),
  index("notes_document_idx").on(table.documentId),
]);

export const chatThreads = sqliteTable("chatThreads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  documentId: integer("documentId").notNull(),
  title: text("title").notNull().default("New study thread"),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
}, table => [
  index("threads_user_document_updated_idx").on(table.userId, table.documentId, table.updatedAt),
]);

export const chatMessages = sqliteTable("chatMessages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  threadId: integer("threadId").notNull(),
  documentId: integer("documentId").notNull(),
  role: text("role", { enum: ["system", "user", "assistant"] as const }).notNull(),
  content: text("content").notNull(),
  pageNumber: integer("pageNumber"),
  model: text("model"),
  createdAt: timestamp("createdAt"),
}, table => [
  index("messages_thread_created_idx").on(table.threadId, table.createdAt),
  index("messages_user_document_idx").on(table.userId, table.documentId),
]);

export const aiSettings = sqliteTable("aiSettings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  baseUrl: text("baseUrl"),
  encryptedApiKey: text("encryptedApiKey"),
  keyMask: text("keyMask"),
  selectedModel: text("selectedModel"),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
}, table => [
  uniqueIndex("ai_settings_user_unique").on(table.userId),
]);

export const processingEvents = sqliteTable("processingEvents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  documentId: integer("documentId").notNull(),
  stage: text("stage", { enum: ["upload", "extract", "context"] as const }).notNull(),
  status: text("status", { enum: ["queued", "running", "succeeded", "failed"] as const }).notNull(),
  attempt: integer("attempt").notNull().default(1),
  detail: text("detail"),
  createdAt: timestamp("createdAt"),
  completedAt: nullableTimestamp("completedAt"),
}, table => [
  index("processing_user_document_created_idx").on(table.userId, table.documentId, table.createdAt),
]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type ChatThread = typeof chatThreads.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type AiSetting = typeof aiSettings.$inferSelect;
