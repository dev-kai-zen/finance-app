CREATE TABLE `__new_transaction_presets` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_name` text NOT NULL,
	`type` text NOT NULL,
	`account_id` text NOT NULL,
	`pocket_id` text,
	`category_id` text,
	`to_account_id` text,
	`to_pocket_id` text,
	`amount_cents` integer,
	`note` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`usage_count` integer DEFAULT 0 NOT NULL,
	`last_used_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`pocket_id`) REFERENCES `pockets`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`to_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`to_pocket_id`) REFERENCES `pockets`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT `transaction_presets_type_check` CHECK (`__new_transaction_presets`.`type` in ('income', 'expense', 'transfer')),
	CONSTRAINT `transaction_presets_transaction_name_check` CHECK (length(trim(`__new_transaction_presets`.`transaction_name`)) > 0),
	CONSTRAINT `transaction_presets_amount_check` CHECK (`__new_transaction_presets`.`amount_cents` is null or `__new_transaction_presets`.`amount_cents` != 0),
	CONSTRAINT `transaction_presets_transfer_amount_check` CHECK (`__new_transaction_presets`.`type` != 'transfer' or `__new_transaction_presets`.`amount_cents` is null or `__new_transaction_presets`.`amount_cents` > 0),
	CONSTRAINT `transaction_presets_usage_count_check` CHECK (`__new_transaction_presets`.`usage_count` >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_transaction_presets` (
	`id`,
	`transaction_name`,
	`type`,
	`account_id`,
	`pocket_id`,
	`category_id`,
	`to_account_id`,
	`to_pocket_id`,
	`amount_cents`,
	`note`,
	`sort_order`,
	`usage_count`,
	`last_used_at`,
	`created_at`,
	`updated_at`,
	`deleted_at`
)
SELECT
	`id`,
	`transaction_name`,
	`type`,
	`account_id`,
	`pocket_id`,
	`category_id`,
	`to_account_id`,
	`to_pocket_id`,
	`amount_cents`,
	`note`,
	`sort_order`,
	`usage_count`,
	`last_used_at`,
	`created_at`,
	`updated_at`,
	`deleted_at`
FROM `transaction_presets`;
--> statement-breakpoint
DROP TABLE `transaction_presets`;
--> statement-breakpoint
ALTER TABLE `__new_transaction_presets` RENAME TO `transaction_presets`;
--> statement-breakpoint
CREATE INDEX `transaction_presets_active_sort_index` ON `transaction_presets` (`deleted_at`,`sort_order`);
--> statement-breakpoint
CREATE INDEX `transaction_presets_account_id_index` ON `transaction_presets` (`account_id`);
--> statement-breakpoint
CREATE INDEX `transaction_presets_to_account_id_index` ON `transaction_presets` (`to_account_id`);
--> statement-breakpoint
CREATE INDEX `transaction_presets_category_id_index` ON `transaction_presets` (`category_id`);
