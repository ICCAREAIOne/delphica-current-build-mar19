CREATE TABLE `treatment_policy` (
	`id` int AUTO_INCREMENT NOT NULL,
	`treatmentCode` varchar(64) NOT NULL,
	`treatmentName` varchar(255) NOT NULL,
	`diagnosisCode` varchar(32) NOT NULL,
	`ageGroup` enum('under_40','40_to_65','over_65','all') NOT NULL DEFAULT 'all',
	`genderGroup` enum('male','female','other','all') NOT NULL DEFAULT 'all',
	`alpha` decimal(12,4) NOT NULL DEFAULT '7.0000',
	`beta` decimal(12,4) NOT NULL DEFAULT '3.0000',
	`confidenceScore` decimal(5,4) NOT NULL DEFAULT '0.7000',
	`totalObservations` int NOT NULL DEFAULT 0,
	`successCount` int NOT NULL DEFAULT 0,
	`failureCount` int NOT NULL DEFAULT 0,
	`lastUpdatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `treatment_policy_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `treatment_policy` ADD CONSTRAINT `treatment_policy_lastUpdatedBy_users_id_fk` FOREIGN KEY (`lastUpdatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;