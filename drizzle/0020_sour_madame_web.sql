CREATE TABLE `clinical_observations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`observationType` varchar(128) NOT NULL,
	`observationValue` varchar(255) NOT NULL,
	`unit` varchar(32),
	`notes` text,
	`isAbnormal` boolean DEFAULT false,
	`observedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `clinical_observations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clinical_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`physicianId` int NOT NULL,
	`sessionType` enum('initial_consultation','follow_up','emergency','routine_checkup') NOT NULL,
	`sessionDate` timestamp NOT NULL,
	`chiefComplaint` text,
	`status` enum('in_progress','completed','cancelled') NOT NULL DEFAULT 'in_progress',
	`historyOfPresentIllness` text,
	`reviewOfSystems` json,
	`physicalExamFindings` text,
	`assessmentAndPlan` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	CONSTRAINT `clinical_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `diagnosis_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`diagnosisCode` varchar(16),
	`diagnosisName` varchar(255) NOT NULL,
	`diagnosisType` enum('primary','secondary','differential') NOT NULL,
	`severity` enum('mild','moderate','severe','critical'),
	`onset` varchar(128),
	`duration` varchar(128),
	`symptoms` json,
	`clinicalNotes` text,
	`confidence` enum('low','medium','high') DEFAULT 'medium',
	`status` enum('active','resolved','chronic','ruled_out') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `diagnosis_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `treatment_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`diagnosisId` int,
	`treatmentType` enum('medication','procedure','therapy','lifestyle','referral') NOT NULL,
	`treatmentName` varchar(255) NOT NULL,
	`treatmentCode` varchar(16),
	`dosage` varchar(128),
	`frequency` varchar(128),
	`route` varchar(64),
	`duration` varchar(128),
	`instructions` text,
	`rationale` text,
	`expectedOutcome` text,
	`sideEffects` json,
	`contraindications` json,
	`monitoringParameters` text,
	`status` enum('proposed','active','completed','discontinued') NOT NULL DEFAULT 'proposed',
	`startDate` timestamp,
	`endDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `treatment_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `clinical_observations` ADD CONSTRAINT `clinical_observations_sessionId_clinical_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `clinical_sessions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clinical_sessions` ADD CONSTRAINT `clinical_sessions_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clinical_sessions` ADD CONSTRAINT `clinical_sessions_physicianId_users_id_fk` FOREIGN KEY (`physicianId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `diagnosis_entries` ADD CONSTRAINT `diagnosis_entries_sessionId_clinical_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `clinical_sessions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `treatment_entries` ADD CONSTRAINT `treatment_entries_sessionId_clinical_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `clinical_sessions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `treatment_entries` ADD CONSTRAINT `treatment_entries_diagnosisId_diagnosis_entries_id_fk` FOREIGN KEY (`diagnosisId`) REFERENCES `diagnosis_entries`(`id`) ON DELETE no action ON UPDATE no action;