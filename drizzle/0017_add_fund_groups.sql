CREATE TABLE `fund_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_normalized` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fund_groups_sort_order_check` CHECK (`fund_groups`.`sort_order` >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fund_groups_name_normalized_unique` ON `fund_groups` (`name_normalized`);
--> statement-breakpoint
CREATE INDEX `fund_groups_sort_index` ON `fund_groups` (`sort_order`,`name`);
--> statement-breakpoint
CREATE TABLE `fund_group_accounts` (
	`fund_group_id` text NOT NULL,
	`account_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`fund_group_id`, `account_id`),
	FOREIGN KEY (`fund_group_id`) REFERENCES `fund_groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fund_group_accounts_account_unique` ON `fund_group_accounts` (`account_id`);
--> statement-breakpoint
CREATE INDEX `fund_group_accounts_group_sort_index` ON `fund_group_accounts` (`fund_group_id`,`sort_order`);
--> statement-breakpoint
CREATE TABLE `fund_group_pockets` (
	`fund_group_id` text NOT NULL,
	`pocket_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`fund_group_id`, `pocket_id`),
	FOREIGN KEY (`fund_group_id`) REFERENCES `fund_groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pocket_id`) REFERENCES `pockets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fund_group_pockets_pocket_unique` ON `fund_group_pockets` (`pocket_id`);
--> statement-breakpoint
CREATE INDEX `fund_group_pockets_group_sort_index` ON `fund_group_pockets` (`fund_group_id`,`sort_order`);
