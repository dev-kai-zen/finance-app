ALTER TABLE `transactions` ADD COLUMN `currency_code` text DEFAULT 'PHP' NOT NULL;
--> statement-breakpoint
UPDATE `transactions`
SET `currency_code` = (
  SELECT `accounts`.`currency_code`
  FROM `accounts`
  WHERE `accounts`.`id` = `transactions`.`account_id`
)
WHERE EXISTS (
  SELECT 1
  FROM `accounts`
  WHERE `accounts`.`id` = `transactions`.`account_id`
);
--> statement-breakpoint
CREATE INDEX `transactions_currency_code_index` ON `transactions` (`currency_code`);
