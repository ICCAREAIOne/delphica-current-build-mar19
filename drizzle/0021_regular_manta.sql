CREATE TABLE `causal_analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`diagnosisCode` varchar(16) NOT NULL,
	`treatmentCode` varchar(16) NOT NULL,
	`effectSize` decimal(10,4),
	`confidenceInterval` varchar(64),
	`pValue` decimal(10,8),
	`sampleSize` int,
	`methodology` varchar(128),
	`confounders` json,
	`analysisNotes` text,
	`outcomeType` varchar(128),
	`outcomeValue` decimal(10,4),
	`analyzedAt` timestamp NOT NULL DEFAULT (now()),
	`lastUpdated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `causal_analyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evidence_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`queryHash` varchar(64) NOT NULL,
	`queryText` text NOT NULL,
	`evidenceType` varchar(64) NOT NULL,
	`title` text NOT NULL,
	`authors` text,
	`publicationDate` timestamp,
	`source` varchar(255),
	`doi` varchar(255),
	`pmid` varchar(32),
	`abstract` text,
	`keyFindings` text,
	`relevanceScore` decimal(5,2),
	`timesReferenced` int DEFAULT 0,
	`lastReferenced` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	CONSTRAINT `evidence_cache_id` PRIMARY KEY(`id`),
	CONSTRAINT `evidence_cache_queryHash_unique` UNIQUE(`queryHash`)
);
--> statement-breakpoint
CREATE TABLE `patient_outcomes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`sessionId` int,
	`recommendationId` int,
	`outcomeType` varchar(128) NOT NULL,
	`outcomeDescription` text NOT NULL,
	`severity` enum('mild','moderate','severe','critical'),
	`measurementType` varchar(128),
	`measurementValue` varchar(255),
	`measurementUnit` varchar(64),
	`timeFromTreatment` int,
	`isExpected` boolean DEFAULT true,
	`likelyRelatedToTreatment` boolean,
	`attributionConfidence` decimal(5,2),
	`requiresIntervention` boolean DEFAULT false,
	`interventionTaken` text,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	`recordedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `patient_outcomes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `treatment_recommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`patientId` int NOT NULL,
	`treatmentName` varchar(255) NOT NULL,
	`treatmentType` varchar(128) NOT NULL,
	`confidenceScore` decimal(5,2) NOT NULL,
	`reasoning` text NOT NULL,
	`evidenceSources` json,
	`indicatedFor` text,
	`contraindications` json,
	`expectedOutcome` text,
	`alternativeTreatments` json,
	`suggestedDosage` varchar(255),
	`suggestedFrequency` varchar(128),
	`suggestedDuration` varchar(128),
	`status` enum('pending','accepted','rejected','modified') NOT NULL DEFAULT 'pending',
	`physicianFeedback` text,
	`modifiedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `treatment_recommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `patient_outcomes` ADD CONSTRAINT `patient_outcomes_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_outcomes` ADD CONSTRAINT `patient_outcomes_sessionId_clinical_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `clinical_sessions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_outcomes` ADD CONSTRAINT `patient_outcomes_recommendationId_treatment_recommendations_id_fk` FOREIGN KEY (`recommendationId`) REFERENCES `treatment_recommendations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_outcomes` ADD CONSTRAINT `patient_outcomes_recordedBy_users_id_fk` FOREIGN KEY (`recordedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `treatment_recommendations` ADD CONSTRAINT `treatment_recommendations_sessionId_clinical_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `clinical_sessions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `treatment_recommendations` ADD CONSTRAINT `treatment_recommendations_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `treatment_recommendations` ADD CONSTRAINT `treatment_recommendations_modifiedBy_users_id_fk` FOREIGN KEY (`modifiedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;