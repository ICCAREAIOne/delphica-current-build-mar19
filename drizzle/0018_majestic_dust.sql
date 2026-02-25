CREATE TABLE `medical_code_mappings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinical_term` varchar(255) NOT NULL,
	`medical_code_id` int NOT NULL,
	`confidence` decimal(5,2),
	`mapping_source` enum('AI','manual','verified') NOT NULL DEFAULT 'AI',
	`usage_count` int NOT NULL DEFAULT 0,
	`last_used_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `medical_code_mappings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `medical_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code_type` enum('ICD10','CPT','SNOMED') NOT NULL,
	`code` varchar(50) NOT NULL,
	`description` text NOT NULL,
	`category` varchar(100),
	`is_active` boolean NOT NULL DEFAULT true,
	`effective_date` date,
	`expiration_date` date,
	`search_terms` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `medical_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `protocol_medical_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`care_plan_id` int,
	`protocol_delivery_id` int,
	`medical_code_id` int NOT NULL,
	`code_type` enum('ICD10','CPT','SNOMED') NOT NULL,
	`is_primary` boolean NOT NULL DEFAULT false,
	`assignment_method` enum('automatic','manual','verified') NOT NULL DEFAULT 'automatic',
	`verified_by` int,
	`verified_at` timestamp,
	`verification_notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `protocol_medical_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `medical_code_mappings` ADD CONSTRAINT `medical_code_mappings_medical_code_id_medical_codes_id_fk` FOREIGN KEY (`medical_code_id`) REFERENCES `medical_codes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `protocol_medical_codes` ADD CONSTRAINT `protocol_medical_codes_care_plan_id_patient_care_plans_id_fk` FOREIGN KEY (`care_plan_id`) REFERENCES `patient_care_plans`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `protocol_medical_codes` ADD CONSTRAINT `protocol_medical_codes_protocol_delivery_id_protocol_deliveries_id_fk` FOREIGN KEY (`protocol_delivery_id`) REFERENCES `protocol_deliveries`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `protocol_medical_codes` ADD CONSTRAINT `protocol_medical_codes_medical_code_id_medical_codes_id_fk` FOREIGN KEY (`medical_code_id`) REFERENCES `medical_codes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `protocol_medical_codes` ADD CONSTRAINT `protocol_medical_codes_verified_by_users_id_fk` FOREIGN KEY (`verified_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `clinical_term_idx` ON `medical_code_mappings` (`clinical_term`);--> statement-breakpoint
CREATE INDEX `code_idx` ON `medical_codes` (`code`);--> statement-breakpoint
CREATE INDEX `code_type_idx` ON `medical_codes` (`code_type`);