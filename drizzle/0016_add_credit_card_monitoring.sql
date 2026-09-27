CREATE TABLE `credit_card_statements` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`kind` text NOT NULL,
	`cycle_start_on` text NOT NULL,
	`cycle_end_on` text NOT NULL,
	`statement_on` text NOT NULL,
	`due_on` text NOT NULL,
	`issued_amount_minor_units` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT `credit_card_statements_kind_check` CHECK (`credit_card_statements`.`kind` IN ('opening', 'billing_cycle')),
	CONSTRAINT `credit_card_statements_issued_amount_check` CHECK (`credit_card_statements`.`issued_amount_minor_units` >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `credit_card_statements_account_statement_unique` ON `credit_card_statements` (`account_id`,`statement_on`,`kind`);
--> statement-breakpoint
CREATE INDEX `credit_card_statements_account_due_index` ON `credit_card_statements` (`account_id`,`due_on`);
--> statement-breakpoint
CREATE TABLE `credit_card_installment_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`purchase_transaction_id` text NOT NULL,
	`term_months` integer NOT NULL,
	`principal_minor_units` integer NOT NULL,
	`first_statement_on` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`purchase_transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT `credit_card_installment_plans_term_check` CHECK (`credit_card_installment_plans`.`term_months` BETWEEN 2 AND 120),
	CONSTRAINT `credit_card_installment_plans_principal_check` CHECK (`credit_card_installment_plans`.`principal_minor_units` > 0),
	CONSTRAINT `credit_card_installment_plans_status_check` CHECK (`credit_card_installment_plans`.`status` IN ('active', 'completed', 'cancelled'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `credit_card_installment_plans_transaction_unique` ON `credit_card_installment_plans` (`purchase_transaction_id`);
--> statement-breakpoint
CREATE INDEX `credit_card_installment_plans_account_status_index` ON `credit_card_installment_plans` (`account_id`,`status`);
--> statement-breakpoint
CREATE TABLE `credit_card_installments` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`installment_number` integer NOT NULL,
	`scheduled_statement_on` text NOT NULL,
	`principal_minor_units` integer NOT NULL,
	`interest_minor_units` integer DEFAULT 0 NOT NULL,
	`fee_minor_units` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `credit_card_installment_plans`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT `credit_card_installments_number_check` CHECK (`credit_card_installments`.`installment_number` > 0),
	CONSTRAINT `credit_card_installments_amounts_check` CHECK (`credit_card_installments`.`principal_minor_units` > 0 AND `credit_card_installments`.`interest_minor_units` >= 0 AND `credit_card_installments`.`fee_minor_units` >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `credit_card_installments_plan_number_unique` ON `credit_card_installments` (`plan_id`,`installment_number`);
--> statement-breakpoint
CREATE INDEX `credit_card_installments_statement_index` ON `credit_card_installments` (`scheduled_statement_on`);
--> statement-breakpoint
CREATE TABLE `credit_card_statement_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`statement_id` text NOT NULL,
	`transaction_id` text,
	`installment_id` text,
	`entry_type` text NOT NULL,
	`amount_minor_units` integer NOT NULL,
	`description_snapshot` text,
	`occurred_on_snapshot` text NOT NULL,
	`reverses_entry_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`statement_id`) REFERENCES `credit_card_statements`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`installment_id`) REFERENCES `credit_card_installments`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT `credit_card_statement_entries_type_check` CHECK (`credit_card_statement_entries`.`entry_type` IN ('opening_balance', 'charge', 'installment', 'refund', 'payment', 'adjustment')),
	CONSTRAINT `credit_card_statement_entries_amount_check` CHECK (`credit_card_statement_entries`.`amount_minor_units` != 0)
);
--> statement-breakpoint
CREATE INDEX `credit_card_statement_entries_statement_index` ON `credit_card_statement_entries` (`statement_id`);
--> statement-breakpoint
CREATE INDEX `credit_card_statement_entries_transaction_index` ON `credit_card_statement_entries` (`transaction_id`);
--> statement-breakpoint
CREATE INDEX `credit_card_statement_entries_installment_index` ON `credit_card_statement_entries` (`installment_id`);
