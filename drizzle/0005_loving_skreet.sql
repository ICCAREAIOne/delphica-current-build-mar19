CREATE TABLE `notif_prefs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`physicianId` int NOT NULL,
	`criticalAlerts` int NOT NULL DEFAULT 1,
	`highAlerts` int NOT NULL DEFAULT 1,
	`mediumAlerts` int NOT NULL DEFAULT 1,
	`lowAlerts` int NOT NULL DEFAULT 0,
	`inApp` int NOT NULL DEFAULT 1,
	`email` int NOT NULL DEFAULT 1,
	`sms` int NOT NULL DEFAULT 0,
	`quietEnabled` int NOT NULL DEFAULT 0,
	`quietStart` varchar(5),
	`quietEnd` varchar(5),
	`causalBrain` int NOT NULL DEFAULT 1,
	`reviewBoard` int NOT NULL DEFAULT 1,
	`precisionCare` int NOT NULL DEFAULT 1,
	`marketplace` int NOT NULL DEFAULT 1,
	`maxPerHour` int NOT NULL DEFAULT 10,
	`digestMode` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notif_prefs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `protocol_favs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`physicianId` int NOT NULL,
	`protocolId` int NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `protocol_favs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `protocols` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`category` enum('diagnosis','treatment','prevention','emergency','chronic_care','medication','procedure') NOT NULL,
	`condition` varchar(255),
	`specialty` varchar(100),
	`summary` text NOT NULL,
	`content` text NOT NULL,
	`recommendations` json,
	`evidenceLevel` enum('A','B','C','D') NOT NULL,
	`sources` json,
	`version` varchar(20) NOT NULL,
	`lastReviewed` timestamp NOT NULL,
	`status` enum('active','under_review','archived') NOT NULL DEFAULT 'active',
	`viewCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `protocols_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `notif_prefs` ADD CONSTRAINT `notif_prefs_physicianId_users_id_fk` FOREIGN KEY (`physicianId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `protocol_favs` ADD CONSTRAINT `protocol_favs_physicianId_users_id_fk` FOREIGN KEY (`physicianId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `protocol_favs` ADD CONSTRAINT `protocol_favs_protocolId_protocols_id_fk` FOREIGN KEY (`protocolId`) REFERENCES `protocols`(`id`) ON DELETE no action ON UPDATE no action;