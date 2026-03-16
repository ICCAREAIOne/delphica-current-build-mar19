CREATE TABLE `outcome_definitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`diagnosisCode` varchar(20) NOT NULL,
	`conditionName` varchar(200) NOT NULL,
	`measurementInstrument` varchar(200) NOT NULL,
	`measurementUnit` varchar(50),
	`successOperator` enum('lt','lte','gt','gte','drop_by','reach') NOT NULL,
	`successThreshold` decimal(10,2) NOT NULL,
	`timeHorizonDays` int NOT NULL,
	`guidelineSource` varchar(200) NOT NULL,
	`evidenceGrade` enum('A','B','C','D') NOT NULL,
	`successCriteriaSummary` text NOT NULL,
	`isComposite` boolean DEFAULT false,
	`compositeGroupId` varchar(50),
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `outcome_definitions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `policy_confidence_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`treatmentCode` varchar(100) NOT NULL,
	`diagnosisCode` varchar(20) NOT NULL,
	`ageGroup` enum('under_40','40_to_65','over_65','all') NOT NULL DEFAULT 'all',
	`genderGroup` enum('male','female','other','all') NOT NULL DEFAULT 'all',
	`confidenceScore` decimal(5,4) NOT NULL,
	`alpha` decimal(10,4) NOT NULL,
	`beta` decimal(10,4) NOT NULL,
	`totalObservations` int NOT NULL DEFAULT 0,
	`recordedAt` timestamp DEFAULT (now()),
	CONSTRAINT `policy_confidence_history_id` PRIMARY KEY(`id`)
);
