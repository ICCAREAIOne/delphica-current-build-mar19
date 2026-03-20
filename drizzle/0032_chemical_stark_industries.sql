ALTER TABLE `patients` ADD `phoneMobile` varchar(32);--> statement-breakpoint
ALTER TABLE `patients` ADD `phoneHome` varchar(32);--> statement-breakpoint
ALTER TABLE `patients` ADD `phoneOffice` varchar(32);--> statement-breakpoint
ALTER TABLE `patients` ADD `preferredPhone` enum('mobile','home','office') DEFAULT 'mobile';--> statement-breakpoint
ALTER TABLE `patients` ADD `insurancePrimary` varchar(255);--> statement-breakpoint
ALTER TABLE `patients` ADD `insurancePrimaryPolicyNumber` varchar(128);--> statement-breakpoint
ALTER TABLE `patients` ADD `insurancePrimaryGroupNumber` varchar(128);--> statement-breakpoint
ALTER TABLE `patients` ADD `insurancePrimaryMemberId` varchar(128);--> statement-breakpoint
ALTER TABLE `patients` ADD `insurancePrimaryPhone` varchar(32);--> statement-breakpoint
ALTER TABLE `patients` ADD `insurancePrimaryPlanType` varchar(64);--> statement-breakpoint
ALTER TABLE `patients` ADD `insuranceSecondary` varchar(255);--> statement-breakpoint
ALTER TABLE `patients` ADD `insuranceSecondaryPolicyNumber` varchar(128);--> statement-breakpoint
ALTER TABLE `patients` ADD `insuranceSecondaryGroupNumber` varchar(128);--> statement-breakpoint
ALTER TABLE `patients` ADD `insurancePdfUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `patients` ADD `insuranceBenefitsSummary` json;