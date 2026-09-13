CREATE TABLE `account_types` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`account_group` text NOT NULL,
	`icon_key` text,
	`color` text,
	`is_system` integer DEFAULT false NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "account_types_account_group_check" CHECK (`account_group` IN ('asset', 'liability')),
	CONSTRAINT "account_types_sort_order_check" CHECK (`sort_order` >= 0)
);
--> statement-breakpoint
CREATE INDEX `account_types_group_archived_sort_index` ON `account_types` (`account_group`,`is_archived`,`sort_order`);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_types_group_name_unique` ON `account_types` (`account_group`,`name`);
--> statement-breakpoint
INSERT OR IGNORE INTO `account_types` (`id`, `name`, `account_group`, `is_system`, `is_archived`, `sort_order`, `created_at`, `updated_at`)
VALUES
  ('system:asset:others', 'Others', 'asset', 1, 0, 0, 1773400000000, 1773400000000),
  ('system:liability:credit-card', 'Credit Card', 'liability', 1, 0, 0, 1773400000000, 1773400000000),
  ('system:liability:others', 'Others', 'liability', 1, 0, 0, 1773400000000, 1773400000000);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`account_type_id` text NOT NULL,
	`name` text NOT NULL,
	`currency_code` text NOT NULL,
	`opening_balance_minor_units` integer DEFAULT 0 NOT NULL,
	`opening_balance_at` integer NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_type_id`) REFERENCES `account_types`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_accounts` (
	`id`,
	`account_type_id`,
	`name`,
	`currency_code`,
	`opening_balance_minor_units`,
	`opening_balance_at`,
	`is_archived`,
	`sort_order`,
	`created_at`,
	`updated_at`
)
SELECT
	`id`,
	CASE
		WHEN LOWER(`type`) IN ('credit_card', 'credit card', 'credit', 'loan', 'mortgage') THEN 'system:liability:credit-card'
		WHEN LOWER(`type`) IN ('liability', 'payable', 'debt') THEN 'system:liability:others'
		WHEN LOWER(`type`) IN ('asset', 'checking', 'savings', 'cash', 'bank', 'investment', 'wallet', 'others') THEN 'system:asset:others'
		ELSE 'system:asset:others'
	END AS `account_type_id`,
	`name`,
	`currency` AS `currency_code`,
	`opening_balance_cents` AS `opening_balance_minor_units`,
	`created_at` AS `opening_balance_at`,
	0 AS `is_archived`,
	0 AS `sort_order`,
	`created_at`,
	`updated_at`
FROM `accounts`;
--> statement-breakpoint
DROP TABLE `accounts`;
--> statement-breakpoint
ALTER TABLE `__new_accounts` RENAME TO `accounts`;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
--> statement-breakpoint
CREATE INDEX `accounts_account_type_id_index` ON `accounts` (`account_type_id`);
--> statement-breakpoint
CREATE INDEX `accounts_archived_sort_index` ON `accounts` (`is_archived`,`sort_order`);