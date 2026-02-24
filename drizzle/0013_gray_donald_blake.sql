ALTER TABLE `users` ADD `stripe_customer_id` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `stripe_subscription_id` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `subscription_status` enum('active','canceled','past_due','trialing','inactive') DEFAULT 'inactive';--> statement-breakpoint
ALTER TABLE `users` ADD `subscription_end_date` timestamp;