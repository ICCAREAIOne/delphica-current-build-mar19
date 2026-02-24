CREATE TABLE `physician_template_presets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`physician_id` int NOT NULL,
	`base_template_id` int,
	`name` varchar(256) NOT NULL,
	`description` text,
	`category` varchar(128) NOT NULL,
	`tags` json,
	`template_data` json NOT NULL,
	`usage_count` int NOT NULL DEFAULT 0,
	`last_used_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `physician_template_presets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `protocol_template_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`template_id` int NOT NULL,
	`version_number` int NOT NULL,
	`change_summary` text NOT NULL,
	`changed_by` int NOT NULL,
	`template_data` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `protocol_template_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `template_outcome_correlations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`template_id` int NOT NULL,
	`total_usages` int NOT NULL DEFAULT 0,
	`successful_outcomes` int NOT NULL DEFAULT 0,
	`unsuccessful_outcomes` int NOT NULL DEFAULT 0,
	`success_rate` decimal(5,2),
	`avg_customization_count` decimal(5,2),
	`most_customized_fields` json,
	`last_calculated_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `template_outcome_correlations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `template_usage_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`template_id` int,
	`preset_id` int,
	`physician_id` int NOT NULL,
	`patient_id` int,
	`was_customized` boolean NOT NULL DEFAULT false,
	`customization_count` int DEFAULT 0,
	`outcome_recorded` boolean NOT NULL DEFAULT false,
	`outcome_success` boolean,
	`outcome_notes` text,
	`outcome_recorded_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `template_usage_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `physician_template_presets` ADD CONSTRAINT `physician_template_presets_physician_id_users_id_fk` FOREIGN KEY (`physician_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `physician_template_presets` ADD CONSTRAINT `physician_template_presets_base_template_id_protocol_templates_id_fk` FOREIGN KEY (`base_template_id`) REFERENCES `protocol_templates`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `protocol_template_versions` ADD CONSTRAINT `protocol_template_versions_template_id_protocol_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `protocol_templates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `protocol_template_versions` ADD CONSTRAINT `protocol_template_versions_changed_by_users_id_fk` FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `template_outcome_correlations` ADD CONSTRAINT `template_outcome_correlations_template_id_protocol_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `protocol_templates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `template_usage_logs` ADD CONSTRAINT `template_usage_logs_template_id_protocol_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `protocol_templates`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `template_usage_logs` ADD CONSTRAINT `template_usage_logs_preset_id_physician_template_presets_id_fk` FOREIGN KEY (`preset_id`) REFERENCES `physician_template_presets`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `template_usage_logs` ADD CONSTRAINT `template_usage_logs_physician_id_users_id_fk` FOREIGN KEY (`physician_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `template_usage_logs` ADD CONSTRAINT `template_usage_logs_patient_id_users_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;