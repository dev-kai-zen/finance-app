PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_pockets` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`name` text NOT NULL COLLATE NOCASE,
	`is_archived` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_pockets` (`id`, `account_id`, `name`, `is_archived`, `sort_order`, `created_at`, `updated_at`)
SELECT `id`, `account_id`, `name`, `is_archived`, `sort_order`, `created_at`, `updated_at`
FROM `pockets`;--> statement-breakpoint
DROP TABLE `pockets`;--> statement-breakpoint
ALTER TABLE `__new_pockets` RENAME TO `pockets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `pockets_account_name_unique` ON `pockets` (`account_id`,`name` COLLATE NOCASE);--> statement-breakpoint
CREATE INDEX `pockets_account_archived_sort_index` ON `pockets` (`account_id`,`is_archived`,`sort_order`);
