CREATE TABLE `causal_knowledge_base` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conditionCode` varchar(32) NOT NULL,
	`conditionName` varchar(255) NOT NULL,
	`treatmentCode` varchar(64),
	`treatmentName` varchar(255),
	`guidelineSource` varchar(128),
	`evidenceGrade` enum('A','B','C','D','I') NOT NULL DEFAULT 'C',
	`summary` text NOT NULL,
	`mechanismOfAction` text,
	`indicationsText` text,
	`contraindicationsText` text,
	`keyFindings` text,
	`priorEfficacyMean` decimal(5,4),
	`priorEfficacyVariance` decimal(5,4),
	`betaAlpha` decimal(8,4) DEFAULT '1.0000',
	`betaBeta` decimal(8,4) DEFAULT '1.0000',
	`observationCount` int DEFAULT 0,
	`pmids` json,
	`dois` json,
	`guidelineUrl` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`approvedByPhysicianId` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `causal_knowledge_base_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `delphi_scenario_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`diagnosisCode` varchar(32) NOT NULL,
	`diagnosisName` varchar(255) NOT NULL,
	`comorbidityProfile` json,
	`ageRangeMin` int,
	`ageRangeMax` int,
	`templateName` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`clinicalContext` text,
	`treatmentOptions` json NOT NULL,
	`outcomeDistributions` json,
	`usageCount` int NOT NULL DEFAULT 0,
	`successRate` decimal(5,2),
	`isVerified` boolean NOT NULL DEFAULT false,
	`verifiedByPhysicianId` int,
	`verifiedAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `delphi_scenario_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evidence_cache_engine_tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`evidenceCacheId` int NOT NULL,
	`engine` enum('causal','delphi','both') NOT NULL,
	`engineRelevanceScore` decimal(5,2),
	`queryContext` varchar(512),
	`retrievedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evidence_cache_engine_tags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `causal_knowledge_base` ADD CONSTRAINT `causal_knowledge_base_approvedByPhysicianId_users_id_fk` FOREIGN KEY (`approvedByPhysicianId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delphi_scenario_templates` ADD CONSTRAINT `delphi_scenario_templates_verifiedByPhysicianId_users_id_fk` FOREIGN KEY (`verifiedByPhysicianId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `evidence_cache_engine_tags` ADD CONSTRAINT `evidence_cache_engine_tags_evidenceCacheId_evidence_cache_id_fk` FOREIGN KEY (`evidenceCacheId`) REFERENCES `evidence_cache`(`id`) ON DELETE cascade ON UPDATE no action;