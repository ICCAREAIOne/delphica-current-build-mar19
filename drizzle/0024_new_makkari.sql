CREATE TABLE `interaction_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`interactionId` int NOT NULL,
	`scenarioId` int NOT NULL,
	`physicianId` int NOT NULL,
	`realismScore` int NOT NULL,
	`clinicalAccuracy` int NOT NULL,
	`conversationalQuality` int NOT NULL,
	`comments` text,
	`issuesReported` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `interaction_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `outcome_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`outcomeId` int NOT NULL,
	`scenarioId` int NOT NULL,
	`physicianId` int NOT NULL,
	`accuracyScore` int NOT NULL,
	`evidenceQuality` int NOT NULL,
	`clinicalRelevance` int NOT NULL,
	`actualOutcomeOccurred` enum('yes','no','partially','unknown'),
	`actualProbability` decimal(5,2),
	`actualSeverity` enum('mild','moderate','severe','critical'),
	`comments` text,
	`suggestedImprovements` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `outcome_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `interaction_feedback` ADD CONSTRAINT `interaction_feedback_interactionId_scenario_interactions_id_fk` FOREIGN KEY (`interactionId`) REFERENCES `scenario_interactions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `interaction_feedback` ADD CONSTRAINT `interaction_feedback_scenarioId_simulation_scenarios_id_fk` FOREIGN KEY (`scenarioId`) REFERENCES `simulation_scenarios`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `interaction_feedback` ADD CONSTRAINT `interaction_feedback_physicianId_users_id_fk` FOREIGN KEY (`physicianId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `outcome_feedback` ADD CONSTRAINT `outcome_feedback_outcomeId_scenario_outcomes_id_fk` FOREIGN KEY (`outcomeId`) REFERENCES `scenario_outcomes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `outcome_feedback` ADD CONSTRAINT `outcome_feedback_scenarioId_simulation_scenarios_id_fk` FOREIGN KEY (`scenarioId`) REFERENCES `simulation_scenarios`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `outcome_feedback` ADD CONSTRAINT `outcome_feedback_physicianId_users_id_fk` FOREIGN KEY (`physicianId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;