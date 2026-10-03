PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_category_budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`is_enabled` integer DEFAULT true NOT NULL,
	`amount_cents` integer DEFAULT 0 NOT NULL,
	`frequency` text DEFAULT 'monthly' NOT NULL,
	`start_date` integer NOT NULL,
	`allow_rollover` integer DEFAULT false NOT NULL,
	`rollover_mode` text DEFAULT 'positive_only' NOT NULL,
	`notify_on_exceeded` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "category_budgets_amount_check" CHECK("__new_category_budgets"."amount_cents" >= 0),
	CONSTRAINT "category_budgets_frequency_check" CHECK("__new_category_budgets"."frequency" in ('daily', 'weekly', 'biweekly', 'semi_monthly', 'monthly', 'custom_monthly', 'quarterly', 'yearly')),
	CONSTRAINT "category_budgets_rollover_mode_check" CHECK("__new_category_budgets"."rollover_mode" in ('positive_only', 'full'))
);
--> statement-breakpoint
INSERT INTO `__new_category_budgets`("id", "category_id", "is_enabled", "amount_cents", "frequency", "start_date", "allow_rollover", "rollover_mode", "notify_on_exceeded", "created_at", "updated_at") SELECT "id", "category_id", "is_enabled", "amount_cents", "frequency", "start_date", "allow_rollover", "rollover_mode", "notify_on_exceeded", "created_at", "updated_at" FROM `category_budgets`;--> statement-breakpoint
DROP TABLE `category_budgets`;--> statement-breakpoint
ALTER TABLE `__new_category_budgets` RENAME TO `category_budgets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `category_budgets_category_id_unique` ON `category_budgets` (`category_id`);--> statement-breakpoint
CREATE INDEX `category_budgets_enabled_index` ON `category_budgets` (`is_enabled`);