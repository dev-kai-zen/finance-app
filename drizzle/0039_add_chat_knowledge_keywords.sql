CREATE TABLE `category_keywords` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`keyword` text NOT NULL,
	`language` text DEFAULT 'any',
	`created_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `category_keywords_keyword_unique` ON `category_keywords` (lower(`keyword`));--> statement-breakpoint
CREATE INDEX `category_keywords_category_id_index` ON `category_keywords` (`category_id`);--> statement-breakpoint
CREATE TABLE `account_keywords` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`keyword` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_keywords_keyword_unique` ON `account_keywords` (lower(`keyword`));--> statement-breakpoint
CREATE INDEX `account_keywords_account_id_index` ON `account_keywords` (`account_id`);
