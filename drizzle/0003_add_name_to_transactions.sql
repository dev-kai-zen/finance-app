ALTER TABLE `transactions` ADD COLUMN `name` text;
--> statement-breakpoint
UPDATE `transactions` SET `amount_cents` = -`amount_cents` WHERE `type` = 'expense' AND `amount_cents` > 0;
