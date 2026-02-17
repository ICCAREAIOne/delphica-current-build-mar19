CREATE TABLE `knowledge_base` (
	`id` int AUTO_INCREMENT NOT NULL,
	`compound_name` varchar(255) NOT NULL,
	`category` varchar(128) NOT NULL,
	`summary` text NOT NULL,
	`mechanisms` json NOT NULL,
	`clinical_evidence` json NOT NULL,
	`dosing` json,
	`contraindications` json,
	`interactions` json,
	`sources` json NOT NULL,
	`tags` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_by` int,
	CONSTRAINT `knowledge_base_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledge_base_references` (
	`id` int AUTO_INCREMENT NOT NULL,
	`knowledge_base_id` int NOT NULL,
	`title` varchar(512) NOT NULL,
	`authors` text,
	`journal` varchar(255),
	`year` int,
	`doi` varchar(128),
	`pmid` varchar(32),
	`url` text,
	`abstract` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `knowledge_base_references_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledge_base_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`knowledge_base_id` int NOT NULL,
	`encounter_id` int,
	`physician_id` int NOT NULL,
	`context` varchar(128),
	`used_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `knowledge_base_usage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `knowledge_base` ADD CONSTRAINT `knowledge_base_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `knowledge_base_references` ADD CONSTRAINT `knowledge_base_references_knowledge_base_id_knowledge_base_id_fk` FOREIGN KEY (`knowledge_base_id`) REFERENCES `knowledge_base`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `knowledge_base_usage` ADD CONSTRAINT `knowledge_base_usage_knowledge_base_id_knowledge_base_id_fk` FOREIGN KEY (`knowledge_base_id`) REFERENCES `knowledge_base`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `knowledge_base_usage` ADD CONSTRAINT `knowledge_base_usage_physician_id_users_id_fk` FOREIGN KEY (`physician_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;