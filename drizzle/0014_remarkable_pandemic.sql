CREATE TABLE `patient_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`physician_id` int NOT NULL,
	`patient_email` varchar(320) NOT NULL,
	`patient_name` varchar(256),
	`invitation_token` varchar(128) NOT NULL,
	`status` enum('pending','accepted','expired') NOT NULL DEFAULT 'pending',
	`expires_at` timestamp NOT NULL,
	`accepted_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `patient_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `patient_invitations_invitation_token_unique` UNIQUE(`invitation_token`)
);
--> statement-breakpoint
ALTER TABLE `patient_invitations` ADD CONSTRAINT `patient_invitations_physician_id_users_id_fk` FOREIGN KEY (`physician_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;