CREATE TABLE `session_activity` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`physicianId` int NOT NULL,
	`activityType` varchar(64) NOT NULL,
	`activityData` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `session_activity_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`physicianId` int NOT NULL,
	`commentText` text NOT NULL,
	`commentType` enum('general','diagnosis','treatment','recommendation') NOT NULL DEFAULT 'general',
	`replyToId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`isEdited` boolean NOT NULL DEFAULT false,
	CONSTRAINT `session_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session_participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`physicianId` int NOT NULL,
	`role` enum('owner','consultant','observer') NOT NULL DEFAULT 'consultant',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`lastActiveAt` timestamp NOT NULL DEFAULT (now()),
	`leftAt` timestamp,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	CONSTRAINT `session_participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `session_activity` ADD CONSTRAINT `session_activity_sessionId_clinical_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `clinical_sessions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_activity` ADD CONSTRAINT `session_activity_physicianId_users_id_fk` FOREIGN KEY (`physicianId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_comments` ADD CONSTRAINT `session_comments_sessionId_clinical_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `clinical_sessions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_comments` ADD CONSTRAINT `session_comments_physicianId_users_id_fk` FOREIGN KEY (`physicianId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_participants` ADD CONSTRAINT `session_participants_sessionId_clinical_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `clinical_sessions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_participants` ADD CONSTRAINT `session_participants_physicianId_users_id_fk` FOREIGN KEY (`physicianId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;