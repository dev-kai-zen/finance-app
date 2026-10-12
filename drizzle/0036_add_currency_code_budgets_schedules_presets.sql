ALTER TABLE `category_budgets` ADD COLUMN `currency_code` text DEFAULT 'PHP' NOT NULL;
--> statement-breakpoint
ALTER TABLE `transaction_schedules` ADD COLUMN `currency_code` text DEFAULT 'PHP' NOT NULL;
--> statement-breakpoint
UPDATE `transaction_schedules`
SET `currency_code` = (
  SELECT `accounts`.`currency_code`
  FROM `accounts`
  WHERE `accounts`.`id` = `transaction_schedules`.`account_id`
)
WHERE EXISTS (
  SELECT 1
  FROM `accounts`
  WHERE `accounts`.`id` = `transaction_schedules`.`account_id`
);
--> statement-breakpoint
ALTER TABLE `transaction_presets` ADD COLUMN `currency_code` text DEFAULT 'PHP' NOT NULL;
--> statement-breakpoint
UPDATE `transaction_presets`
SET `currency_code` = (
  SELECT `accounts`.`currency_code`
  FROM `accounts`
  WHERE `accounts`.`id` = `transaction_presets`.`account_id`
)
WHERE EXISTS (
  SELECT 1
  FROM `accounts`
  WHERE `accounts`.`id` = `transaction_presets`.`account_id`
);
