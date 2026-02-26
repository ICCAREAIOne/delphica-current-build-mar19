CREATE TABLE `disease_risk_predictions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`physicianId` int NOT NULL,
	`diseaseCode` varchar(50) NOT NULL,
	`diseaseName` varchar(255) NOT NULL,
	`diseaseCategory` varchar(100),
	`riskProbability` decimal(5,4) NOT NULL,
	`riskLevel` enum('low','moderate','high','very_high') NOT NULL,
	`timeHorizon` int NOT NULL,
	`confidenceScore` decimal(5,4),
	`predictionSource` varchar(100) DEFAULT 'Delphi-2M',
	`predictionDate` timestamp DEFAULT (now()),
	`inputFeatures` json,
	`actionTaken` enum('explored','monitored','dismissed','pending') DEFAULT 'pending',
	`scenarioGenerated` boolean NOT NULL DEFAULT false,
	`simulationId` int,
	`clinicalNotes` text,
	`reviewedAt` timestamp,
	`nextReviewDate` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `disease_risk_predictions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `disease_risk_predictions` ADD CONSTRAINT `disease_risk_predictions_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `disease_risk_predictions` ADD CONSTRAINT `disease_risk_predictions_physicianId_users_id_fk` FOREIGN KEY (`physicianId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `disease_risk_predictions` ADD CONSTRAINT `disease_risk_predictions_simulationId_simulation_scenarios_id_fk` FOREIGN KEY (`simulationId`) REFERENCES `simulation_scenarios`(`id`) ON DELETE no action ON UPDATE no action;