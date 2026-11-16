CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`amount_minor_units` integer NOT NULL,
	`currency_code` text DEFAULT 'PHP' NOT NULL,
	`billing_cycle` text DEFAULT 'monthly' NOT NULL,
	`billing_cycle_interval` integer DEFAULT 1 NOT NULL,
	`first_billing_date` integer NOT NULL,
	`next_renewal_date` integer NOT NULL,
	`trial_ends_at` integer,
	`cancelled_at` integer,
	`account_id` text,
	`category_id` text,
	`merchant_id` text,
	`schedule_id` text,
	`auto_post` integer DEFAULT false NOT NULL,
	`reminder_lead_days` text DEFAULT '[1,3]' NOT NULL,
	`cancellation_url` text,
	`notes` text,
	`color` text,
	`icon` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived_at` integer,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`merchant_id`) REFERENCES `merchants`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`schedule_id`) REFERENCES `transaction_schedules`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `subscription_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`subscription_id` text NOT NULL,
	`transaction_id` text NOT NULL,
	`paid_at` integer NOT NULL,
	`amount_minor_units` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `subscriptions_status_renewal_idx` ON `subscriptions` (`status`,`next_renewal_date`);--> statement-breakpoint
CREATE INDEX `subscriptions_account_idx` ON `subscriptions` (`account_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_category_idx` ON `subscriptions` (`category_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_schedule_idx` ON `subscriptions` (`schedule_id`);--> statement-breakpoint
CREATE INDEX `subscription_payments_sub_idx` ON `subscription_payments` (`subscription_id`);--> statement-breakpoint
CREATE INDEX `subscription_payments_tx_idx` ON `subscription_payments` (`transaction_id`);
