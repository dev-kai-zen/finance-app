DROP INDEX IF EXISTS `account_types_group_archived_sort_index`;
--> statement-breakpoint
ALTER TABLE `account_types` DROP COLUMN `is_archived`;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `account_types_group_sort_index` ON `account_types` (`account_group`,`sort_order`);
