CREATE TABLE `protocol_deliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`care_plan_id` int,
	`protocol_name` varchar(256) NOT NULL,
	`delivery_type` enum('enrollment','manual','update') NOT NULL,
	`email_sent` boolean NOT NULL DEFAULT false,
	`email_message_id` varchar(256),
	`pdf_generated` boolean NOT NULL DEFAULT false,
	`error_message` text,
	`sent_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `protocol_deliveries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `protocol_deliveries` ADD CONSTRAINT `protocol_deliveries_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `protocol_deliveries` ADD CONSTRAINT `protocol_deliveries_care_plan_id_patient_care_plans_id_fk` FOREIGN KEY (`care_plan_id`) REFERENCES `patient_care_plans`(`id`) ON DELETE no action ON UPDATE no action;