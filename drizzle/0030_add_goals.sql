CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`note` text,
	`target_amount_minor_units` integer NOT NULL,
	`currency_code` text DEFAULT 'PHP' NOT NULL,
	`account_id` text,
	`pocket_id` text,
	`target_date` integer,
	`icon_key` text,
	`hex_colors_id` text,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`pocket_id`) REFERENCES `pockets`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`hex_colors_id`) REFERENCES `hex_colors`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "goals_target_amount_check" CHECK("goals"."target_amount_minor_units" > 0),
	CONSTRAINT "goals_status_check" CHECK("goals"."status" in ('in_progress', 'completed', 'paused'))
);
--> statement-breakpoint
CREATE INDEX `goals_account_id_index` ON `goals` (`account_id`);--> statement-breakpoint
CREATE INDEX `goals_status_sort_index` ON `goals` (`status`,`sort_order`);