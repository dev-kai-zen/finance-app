CREATE TABLE `goal_accounts` (
	`goal_id` text NOT NULL,
	`account_id` text NOT NULL,
	PRIMARY KEY(`goal_id`, `account_id`),
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `goal_accounts_goal_id_index` ON `goal_accounts` (`goal_id`);--> statement-breakpoint
CREATE INDEX `goal_accounts_account_id_index` ON `goal_accounts` (`account_id`);--> statement-breakpoint
INSERT OR IGNORE INTO `goal_accounts` (`goal_id`, `account_id`) SELECT `id`, `account_id` FROM `goals` WHERE `account_id` IS NOT NULL;