CREATE TABLE `aiSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`baseUrl` varchar(1024),
	`encryptedApiKey` longtext,
	`keyMask` varchar(48),
	`selectedModel` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `aiSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `ai_settings_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `chatMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`threadId` int NOT NULL,
	`documentId` int NOT NULL,
	`role` enum('system','user','assistant') NOT NULL,
	`content` longtext NOT NULL,
	`pageNumber` int,
	`model` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chatMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chatThreads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`documentId` int NOT NULL,
	`title` varchar(255) NOT NULL DEFAULT 'New study thread',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chatThreads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documentTexts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`userId` int NOT NULL,
	`extractedText` longtext,
	`pageMapJson` longtext,
	`extractorVersion` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documentTexts_id` PRIMARY KEY(`id`),
	CONSTRAINT `document_text_document_unique` UNIQUE(`documentId`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`filename` varchar(512) NOT NULL,
	`storageKey` varchar(1024) NOT NULL,
	`storageUrl` varchar(1200) NOT NULL,
	`mimeType` varchar(120) NOT NULL DEFAULT 'application/pdf',
	`sizeBytes` int NOT NULL,
	`pageCount` int NOT NULL DEFAULT 0,
	`status` enum('uploaded','processing','ready','failed','archived') NOT NULL DEFAULT 'uploaded',
	`source` enum('web','telegram') NOT NULL DEFAULT 'web',
	`archivedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`documentId` int NOT NULL,
	`title` varchar(255) NOT NULL DEFAULT 'Study notes',
	`markdown` longtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notes_id` PRIMARY KEY(`id`),
	CONSTRAINT `notes_user_document_unique` UNIQUE(`userId`,`documentId`)
);
--> statement-breakpoint
CREATE TABLE `processingEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`documentId` int NOT NULL,
	`stage` enum('upload','extract','context') NOT NULL,
	`status` enum('queued','running','succeeded','failed') NOT NULL,
	`attempt` int NOT NULL DEFAULT 1,
	`detail` longtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `processingEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `name` longtext;--> statement-breakpoint
CREATE INDEX `messages_thread_created_idx` ON `chatMessages` (`threadId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `messages_user_document_idx` ON `chatMessages` (`userId`,`documentId`);--> statement-breakpoint
CREATE INDEX `threads_user_document_updated_idx` ON `chatThreads` (`userId`,`documentId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `document_text_user_idx` ON `documentTexts` (`userId`);--> statement-breakpoint
CREATE INDEX `documents_user_updated_idx` ON `documents` (`userId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `documents_user_status_idx` ON `documents` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `notes_document_idx` ON `notes` (`documentId`);--> statement-breakpoint
CREATE INDEX `processing_user_document_created_idx` ON `processingEvents` (`userId`,`documentId`,`createdAt`);