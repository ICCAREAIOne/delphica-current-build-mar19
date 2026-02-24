CREATE TABLE `lab_request_forms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patient_id` int NOT NULL,
	`physician_id` int NOT NULL,
	`care_plan_id` int,
	`request_date` timestamp NOT NULL,
	`diagnosis` text NOT NULL,
	`icd10_codes` json NOT NULL,
	`tests_requested` json NOT NULL,
	`clinical_history` text,
	`current_medications` json,
	`relevant_findings` text,
	`form_pdf_url` text,
	`generated_at` timestamp,
	`status` enum('draft','generated','sent_to_patient','completed') NOT NULL DEFAULT 'draft',
	`sent_to_patient_at` timestamp,
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lab_request_forms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patient_care_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patient_id` int NOT NULL,
	`physician_id` int NOT NULL,
	`precision_care_plan_id` int,
	`title` varchar(255) NOT NULL,
	`diagnosis` text NOT NULL,
	`goals` json NOT NULL,
	`medications` json,
	`lifestyle` json,
	`monitoring` json NOT NULL,
	`check_in_frequency` enum('daily','every_other_day','weekly','biweekly','monthly') NOT NULL,
	`next_check_in_date` timestamp NOT NULL,
	`status` enum('active','completed','paused','cancelled') NOT NULL DEFAULT 'active',
	`start_date` timestamp NOT NULL,
	`end_date` timestamp,
	`shared_with_patient` boolean NOT NULL DEFAULT false,
	`shared_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patient_care_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patient_check_ins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patient_id` int NOT NULL,
	`care_plan_id` int NOT NULL,
	`check_in_date` timestamp NOT NULL,
	`overall_feeling` int NOT NULL,
	`symptoms` json,
	`metrics` json,
	`medications_taken` json,
	`lifestyle_adherence` json,
	`conversation_summary` text,
	`ai_concerns` json,
	`alert_generated` boolean NOT NULL DEFAULT false,
	`alert_severity` enum('low','medium','high','critical'),
	`alert_reason` text,
	`reviewed_by_physician` boolean NOT NULL DEFAULT false,
	`reviewed_at` timestamp,
	`physician_response` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `patient_check_ins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patient_conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patient_id` int NOT NULL,
	`care_plan_id` int,
	`check_in_id` int,
	`conversation_type` enum('check_in','question','symptom_report','general') NOT NULL,
	`language` varchar(10) NOT NULL DEFAULT 'en',
	`messages` json NOT NULL,
	`context_summary` text,
	`key_topics` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patient_conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patient_lab_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patient_id` int NOT NULL,
	`uploaded_by` enum('patient','physician','system') NOT NULL DEFAULT 'patient',
	`upload_method` enum('manual_entry','pdf_upload','hl7_integration') NOT NULL,
	`test_date` timestamp NOT NULL,
	`lab_name` varchar(255),
	`test_results` json NOT NULL,
	`pdf_url` text,
	`pdf_text` text,
	`reviewed_by_physician` boolean NOT NULL DEFAULT false,
	`reviewed_at` timestamp,
	`reviewed_by_id` int,
	`physician_notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patient_lab_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patient_progress_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patient_id` int NOT NULL,
	`care_plan_id` int NOT NULL,
	`period_start` timestamp NOT NULL,
	`period_end` timestamp NOT NULL,
	`avg_overall_feeling` int,
	`avg_symptom_severity` int,
	`medication_adherence` int,
	`lifestyle_adherence` int,
	`check_in_completion_rate` int,
	`overall_trend` enum('improving','stable','declining','fluctuating') NOT NULL,
	`symptom_trend` enum('improving','stable','worsening'),
	`alerts_generated` int NOT NULL DEFAULT 0,
	`critical_alerts_generated` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `patient_progress_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `physician_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`physician_id` int NOT NULL,
	`patient_id` int NOT NULL,
	`care_plan_id` int,
	`check_in_id` int,
	`alert_type` enum('worsening_symptoms','missed_medications','abnormal_vitals','patient_concern','no_improvement','adverse_reaction') NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`ai_analysis` text,
	`suggested_actions` json,
	`status` enum('pending','acknowledged','in_progress','resolved','dismissed') NOT NULL DEFAULT 'pending',
	`acknowledged_at` timestamp,
	`resolved_at` timestamp,
	`resolution` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `physician_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `lab_request_forms` ADD CONSTRAINT `lab_request_forms_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lab_request_forms` ADD CONSTRAINT `lab_request_forms_physician_id_users_id_fk` FOREIGN KEY (`physician_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lab_request_forms` ADD CONSTRAINT `lab_request_forms_care_plan_id_patient_care_plans_id_fk` FOREIGN KEY (`care_plan_id`) REFERENCES `patient_care_plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_care_plans` ADD CONSTRAINT `patient_care_plans_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_care_plans` ADD CONSTRAINT `patient_care_plans_physician_id_users_id_fk` FOREIGN KEY (`physician_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_care_plans` ADD CONSTRAINT `patient_care_plans_precision_care_plan_id_precision_care_plans_id_fk` FOREIGN KEY (`precision_care_plan_id`) REFERENCES `precision_care_plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_check_ins` ADD CONSTRAINT `patient_check_ins_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_check_ins` ADD CONSTRAINT `patient_check_ins_care_plan_id_patient_care_plans_id_fk` FOREIGN KEY (`care_plan_id`) REFERENCES `patient_care_plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_conversations` ADD CONSTRAINT `patient_conversations_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_conversations` ADD CONSTRAINT `patient_conversations_care_plan_id_patient_care_plans_id_fk` FOREIGN KEY (`care_plan_id`) REFERENCES `patient_care_plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_conversations` ADD CONSTRAINT `patient_conversations_check_in_id_patient_check_ins_id_fk` FOREIGN KEY (`check_in_id`) REFERENCES `patient_check_ins`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_lab_results` ADD CONSTRAINT `patient_lab_results_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_lab_results` ADD CONSTRAINT `patient_lab_results_reviewed_by_id_users_id_fk` FOREIGN KEY (`reviewed_by_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_progress_metrics` ADD CONSTRAINT `patient_progress_metrics_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patient_progress_metrics` ADD CONSTRAINT `patient_progress_metrics_care_plan_id_patient_care_plans_id_fk` FOREIGN KEY (`care_plan_id`) REFERENCES `patient_care_plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `physician_alerts` ADD CONSTRAINT `physician_alerts_physician_id_users_id_fk` FOREIGN KEY (`physician_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `physician_alerts` ADD CONSTRAINT `physician_alerts_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `physician_alerts` ADD CONSTRAINT `physician_alerts_care_plan_id_patient_care_plans_id_fk` FOREIGN KEY (`care_plan_id`) REFERENCES `patient_care_plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `physician_alerts` ADD CONSTRAINT `physician_alerts_check_in_id_patient_check_ins_id_fk` FOREIGN KEY (`check_in_id`) REFERENCES `patient_check_ins`(`id`) ON DELETE no action ON UPDATE no action;