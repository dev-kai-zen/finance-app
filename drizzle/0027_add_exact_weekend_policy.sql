PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_transaction_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`transaction_type` text NOT NULL,
	`account_id` text NOT NULL,
	`pocket_id` text,
	`category_id` text,
	`to_account_id` text,
	`to_pocket_id` text,
	`amount_cents` integer NOT NULL,
	`name` text,
	`note` text,
	`frequency` text NOT NULL,
	`interval_count` integer DEFAULT 1 NOT NULL,
	`starts_at` integer NOT NULL,
	`time_zone` text NOT NULL,
	`end_mode` text DEFAULT 'never' NOT NULL,
	`max_occurrences` integer,
	`ends_on` text,
	`weekend_policy` text DEFAULT 'exact' NOT NULL,
	`auto_post` integer DEFAULT false NOT NULL,
	`anchor_occurrence_number` integer DEFAULT 1 NOT NULL,
	`next_occurrence_number` integer DEFAULT 1 NOT NULL,
	`next_nominal_at` integer,
	`next_effective_at` integer,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`pocket_id`) REFERENCES `pockets`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`to_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`to_pocket_id`) REFERENCES `pockets`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "transaction_schedules_status_check" CHECK("__new_transaction_schedules"."status" in ('active', 'paused', 'completed')),
	CONSTRAINT "transaction_schedules_type_check" CHECK("__new_transaction_schedules"."transaction_type" in ('income', 'expense', 'transfer')),
	CONSTRAINT "transaction_schedules_frequency_check" CHECK("__new_transaction_schedules"."frequency" in ('once', 'daily', 'weekly', 'monthly', 'yearly')),
	CONSTRAINT "transaction_schedules_end_mode_check" CHECK("__new_transaction_schedules"."end_mode" in ('never', 'after_count', 'on_date')),
	CONSTRAINT "transaction_schedules_weekend_policy_check" CHECK("__new_transaction_schedules"."weekend_policy" in ('exact', 'next_weekday', 'previous_weekday', 'skip')),
	CONSTRAINT "transaction_schedules_amount_check" CHECK("__new_transaction_schedules"."amount_cents" > 0),
	CONSTRAINT "transaction_schedules_interval_check" CHECK("__new_transaction_schedules"."interval_count" > 0),
	CONSTRAINT "transaction_schedules_anchor_occurrence_number_check" CHECK("__new_transaction_schedules"."anchor_occurrence_number" > 0),
	CONSTRAINT "transaction_schedules_occurrence_number_check" CHECK("__new_transaction_schedules"."next_occurrence_number" >= "__new_transaction_schedules"."anchor_occurrence_number"),
	CONSTRAINT "transaction_schedules_end_values_check" CHECK(("__new_transaction_schedules"."end_mode" = 'never' and "__new_transaction_schedules"."max_occurrences" is null and "__new_transaction_schedules"."ends_on" is null)
        or ("__new_transaction_schedules"."end_mode" = 'after_count' and "__new_transaction_schedules"."max_occurrences" > 0 and "__new_transaction_schedules"."ends_on" is null)
        or ("__new_transaction_schedules"."end_mode" = 'on_date' and "__new_transaction_schedules"."max_occurrences" is null and "__new_transaction_schedules"."ends_on" is not null)),
	CONSTRAINT "transaction_schedules_template_check" CHECK(("__new_transaction_schedules"."transaction_type" = 'transfer' and "__new_transaction_schedules"."category_id" is null and "__new_transaction_schedules"."to_account_id" is not null)
        or ("__new_transaction_schedules"."transaction_type" in ('income', 'expense') and "__new_transaction_schedules"."category_id" is not null and "__new_transaction_schedules"."to_account_id" is null and "__new_transaction_schedules"."to_pocket_id" is null))
);
--> statement-breakpoint
INSERT INTO `__new_transaction_schedules`("id", "status", "transaction_type", "account_id", "pocket_id", "category_id", "to_account_id", "to_pocket_id", "amount_cents", "name", "note", "frequency", "interval_count", "starts_at", "time_zone", "end_mode", "max_occurrences", "ends_on", "weekend_policy", "auto_post", "anchor_occurrence_number", "next_occurrence_number", "next_nominal_at", "next_effective_at", "archived_at", "created_at", "updated_at") SELECT "id", "status", "transaction_type", "account_id", "pocket_id", "category_id", "to_account_id", "to_pocket_id", "amount_cents", "name", "note", "frequency", "interval_count", "starts_at", "time_zone", "end_mode", "max_occurrences", "ends_on", "weekend_policy", "auto_post", "anchor_occurrence_number", "next_occurrence_number", "next_nominal_at", "next_effective_at", "archived_at", "created_at", "updated_at" FROM `transaction_schedules`;--> statement-breakpoint
DROP TABLE `transaction_schedules`;--> statement-breakpoint
ALTER TABLE `__new_transaction_schedules` RENAME TO `transaction_schedules`;--> statement-breakpoint
UPDATE `transaction_schedules` SET `weekend_policy` = 'exact', `next_effective_at` = `next_nominal_at` WHERE `frequency` = 'once' AND `weekend_policy` = 'next_weekday';--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `transaction_schedules_due_index` ON `transaction_schedules` (`status`,`next_effective_at`);--> statement-breakpoint
CREATE INDEX `transaction_schedules_account_index` ON `transaction_schedules` (`account_id`);--> statement-breakpoint
CREATE INDEX `transaction_schedules_to_account_index` ON `transaction_schedules` (`to_account_id`);--> statement-breakpoint
CREATE INDEX `transaction_schedules_category_index` ON `transaction_schedules` (`category_id`);