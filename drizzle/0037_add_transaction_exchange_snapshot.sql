ALTER TABLE `transactions` ADD COLUMN `original_amount_minor_units` integer;
--> statement-breakpoint
ALTER TABLE `transactions` ADD COLUMN `exchange_rate_scaled` integer;
