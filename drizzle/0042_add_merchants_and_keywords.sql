CREATE TABLE `merchants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`default_category_id` text,
	`default_account_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`default_category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`default_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `merchants_name_lower_unique` ON `merchants` (lower(`name`));--> statement-breakpoint
CREATE INDEX `merchants_default_category_id_index` ON `merchants` (`default_category_id`);--> statement-breakpoint
CREATE INDEX `merchants_default_account_id_index` ON `merchants` (`default_account_id`);--> statement-breakpoint
CREATE TABLE `merchant_keywords` (
	`id` text PRIMARY KEY NOT NULL,
	`merchant_id` text NOT NULL,
	`keyword` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`merchant_id`) REFERENCES `merchants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `merchant_keywords_keyword_lower_unique` ON `merchant_keywords` (lower(`keyword`));--> statement-breakpoint
CREATE INDEX `merchant_keywords_merchant_id_index` ON `merchant_keywords` (`merchant_id`);
