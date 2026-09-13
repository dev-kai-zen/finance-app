ALTER TABLE `categories` ADD `sort_order` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `categories_sort_order_index` ON `categories` (`sort_order`);
