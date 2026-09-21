CREATE TABLE `credit_card_details` (
	`account_id` text PRIMARY KEY NOT NULL,
	`credit_limit_minor_units` integer NOT NULL,
	`statement_day` integer NOT NULL,
	`payment_due_day` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT `credit_card_details_credit_limit_check` CHECK (`credit_card_details`.`credit_limit_minor_units` >= 0),
	CONSTRAINT `credit_card_details_statement_day_check` CHECK (`credit_card_details`.`statement_day` BETWEEN 1 AND 31),
	CONSTRAINT `credit_card_details_payment_due_day_check` CHECK (`credit_card_details`.`payment_due_day` BETWEEN 1 AND 31)
);
