CREATE TABLE `currencies` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`symbol` text NOT NULL,
	`minor_unit_exponent` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "currencies_minor_unit_exponent_check" CHECK("currencies"."minor_unit_exponent" >= 0 and "currencies"."minor_unit_exponent" <= 18)
);
--> statement-breakpoint
CREATE INDEX `currencies_active_sort_index` ON `currencies` (`is_active`,`sort_order`,`code`);--> statement-breakpoint
ALTER TABLE `transactions` RENAME COLUMN `amount_cents` TO `amount_minor_units`;--> statement-breakpoint
ALTER TABLE `category_budgets` RENAME COLUMN `amount_cents` TO `amount_minor_units`;--> statement-breakpoint
ALTER TABLE `budget_monthly_targets` RENAME COLUMN `amount_cents` TO `amount_minor_units`;--> statement-breakpoint
ALTER TABLE `transaction_schedules` RENAME COLUMN `amount_cents` TO `amount_minor_units`;--> statement-breakpoint
ALTER TABLE `transaction_presets` RENAME COLUMN `amount_cents` TO `amount_minor_units`;
