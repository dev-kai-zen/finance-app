CREATE TABLE `category_budgets` (
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
	CONSTRAINT "category_budgets_amount_check" CHECK("category_budgets"."amount_cents" >= 0),
	CONSTRAINT "category_budgets_frequency_check" CHECK("category_budgets"."frequency" in ('daily', 'weekly', 'biweekly', 'monthly', 'custom_monthly', 'quarterly', 'yearly')),
	CONSTRAINT "category_budgets_rollover_mode_check" CHECK("category_budgets"."rollover_mode" in ('positive_only', 'full'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `category_budgets_category_id_unique` ON `category_budgets` (`category_id`);--> statement-breakpoint
CREATE INDEX `category_budgets_enabled_index` ON `category_budgets` (`is_enabled`);--> statement-breakpoint
CREATE TABLE `budget_monthly_targets` (
	`id` text PRIMARY KEY NOT NULL,
	`budget_id` text NOT NULL,
	`year` integer NOT NULL,
	`month` integer NOT NULL,
	`amount_cents` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`budget_id`) REFERENCES `category_budgets`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "budget_monthly_targets_month_check" CHECK("budget_monthly_targets"."month" >= 1 and "budget_monthly_targets"."month" <= 12),
	CONSTRAINT "budget_monthly_targets_amount_check" CHECK("budget_monthly_targets"."amount_cents" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `budget_monthly_targets_budget_year_month_unique` ON `budget_monthly_targets` (`budget_id`,`year`,`month`);--> statement-breakpoint
CREATE INDEX `budget_monthly_targets_budget_id_index` ON `budget_monthly_targets` (`budget_id`);