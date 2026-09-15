ALTER TABLE `accounts` ADD COLUMN `starting_balance_locked` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `accounts` ADD COLUMN `hide_from_selection` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `accounts` ADD COLUMN `hide_from_reports` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `accounts` ADD COLUMN `maintaining_balance_minor_units` integer;
