CREATE TABLE `icd10_codes` (
	`code` varchar(10) NOT NULL,
	`short_desc` varchar(255) NOT NULL,
	`long_desc` varchar(500) NOT NULL,
	`category` varchar(10) NOT NULL,
	`section` varchar(255) NOT NULL DEFAULT '',
	`is_billable` tinyint NOT NULL DEFAULT 1,
	`code_type` varchar(20) NOT NULL DEFAULT 'diagnosis',
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `icd10_codes_code` PRIMARY KEY(`code`)
);
