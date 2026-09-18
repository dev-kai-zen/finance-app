CREATE TABLE `pockets` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`name` text NOT NULL COLLATE NOCASE,
	`target_amount_minor_units` integer,
	`is_archived` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "pockets_target_non_negative_check" CHECK (`target_amount_minor_units` IS NULL OR `target_amount_minor_units` >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pockets_account_name_unique` ON `pockets` (`account_id`,`name` COLLATE NOCASE);
--> statement-breakpoint
CREATE INDEX `pockets_account_archived_sort_index` ON `pockets` (`account_id`,`is_archived`,`sort_order`);
--> statement-breakpoint
CREATE TABLE `pocket_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`from_pocket_id` text,
	`to_pocket_id` text,
	`amount_minor_units` integer NOT NULL,
	`note` text,
	`occurred_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_pocket_id`) REFERENCES `pockets`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`to_pocket_id`) REFERENCES `pockets`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "pocket_movements_positive_amount_check" CHECK (`amount_minor_units` > 0),
	CONSTRAINT "pocket_movements_endpoints_check" CHECK ((`from_pocket_id` IS NOT NULL OR `to_pocket_id` IS NOT NULL) AND (`from_pocket_id` IS NULL OR `to_pocket_id` IS NULL OR `from_pocket_id` <> `to_pocket_id`))
);
--> statement-breakpoint
CREATE INDEX `pocket_movements_account_occurred_at_index` ON `pocket_movements` (`account_id`,`occurred_at`);
--> statement-breakpoint
CREATE INDEX `pocket_movements_from_pocket_index` ON `pocket_movements` (`from_pocket_id`);
--> statement-breakpoint
CREATE INDEX `pocket_movements_to_pocket_index` ON `pocket_movements` (`to_pocket_id`);
--> statement-breakpoint
ALTER TABLE `transactions` ADD `pocket_id` text REFERENCES pockets(id) ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX `transactions_pocket_occurred_at_index` ON `transactions` (`pocket_id`,`occurred_at`);
