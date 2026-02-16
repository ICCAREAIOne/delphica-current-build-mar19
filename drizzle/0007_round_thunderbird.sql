CREATE TABLE `lab_order_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`protocolId` varchar(128) NOT NULL,
	`templateName` varchar(255) NOT NULL,
	`description` text,
	`category` enum('first_line','additional','specialized') NOT NULL,
	`labTests` json NOT NULL,
	`timesOrdered` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lab_order_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `protocol_applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`protocolId` varchar(128) NOT NULL,
	`protocolName` varchar(255) NOT NULL,
	`daoEntryId` int NOT NULL,
	`patientId` int NOT NULL,
	`physicianId` int NOT NULL,
	`appliedAt` timestamp NOT NULL DEFAULT (now()),
	`sectionsUsed` json,
	`feedbackSubmitted` boolean NOT NULL DEFAULT false,
	`feedbackRating` int,
	`feedbackComment` text,
	`feedbackSubmittedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `protocol_applications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `protocol_outcomes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`protocolApplicationId` int NOT NULL,
	`patientId` int NOT NULL,
	`daoEntryId` int NOT NULL,
	`outcomeType` enum('diagnosis_confirmed','diagnosis_changed','treatment_successful','treatment_modified','referred','ongoing') NOT NULL,
	`finalDiagnosis` text,
	`diagnosisMatchedProtocol` boolean,
	`timeToResolution` int,
	`labsOrdered` int,
	`labsAbnormal` int,
	`followUpVisits` int,
	`protocolAdherence` int,
	`patientSatisfaction` int,
	`notes` text,
	`documentedById` int NOT NULL,
	`outcomeDate` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `protocol_outcomes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `protocol_applications` ADD CONSTRAINT `protocol_applications_daoEntryId_dao_protocol_entries_id_fk` FOREIGN KEY (`daoEntryId`) REFERENCES `dao_protocol_entries`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `protocol_applications` ADD CONSTRAINT `protocol_applications_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `protocol_applications` ADD CONSTRAINT `protocol_applications_physicianId_users_id_fk` FOREIGN KEY (`physicianId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `protocol_outcomes` ADD CONSTRAINT `protocol_outcomes_protocolApplicationId_protocol_applications_id_fk` FOREIGN KEY (`protocolApplicationId`) REFERENCES `protocol_applications`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `protocol_outcomes` ADD CONSTRAINT `protocol_outcomes_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `protocol_outcomes` ADD CONSTRAINT `protocol_outcomes_daoEntryId_dao_protocol_entries_id_fk` FOREIGN KEY (`daoEntryId`) REFERENCES `dao_protocol_entries`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `protocol_outcomes` ADD CONSTRAINT `protocol_outcomes_documentedById_users_id_fk` FOREIGN KEY (`documentedById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;