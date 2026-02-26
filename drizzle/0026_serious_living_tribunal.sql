CREATE TABLE `biomarkers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`measurementDate` timestamp NOT NULL,
	`biomarkerType` enum('blood_pressure_systolic','blood_pressure_diastolic','heart_rate','temperature','respiratory_rate','oxygen_saturation','weight','height','bmi','waist_circumference','total_cholesterol','ldl_cholesterol','hdl_cholesterol','triglycerides','glucose_fasting','glucose_random','hba1c','insulin','creatinine','bun','egfr','alt','ast','alkaline_phosphatase','bilirubin','tsh','t3','t4','crp','esr','wbc','rbc','hemoglobin','hematocrit','platelets','vitamin_d','b12','psa','other') NOT NULL,
	`biomarkerName` varchar(255),
	`value` decimal(10,3) NOT NULL,
	`unit` varchar(32) NOT NULL,
	`referenceRangeLow` decimal(10,3),
	`referenceRangeHigh` decimal(10,3),
	`isAbnormal` boolean DEFAULT false,
	`source` enum('lab_test','vital_signs','home_monitoring','wearable_device') NOT NULL,
	`labOrderId` varchar(128),
	`notes` text,
	`enteredBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `biomarkers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `family_histories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`relationship` enum('mother','father','sister','brother','maternal_grandmother','maternal_grandfather','paternal_grandmother','paternal_grandfather','maternal_aunt','maternal_uncle','paternal_aunt','paternal_uncle','daughter','son','other') NOT NULL,
	`relationshipOther` varchar(128),
	`condition` varchar(255) NOT NULL,
	`icdCode` varchar(16),
	`ageAtDiagnosis` int,
	`currentAge` int,
	`ageAtDeath` int,
	`causeOfDeath` varchar(255),
	`isAlive` boolean NOT NULL DEFAULT true,
	`isConfirmed` boolean DEFAULT false,
	`notes` text,
	`recordedBy` int,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `family_histories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lifestyle_assessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`assessmentDate` timestamp NOT NULL,
	`smokingStatus` enum('never','former','current') NOT NULL,
	`cigarettesPerDay` int,
	`yearsSmoked` int,
	`quitDate` date,
	`alcoholConsumption` enum('none','occasional','moderate','heavy') NOT NULL,
	`drinksPerWeek` int,
	`bingeDrinking` boolean DEFAULT false,
	`exerciseFrequency` enum('sedentary','light','moderate','vigorous') NOT NULL,
	`minutesPerWeek` int,
	`exerciseTypes` json,
	`dietQuality` enum('poor','fair','good','excellent') NOT NULL,
	`fruitsVegetablesPerDay` int,
	`fastFoodFrequency` enum('never','rarely','weekly','daily'),
	`sodaConsumption` enum('none','occasional','daily','multiple_daily'),
	`sleepHoursPerNight` decimal(3,1),
	`sleepQuality` enum('poor','fair','good','excellent') NOT NULL,
	`sleepDisorders` json,
	`stressLevel` enum('low','moderate','high','severe') NOT NULL,
	`mentalHealthConditions` json,
	`occupationalHazards` json,
	`environmentalExposures` json,
	`additionalNotes` text,
	`assessedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lifestyle_assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `biomarkers` ADD CONSTRAINT `biomarkers_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `biomarkers` ADD CONSTRAINT `biomarkers_enteredBy_users_id_fk` FOREIGN KEY (`enteredBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `family_histories` ADD CONSTRAINT `family_histories_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `family_histories` ADD CONSTRAINT `family_histories_recordedBy_users_id_fk` FOREIGN KEY (`recordedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lifestyle_assessments` ADD CONSTRAINT `lifestyle_assessments_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lifestyle_assessments` ADD CONSTRAINT `lifestyle_assessments_assessedBy_users_id_fk` FOREIGN KEY (`assessedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;