CREATE TABLE `coding_quality_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`daoEntryId` int NOT NULL,
	`physicianId` int NOT NULL,
	`icd10CodesGenerated` int NOT NULL,
	`icd10CodesAccepted` int NOT NULL,
	`icd10CodesModified` int NOT NULL,
	`icd10CodesRejected` int NOT NULL,
	`icd10AvgConfidence` int NOT NULL,
	`cptCodesGenerated` int NOT NULL,
	`cptCodesAccepted` int NOT NULL,
	`cptCodesModified` int NOT NULL,
	`cptCodesRejected` int NOT NULL,
	`cptAvgConfidence` int NOT NULL,
	`documentationCompletenessScore` int NOT NULL,
	`clinicalSpecificityScore` int NOT NULL,
	`codingAccuracyScore` int NOT NULL,
	`reimbursementOptimizationScore` int NOT NULL,
	`overallQualityScore` int NOT NULL,
	`suggestions` json,
	`processingTimeMs` int NOT NULL,
	`aiModelVersion` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coding_quality_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `physician_performance_analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`physicianId` int NOT NULL,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`totalEncounters` int NOT NULL,
	`totalCodesGenerated` int NOT NULL,
	`totalCodesAccepted` int NOT NULL,
	`avgCodingAccuracy` int NOT NULL,
	`avgDocumentationQuality` int NOT NULL,
	`avgReimbursementOptimization` int NOT NULL,
	`accuracyTrend` enum('improving','stable','declining') NOT NULL,
	`qualityTrend` enum('improving','stable','declining') NOT NULL,
	`commonCodingGaps` json,
	`strengthAreas` json,
	`improvementAreas` json,
	`estimatedReimbursementImpact` int,
	`potentialReimbursementGain` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `physician_performance_analytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `coding_quality_metrics` ADD CONSTRAINT `coding_quality_metrics_daoEntryId_dao_protocol_entries_id_fk` FOREIGN KEY (`daoEntryId`) REFERENCES `dao_protocol_entries`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coding_quality_metrics` ADD CONSTRAINT `coding_quality_metrics_physicianId_users_id_fk` FOREIGN KEY (`physicianId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `physician_performance_analytics` ADD CONSTRAINT `physician_performance_analytics_physicianId_users_id_fk` FOREIGN KEY (`physicianId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;