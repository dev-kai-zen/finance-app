ALTER TABLE `transactions` ADD `transaction_group_id` text;--> statement-breakpoint
UPDATE `transactions` SET `amount_cents` = -abs(`amount_cents`), `transaction_group_id` = `id` WHERE `type` = 'transfer' AND `transfer_account_id` IS NOT NULL;--> statement-breakpoint
INSERT INTO `transactions` (`id`, `account_id`, `category_id`, `transaction_group_id`, `type`, `amount_cents`, `name`, `note`, `occurred_at`, `created_at`, `updated_at`)
SELECT lower(hex(randomblob(16))), `transfer_account_id`, NULL, `id`, 'transfer', abs(`amount_cents`), `name`, `note`, `occurred_at`, `created_at`, `updated_at`
FROM `transactions`
WHERE `type` = 'transfer' AND `transfer_account_id` IS NOT NULL;--> statement-breakpoint
CREATE TABLE `transactions__new` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`category_id` text,
	`transaction_group_id` text,
	`type` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`name` text,
	`note` text,
	`occurred_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `transactions__new` (`id`, `account_id`, `category_id`, `transaction_group_id`, `type`, `amount_cents`, `name`, `note`, `occurred_at`, `created_at`, `updated_at`)
SELECT `id`, `account_id`, `category_id`, `transaction_group_id`, `type`, `amount_cents`, `name`, `note`, `occurred_at`, `created_at`, `updated_at` FROM `transactions`;--> statement-breakpoint
DROP TABLE `transactions`;--> statement-breakpoint
ALTER TABLE `transactions__new` RENAME TO `transactions`;--> statement-breakpoint
CREATE INDEX `transactions_account_occurred_at_index` ON `transactions` (`account_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `transactions_category_occurred_at_index` ON `transactions` (`category_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `transactions_transaction_group_id_index` ON `transactions` (`transaction_group_id`);
