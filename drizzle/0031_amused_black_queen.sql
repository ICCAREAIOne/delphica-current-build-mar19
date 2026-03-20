CREATE TABLE `causal_edges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`graph_id` int NOT NULL,
	`from_node_id` int NOT NULL,
	`to_node_id` int NOT NULL,
	`edge_type` enum('direct','indirect','backdoor','frontdoor') NOT NULL DEFAULT 'direct',
	`estimated_ace` decimal(8,4),
	`ace_unit` varchar(50),
	`evidence_grade` enum('A','B','C','D','E'),
	`guideline_source` varchar(255),
	`is_backdoor` boolean NOT NULL DEFAULT false,
	`description` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `causal_edges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `causal_graphs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`diagnosis_code` varchar(20) NOT NULL,
	`condition_name` varchar(255) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`description` text,
	`guideline_source` varchar(255),
	`created_by_user_id` int,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `causal_graphs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `causal_nodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`graph_id` int NOT NULL,
	`node_type` enum('treatment','outcome','confounder','mediator','collider','instrument') NOT NULL,
	`label` varchar(255) NOT NULL,
	`description` text,
	`code_system` varchar(20),
	`code` varchar(50),
	`is_observable` boolean NOT NULL DEFAULT true,
	`is_latent` boolean NOT NULL DEFAULT false,
	`outcome_def_id` int,
	`position_x` decimal(8,2),
	`position_y` decimal(8,2),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `causal_nodes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cpt_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(10) NOT NULL,
	`description` varchar(512) NOT NULL,
	`category` varchar(64),
	`is_category_iii` tinyint NOT NULL DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `cpt_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `cpt_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `outcome_definition_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`outcomeDefId` int NOT NULL,
	`reviewedByUserId` int NOT NULL,
	`reviewNote` text,
	`reviewedAt` timestamp DEFAULT (now()),
	`accepted` boolean NOT NULL DEFAULT true,
	CONSTRAINT `outcome_definition_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `treatment_arm_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`diagnosis_code` varchar(20) NOT NULL,
	`treatment_name` varchar(255) NOT NULL,
	`age_group` varchar(20) NOT NULL DEFAULT 'all',
	`total_patients` int NOT NULL DEFAULT 0,
	`success_count` int NOT NULL DEFAULT 0,
	`failure_count` int NOT NULL DEFAULT 0,
	`event_rate` decimal(8,6),
	`nnt` decimal(10,2),
	`nnh` decimal(10,2),
	`control_arm_id` int,
	`last_updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `treatment_arm_stats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `causal_analyses` MODIFY COLUMN `treatmentCode` varchar(16);--> statement-breakpoint
ALTER TABLE `causal_analyses` MODIFY COLUMN `effectSize` decimal(5,3);--> statement-breakpoint
ALTER TABLE `causal_analyses` MODIFY COLUMN `pValue` decimal(5,4);--> statement-breakpoint
ALTER TABLE `causal_analyses` MODIFY COLUMN `lastUpdated` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `session_comments` MODIFY COLUMN `commentType` enum('general','diagnosis','treatment','recommendation','patient_request') NOT NULL DEFAULT 'general';--> statement-breakpoint
ALTER TABLE `simulation_scenarios` MODIFY COLUMN `simulationGoal` text;--> statement-breakpoint
ALTER TABLE `causal_analyses` ADD `diagnosisName` varchar(255);--> statement-breakpoint
ALTER TABLE `causal_analyses` ADD `treatmentName` varchar(255);--> statement-breakpoint
ALTER TABLE `causal_analyses` ADD `evidenceLevel` varchar(64);--> statement-breakpoint
ALTER TABLE `causal_analyses` ADD `studyCount` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `causal_analyses` ADD `patientCount` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `causal_analyses` ADD `analysisMethod` varchar(128);--> statement-breakpoint
ALTER TABLE `causal_analyses` ADD `limitations` text;--> statement-breakpoint
ALTER TABLE `causal_analyses` ADD `outcomeMetrics` json;--> statement-breakpoint
ALTER TABLE `causal_analyses` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `icd10_codes` ADD `created_at` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `causal_edges` ADD CONSTRAINT `causal_edges_graph_id_causal_graphs_id_fk` FOREIGN KEY (`graph_id`) REFERENCES `causal_graphs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `causal_edges` ADD CONSTRAINT `causal_edges_from_node_id_causal_nodes_id_fk` FOREIGN KEY (`from_node_id`) REFERENCES `causal_nodes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `causal_edges` ADD CONSTRAINT `causal_edges_to_node_id_causal_nodes_id_fk` FOREIGN KEY (`to_node_id`) REFERENCES `causal_nodes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `causal_nodes` ADD CONSTRAINT `causal_nodes_graph_id_causal_graphs_id_fk` FOREIGN KEY (`graph_id`) REFERENCES `causal_graphs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `outcome_definition_reviews` ADD CONSTRAINT `outcome_definition_reviews_reviewedByUserId_users_id_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `icd10_codes` DROP COLUMN `createdAt`;