CREATE TABLE `consultation_activity` (
	`id` int AUTO_INCREMENT NOT NULL,
	`consultationRoomId` int NOT NULL,
	`physicianId` int NOT NULL,
	`activityType` enum('created','joined','left','commented','updated_status','shared_simulation','shared_insight','resolved') NOT NULL,
	`activityData` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `consultation_activity_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `consultation_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`consultationRoomId` int NOT NULL,
	`physicianId` int NOT NULL,
	`content` text NOT NULL,
	`commentType` enum('general','diagnosis','treatment','question','answer') NOT NULL DEFAULT 'general',
	`parentCommentId` int,
	`mentions` json,
	`attachments` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `consultation_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `consultation_participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`consultationRoomId` int NOT NULL,
	`physicianId` int NOT NULL,
	`role` enum('owner','consultant','observer') NOT NULL DEFAULT 'consultant',
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`lastSeenAt` timestamp,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `consultation_participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `consultation_rooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`daoEntryId` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`status` enum('active','resolved','archived') NOT NULL DEFAULT 'active',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`resolvedAt` timestamp,
	CONSTRAINT `consultation_rooms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `consultation_activity` ADD CONSTRAINT `consultation_activity_consultationRoomId_consultation_rooms_id_fk` FOREIGN KEY (`consultationRoomId`) REFERENCES `consultation_rooms`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consultation_activity` ADD CONSTRAINT `consultation_activity_physicianId_users_id_fk` FOREIGN KEY (`physicianId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consultation_comments` ADD CONSTRAINT `consultation_comments_consultationRoomId_consultation_rooms_id_fk` FOREIGN KEY (`consultationRoomId`) REFERENCES `consultation_rooms`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consultation_comments` ADD CONSTRAINT `consultation_comments_physicianId_users_id_fk` FOREIGN KEY (`physicianId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consultation_participants` ADD CONSTRAINT `consultation_participants_consultationRoomId_consultation_rooms_id_fk` FOREIGN KEY (`consultationRoomId`) REFERENCES `consultation_rooms`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consultation_participants` ADD CONSTRAINT `consultation_participants_physicianId_users_id_fk` FOREIGN KEY (`physicianId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consultation_rooms` ADD CONSTRAINT `consultation_rooms_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consultation_rooms` ADD CONSTRAINT `consultation_rooms_daoEntryId_dao_protocol_entries_id_fk` FOREIGN KEY (`daoEntryId`) REFERENCES `dao_protocol_entries`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consultation_rooms` ADD CONSTRAINT `consultation_rooms_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;