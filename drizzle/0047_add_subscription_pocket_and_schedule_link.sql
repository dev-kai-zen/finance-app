ALTER TABLE `subscriptions` ADD COLUMN `pocket_id` text REFERENCES `pockets`(`id`) ON UPDATE no action ON DELETE set null;
--> statement-breakpoint
ALTER TABLE `subscriptions` ADD COLUMN `ends_on` integer;
--> statement-breakpoint
CREATE INDEX `subscriptions_pocket_idx` ON `subscriptions` (`pocket_id`);
--> statement-breakpoint
ALTER TABLE `transaction_schedules` ADD COLUMN `subscription_id` text;
--> statement-breakpoint
CREATE INDEX `transaction_schedules_subscription_idx` ON `transaction_schedules` (`subscription_id`);

