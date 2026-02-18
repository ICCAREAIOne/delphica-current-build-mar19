CREATE TABLE `intake_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` int NOT NULL,
	`role` enum('assistant','user') NOT NULL,
	`content` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `intake_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `intake_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patient_id` int,
	`session_token` varchar(128) NOT NULL,
	`status` enum('in_progress','completed','abandoned') NOT NULL DEFAULT 'in_progress',
	`collected_data` json,
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `intake_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `intake_sessions_session_token_unique` UNIQUE(`session_token`)
);
--> statement-breakpoint
ALTER TABLE `intake_messages` ADD CONSTRAINT `intake_messages_session_id_intake_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `intake_sessions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `intake_sessions` ADD CONSTRAINT `intake_sessions_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;