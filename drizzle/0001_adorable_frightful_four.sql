CREATE TABLE `causal_insights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`daoEntryId` int,
	`insightType` enum('risk_prediction','treatment_efficacy','pattern_analysis','causal_relationship') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`causalFactors` json NOT NULL,
	`evidenceSources` json,
	`recommendations` json NOT NULL,
	`confidenceScore` int NOT NULL,
	`aiGeneratedAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedByPhysician` boolean NOT NULL DEFAULT false,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `causal_insights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clinical_outcomes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`carePlanId` int,
	`daoEntryId` int,
	`outcomeType` enum('treatment_success','partial_success','no_improvement','adverse_event','followup') NOT NULL,
	`description` text NOT NULL,
	`metrics` json,
	`patientSatisfaction` int,
	`adverseEvents` json,
	`lessonsLearned` text,
	`feedbackForAI` text,
	`documentedById` int NOT NULL,
	`outcomeDate` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clinical_outcomes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dao_protocol_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`physicianId` int NOT NULL,
	`chiefComplaint` text NOT NULL,
	`symptoms` json NOT NULL,
	`vitalSigns` json,
	`physicalExamFindings` text,
	`labResults` json,
	`imagingResults` json,
	`diagnosis` text NOT NULL,
	`differentialDiagnosis` json,
	`treatmentPlan` text NOT NULL,
	`status` enum('draft','completed','revised') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dao_protocol_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `delphi_simulations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`physicianId` int NOT NULL,
	`daoEntryId` int,
	`scenarioDescription` text NOT NULL,
	`treatmentOptions` json NOT NULL,
	`selectedOption` text,
	`aiAnalysis` text NOT NULL,
	`conversationHistory` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `delphi_simulations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mrn` varchar(64) NOT NULL,
	`firstName` varchar(128) NOT NULL,
	`lastName` varchar(128) NOT NULL,
	`dateOfBirth` timestamp NOT NULL,
	`gender` enum('male','female','other','unknown') NOT NULL,
	`email` varchar(320),
	`phone` varchar(32),
	`address` text,
	`allergies` json,
	`chronicConditions` json,
	`currentMedications` json,
	`status` enum('active','inactive','discharged') NOT NULL DEFAULT 'active',
	`assignedPhysicianId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patients_id` PRIMARY KEY(`id`),
	CONSTRAINT `patients_mrn_unique` UNIQUE(`mrn`)
);
--> statement-breakpoint
CREATE TABLE `precision_care_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`physicianId` int NOT NULL,
	`daoEntryId` int,
	`delphiSimulationId` int,
	`planTitle` varchar(255) NOT NULL,
	`diagnosis` text NOT NULL,
	`goals` json NOT NULL,
	`interventions` json NOT NULL,
	`medications` json,
	`lifestyle` json,
	`followUp` json NOT NULL,
	`aiRationale` text NOT NULL,
	`status` enum('draft','pending_review','approved','active','completed','revised') NOT NULL DEFAULT 'draft',
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `precision_care_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `safety_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`carePlanId` int,
	`daoEntryId` int,
	`reviewType` enum('automated','physician_override','compliance_check') NOT NULL,
	`safetyAlerts` json,
	`complianceChecks` json,
	`overallStatus` enum('approved','flagged','rejected') NOT NULL,
	`reviewerNotes` text,
	`reviewedById` int,
	`overrideJustification` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `safety_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `causal_insights` ADD CONSTRAINT `causal_insights_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `causal_insights` ADD CONSTRAINT `causal_insights_daoEntryId_dao_protocol_entries_id_fk` FOREIGN KEY (`daoEntryId`) REFERENCES `dao_protocol_entries`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clinical_outcomes` ADD CONSTRAINT `clinical_outcomes_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clinical_outcomes` ADD CONSTRAINT `clinical_outcomes_carePlanId_precision_care_plans_id_fk` FOREIGN KEY (`carePlanId`) REFERENCES `precision_care_plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clinical_outcomes` ADD CONSTRAINT `clinical_outcomes_daoEntryId_dao_protocol_entries_id_fk` FOREIGN KEY (`daoEntryId`) REFERENCES `dao_protocol_entries`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clinical_outcomes` ADD CONSTRAINT `clinical_outcomes_documentedById_users_id_fk` FOREIGN KEY (`documentedById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dao_protocol_entries` ADD CONSTRAINT `dao_protocol_entries_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dao_protocol_entries` ADD CONSTRAINT `dao_protocol_entries_physicianId_users_id_fk` FOREIGN KEY (`physicianId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delphi_simulations` ADD CONSTRAINT `delphi_simulations_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delphi_simulations` ADD CONSTRAINT `delphi_simulations_physicianId_users_id_fk` FOREIGN KEY (`physicianId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delphi_simulations` ADD CONSTRAINT `delphi_simulations_daoEntryId_dao_protocol_entries_id_fk` FOREIGN KEY (`daoEntryId`) REFERENCES `dao_protocol_entries`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patients` ADD CONSTRAINT `patients_assignedPhysicianId_users_id_fk` FOREIGN KEY (`assignedPhysicianId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `precision_care_plans` ADD CONSTRAINT `precision_care_plans_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `precision_care_plans` ADD CONSTRAINT `precision_care_plans_physicianId_users_id_fk` FOREIGN KEY (`physicianId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `precision_care_plans` ADD CONSTRAINT `precision_care_plans_daoEntryId_dao_protocol_entries_id_fk` FOREIGN KEY (`daoEntryId`) REFERENCES `dao_protocol_entries`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `precision_care_plans` ADD CONSTRAINT `precision_care_plans_delphiSimulationId_delphi_simulations_id_fk` FOREIGN KEY (`delphiSimulationId`) REFERENCES `delphi_simulations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `safety_reviews` ADD CONSTRAINT `safety_reviews_carePlanId_precision_care_plans_id_fk` FOREIGN KEY (`carePlanId`) REFERENCES `precision_care_plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `safety_reviews` ADD CONSTRAINT `safety_reviews_daoEntryId_dao_protocol_entries_id_fk` FOREIGN KEY (`daoEntryId`) REFERENCES `dao_protocol_entries`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `safety_reviews` ADD CONSTRAINT `safety_reviews_reviewedById_users_id_fk` FOREIGN KEY (`reviewedById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;