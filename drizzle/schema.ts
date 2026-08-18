import {
  index,
  int,
  longtext,
  mysqlEnum,
  mysqlTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: longtext("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  filename: varchar("filename", { length: 512 }).notNull(),
  storageKey: varchar("storageKey", { length: 1024 }).notNull(),
  storageUrl: varchar("storageUrl", { length: 1200 }).notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull().default("application/pdf"),
  sizeBytes: int("sizeBytes").notNull(),
  pageCount: int("pageCount").notNull().default(0),
  status: mysqlEnum("status", ["uploaded", "processing", "ready", "failed", "archived"]).notNull().default("uploaded"),
  source: mysqlEnum("source", ["web", "telegram"]).notNull().default("web"),
  archivedAt: timestamp("archivedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("documents_user_updated_idx").on(table.userId, table.updatedAt),
  index("documents_user_status_idx").on(table.userId, table.status),
]);

export const documentTexts = mysqlTable("documentTexts", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  userId: int("userId").notNull(),
  extractedText: longtext("extractedText"),
  pageMapJson: longtext("pageMapJson"),
  extractorVersion: varchar("extractorVersion", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("document_text_document_unique").on(table.documentId),
  index("document_text_user_idx").on(table.userId),
]);

export const notes = mysqlTable("notes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  documentId: int("documentId").notNull(),
  title: varchar("title", { length: 255 }).notNull().default("Study notes"),
  markdown: longtext("markdown").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("notes_user_document_unique").on(table.userId, table.documentId),
  index("notes_document_idx").on(table.documentId),
]);

export const chatThreads = mysqlTable("chatThreads", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  documentId: int("documentId").notNull(),
  title: varchar("title", { length: 255 }).notNull().default("New study thread"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("threads_user_document_updated_idx").on(table.userId, table.documentId, table.updatedAt),
]);

export const chatMessages = mysqlTable("chatMessages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  threadId: int("threadId").notNull(),
  documentId: int("documentId").notNull(),
  role: mysqlEnum("role", ["system", "user", "assistant"]).notNull(),
  content: longtext("content").notNull(),
  pageNumber: int("pageNumber"),
  model: varchar("model", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("messages_thread_created_idx").on(table.threadId, table.createdAt),
  index("messages_user_document_idx").on(table.userId, table.documentId),
]);

export const aiSettings = mysqlTable("aiSettings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  baseUrl: varchar("baseUrl", { length: 1024 }),
  encryptedApiKey: longtext("encryptedApiKey"),
  keyMask: varchar("keyMask", { length: 48 }),
  selectedModel: varchar("selectedModel", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("ai_settings_user_unique").on(table.userId),
]);

export const processingEvents = mysqlTable("processingEvents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  documentId: int("documentId").notNull(),
  stage: mysqlEnum("stage", ["upload", "extract", "context"]).notNull(),
  status: mysqlEnum("status", ["queued", "running", "succeeded", "failed"]).notNull(),
  attempt: int("attempt").notNull().default(1),
  detail: longtext("detail"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
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
