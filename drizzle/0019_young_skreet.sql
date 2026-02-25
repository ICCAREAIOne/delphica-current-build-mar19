CREATE TABLE `billing_claims` (
	`id` int AUTO_INCREMENT NOT NULL,
	`claimNumber` varchar(64) NOT NULL,
	`protocolDeliveryId` int NOT NULL,
	`patientId` int NOT NULL,
	`providerProfileId` int NOT NULL,
	`createdByUserId` int NOT NULL,
	`insuranceCompany` varchar(255),
	`insurancePolicyNumber` varchar(128),
	`insuranceGroupNumber` varchar(128),
	`subscriberName` varchar(255),
	`subscriberDob` timestamp,
	`relationshipToSubscriber` enum('self','spouse','child','other'),
	`serviceDate` timestamp NOT NULL,
	`diagnosisCodes` json NOT NULL,
	`procedureCodes` json NOT NULL,
	`totalCharges` decimal(10,2) NOT NULL,
	`status` enum('draft','submitted','pending','paid','denied','appealed') NOT NULL DEFAULT 'draft',
	`submittedDate` timestamp,
	`paidDate` timestamp,
	`paidAmount` decimal(10,2),
	`notes` text,
	`denialReason` text,
	`pdfUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `billing_claims_id` PRIMARY KEY(`id`),
	CONSTRAINT `billing_claims_claimNumber_unique` UNIQUE(`claimNumber`)
);
--> statement-breakpoint
CREATE TABLE `provider_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`npi` varchar(10) NOT NULL,
	`taxId` varchar(20) NOT NULL,
	`licenseNumber` varchar(64),
	`licenseState` varchar(2),
	`practiceName` varchar(255) NOT NULL,
	`practiceAddress` text NOT NULL,
	`practiceCity` varchar(128) NOT NULL,
	`practiceState` varchar(2) NOT NULL,
	`practiceZip` varchar(10) NOT NULL,
	`practicePhone` varchar(32) NOT NULL,
	`practiceFax` varchar(32),
	`taxonomyCode` varchar(10),
	`specialty` varchar(128),
	`billingContactName` varchar(255),
	`billingContactPhone` varchar(32),
	`billingContactEmail` varchar(320),
	`isActive` boolean NOT NULL DEFAULT true,
	`isPrimary` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `provider_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `billing_claims` ADD CONSTRAINT `billing_claims_protocolDeliveryId_protocol_deliveries_id_fk` FOREIGN KEY (`protocolDeliveryId`) REFERENCES `protocol_deliveries`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `billing_claims` ADD CONSTRAINT `billing_claims_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `billing_claims` ADD CONSTRAINT `billing_claims_providerProfileId_provider_profiles_id_fk` FOREIGN KEY (`providerProfileId`) REFERENCES `provider_profiles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `billing_claims` ADD CONSTRAINT `billing_claims_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `provider_profiles` ADD CONSTRAINT `provider_profiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;