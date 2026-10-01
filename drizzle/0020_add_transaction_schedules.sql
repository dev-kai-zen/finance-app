CREATE TABLE `transaction_schedules` (
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
  `weekend_policy` text DEFAULT 'next_weekday' NOT NULL,
  `auto_post` integer DEFAULT false NOT NULL,
  `anchor_occurrence_number` integer DEFAULT 1 NOT NULL,
  `next_occurrence_number` integer DEFAULT 1 NOT NULL,
  `next_nominal_at` integer,
  `next_effective_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (`pocket_id`) REFERENCES `pockets`(`id`) ON UPDATE no action ON DELETE set null,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (`to_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (`to_pocket_id`) REFERENCES `pockets`(`id`) ON UPDATE no action ON DELETE set null,
  CONSTRAINT `transaction_schedules_status_check` CHECK(`transaction_schedules`.`status` in ('active', 'paused', 'completed')),
  CONSTRAINT `transaction_schedules_type_check` CHECK(`transaction_schedules`.`transaction_type` in ('income', 'expense', 'transfer')),
  CONSTRAINT `transaction_schedules_frequency_check` CHECK(`transaction_schedules`.`frequency` in ('once', 'daily', 'weekly', 'monthly', 'yearly')),
  CONSTRAINT `transaction_schedules_end_mode_check` CHECK(`transaction_schedules`.`end_mode` in ('never', 'after_count', 'on_date')),
  CONSTRAINT `transaction_schedules_weekend_policy_check` CHECK(`transaction_schedules`.`weekend_policy` in ('next_weekday', 'previous_weekday', 'skip')),
  CONSTRAINT `transaction_schedules_amount_check` CHECK(`transaction_schedules`.`amount_cents` > 0),
  CONSTRAINT `transaction_schedules_interval_check` CHECK(`transaction_schedules`.`interval_count` > 0),
  CONSTRAINT `transaction_schedules_anchor_occurrence_number_check` CHECK(`transaction_schedules`.`anchor_occurrence_number` > 0),
  CONSTRAINT `transaction_schedules_occurrence_number_check` CHECK(`transaction_schedules`.`next_occurrence_number` >= `transaction_schedules`.`anchor_occurrence_number`),
  CONSTRAINT `transaction_schedules_end_values_check` CHECK((`transaction_schedules`.`end_mode` = 'never' and `transaction_schedules`.`max_occurrences` is null and `transaction_schedules`.`ends_on` is null)
        or (`transaction_schedules`.`end_mode` = 'after_count' and `transaction_schedules`.`max_occurrences` > 0 and `transaction_schedules`.`ends_on` is null)
        or (`transaction_schedules`.`end_mode` = 'on_date' and `transaction_schedules`.`max_occurrences` is null and `transaction_schedules`.`ends_on` is not null)),
  CONSTRAINT `transaction_schedules_template_check` CHECK((`transaction_schedules`.`transaction_type` = 'transfer' and `transaction_schedules`.`category_id` is null and `transaction_schedules`.`to_account_id` is not null)
        or (`transaction_schedules`.`transaction_type` in ('income', 'expense') and `transaction_schedules`.`category_id` is not null and `transaction_schedules`.`to_account_id` is null and `transaction_schedules`.`to_pocket_id` is null))
);
--> statement-breakpoint
CREATE INDEX `transaction_schedules_due_index` ON `transaction_schedules` (`status`,`next_effective_at`);
--> statement-breakpoint
CREATE INDEX `transaction_schedules_account_index` ON `transaction_schedules` (`account_id`);
--> statement-breakpoint
CREATE INDEX `transaction_schedules_to_account_index` ON `transaction_schedules` (`to_account_id`);
--> statement-breakpoint
CREATE INDEX `transaction_schedules_category_index` ON `transaction_schedules` (`category_id`);
--> statement-breakpoint
CREATE TABLE `transaction_schedule_occurrences` (
  `id` text PRIMARY KEY NOT NULL,
  `schedule_id` text NOT NULL,
  `sequence_number` integer NOT NULL,
  `nominal_due_at` integer NOT NULL,
  `effective_due_at` integer,
  `template_snapshot` text NOT NULL,
  `status` text NOT NULL,
  `processed_at` integer,
  `error_message` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`schedule_id`) REFERENCES `transaction_schedules`(`id`) ON UPDATE no action ON DELETE cascade,
  CONSTRAINT `transaction_schedule_occurrences_status_check` CHECK(`transaction_schedule_occurrences`.`status` in ('due', 'posted', 'skipped', 'failed')),
  CONSTRAINT `transaction_schedule_occurrences_sequence_check` CHECK(`transaction_schedule_occurrences`.`sequence_number` > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transaction_schedule_occurrences_schedule_sequence_unique` ON `transaction_schedule_occurrences` (`schedule_id`,`sequence_number`);
--> statement-breakpoint
CREATE UNIQUE INDEX `transaction_schedule_occurrences_schedule_nominal_unique` ON `transaction_schedule_occurrences` (`schedule_id`,`nominal_due_at`);
--> statement-breakpoint
CREATE INDEX `transaction_schedule_occurrences_status_due_index` ON `transaction_schedule_occurrences` (`status`,`effective_due_at`);
--> statement-breakpoint
CREATE TABLE `transaction_schedule_postings` (
  `id` text PRIMARY KEY NOT NULL,
  `occurrence_id` text NOT NULL,
  `transaction_id` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`occurrence_id`) REFERENCES `transaction_schedule_occurrences`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transaction_schedule_postings_occurrence_transaction_unique` ON `transaction_schedule_postings` (`occurrence_id`,`transaction_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `transaction_schedule_postings_transaction_unique` ON `transaction_schedule_postings` (`transaction_id`);
--> statement-breakpoint
CREATE INDEX `transaction_schedule_postings_occurrence_index` ON `transaction_schedule_postings` (`occurrence_id`);
