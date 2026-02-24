CREATE TABLE `protocol_customization_audit` (
	`id` int AUTO_INCREMENT NOT NULL,
	`protocol_delivery_id` int NOT NULL,
	`care_plan_id` int NOT NULL,
	`physician_id` int NOT NULL,
	`patient_id` int NOT NULL,
	`original_protocol` json NOT NULL,
	`customized_protocol` json NOT NULL,
	`changes_summary` json,
	`customization_reason` text,
	`allergen_conflicts_resolved` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `protocol_customization_audit_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `protocol_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_by` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`description` text,
	`category` varchar(128) NOT NULL,
	`tags` json,
	`template_data` json NOT NULL,
	`usage_count` int NOT NULL DEFAULT 0,
	`last_used_at` timestamp,
	`is_public` boolean NOT NULL DEFAULT false,
	`is_default` boolean NOT NULL DEFAULT false,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `protocol_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `protocol_customization_audit` ADD CONSTRAINT `protocol_customization_audit_protocol_delivery_id_protocol_deliveries_id_fk` FOREIGN KEY (`protocol_delivery_id`) REFERENCES `protocol_deliveries`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `protocol_customization_audit` ADD CONSTRAINT `protocol_customization_audit_care_plan_id_patient_care_plans_id_fk` FOREIGN KEY (`care_plan_id`) REFERENCES `patient_care_plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `protocol_customization_audit` ADD CONSTRAINT `protocol_customization_audit_physician_id_users_id_fk` FOREIGN KEY (`physician_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `protocol_customization_audit` ADD CONSTRAINT `protocol_customization_audit_patient_id_users_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `protocol_templates` ADD CONSTRAINT `protocol_templates_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;