CREATE TABLE `scenario_comparisons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`physicianId` int NOT NULL,
	`scenarioIds` json NOT NULL,
	`ranking` json,
	`selectedScenarioId` int,
	`physicianNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scenario_comparisons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scenario_interactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scenarioId` int NOT NULL,
	`role` enum('physician','patient','system') NOT NULL,
	`message` text NOT NULL,
	`dayInSimulation` int,
	`interactionType` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scenario_interactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scenario_outcomes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scenarioId` int NOT NULL,
	`outcomeType` varchar(128) NOT NULL,
	`probability` decimal(5,2) NOT NULL,
	`severity` enum('mild','moderate','severe','critical'),
	`expectedDay` int,
	`duration` int,
	`evidenceSource` varchar(255),
	`confidenceScore` decimal(5,2),
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scenario_outcomes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `simulation_scenarios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`physicianId` int NOT NULL,
	`patientId` int NOT NULL,
	`scenarioName` varchar(255) NOT NULL,
	`diagnosisCode` varchar(16) NOT NULL,
	`treatmentCode` varchar(16) NOT NULL,
	`treatmentDescription` text NOT NULL,
	`patientAge` int,
	`patientGender` varchar(16),
	`comorbidities` json,
	`currentMedications` json,
	`allergies` json,
	`timeHorizon` int,
	`simulationGoal` varchar(255),
	`status` enum('draft','running','completed','archived') DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `simulation_scenarios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `scenario_comparisons` ADD CONSTRAINT `scenario_comparisons_sessionId_clinical_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `clinical_sessions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scenario_comparisons` ADD CONSTRAINT `scenario_comparisons_physicianId_users_id_fk` FOREIGN KEY (`physicianId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scenario_comparisons` ADD CONSTRAINT `scenario_comparisons_selectedScenarioId_simulation_scenarios_id_fk` FOREIGN KEY (`selectedScenarioId`) REFERENCES `simulation_scenarios`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scenario_interactions` ADD CONSTRAINT `scenario_interactions_scenarioId_simulation_scenarios_id_fk` FOREIGN KEY (`scenarioId`) REFERENCES `simulation_scenarios`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scenario_outcomes` ADD CONSTRAINT `scenario_outcomes_scenarioId_simulation_scenarios_id_fk` FOREIGN KEY (`scenarioId`) REFERENCES `simulation_scenarios`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `simulation_scenarios` ADD CONSTRAINT `simulation_scenarios_sessionId_clinical_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `clinical_sessions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `simulation_scenarios` ADD CONSTRAINT `simulation_scenarios_physicianId_users_id_fk` FOREIGN KEY (`physicianId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `simulation_scenarios` ADD CONSTRAINT `simulation_scenarios_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;