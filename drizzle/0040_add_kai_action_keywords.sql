CREATE TABLE `action_keywords` (
	`id` text PRIMARY KEY NOT NULL,
	`action_type` text NOT NULL,
	`keyword` text NOT NULL,
	`language` text DEFAULT 'any',
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `action_keywords_keyword_unique` ON `action_keywords` (lower(`keyword`));--> statement-breakpoint
CREATE INDEX `action_keywords_action_type_index` ON `action_keywords` (`action_type`);
