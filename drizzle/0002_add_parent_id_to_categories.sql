ALTER TABLE `categories` ADD COLUMN `parent_id` text REFERENCES `categories`(`id`);
--> statement-breakpoint
DROP INDEX IF EXISTS `categories_type_name_unique`;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `categories_parent_id_index` ON `categories` (`parent_id`);
