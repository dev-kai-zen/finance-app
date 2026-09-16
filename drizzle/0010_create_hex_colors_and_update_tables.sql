CREATE TABLE IF NOT EXISTS `hex_colors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`hex` text NOT NULL,
	`is_system` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO `hex_colors` (`id`, `name`, `hex`, `is_system`, `created_at`, `updated_at`) VALUES
  ('color_blue', 'Blue', '#2563EB', 1, 1773400000000, 1773400000000),
  ('color_teal', 'Teal', '#0D9488', 1, 1773400000000, 1773400000000),
  ('color_green', 'Green', '#16A34A', 1, 1773400000000, 1773400000000),
  ('color_lime', 'Lime', '#84CC16', 1, 1773400000000, 1773400000000),
  ('color_amber', 'Amber', '#D97706', 1, 1773400000000, 1773400000000),
  ('color_orange', 'Orange', '#EA580C', 1, 1773400000000, 1773400000000),
  ('color_red', 'Red', '#DC2626', 1, 1773400000000, 1773400000000),
  ('color_purple', 'Purple', '#9333EA', 1, 1773400000000, 1773400000000),
  ('color_indigo', 'Indigo', '#4F46E5', 1, 1773400000000, 1773400000000),
  ('color_pink', 'Pink', '#DB2777', 1, 1773400000000, 1773400000000),
  ('color_slate', 'Slate', '#64748B', 1, 1773400000000, 1773400000000);
--> statement-breakpoint
DROP TABLE IF EXISTS `__new_account_types`;
--> statement-breakpoint
CREATE TABLE `__new_account_types` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`account_group` text NOT NULL,
	`icon_key` text,
	`hex_colors_id` text,
	`is_system` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "account_types_account_group_check" CHECK (`account_group` IN ('asset', 'liability')),
	CONSTRAINT "account_types_sort_order_check" CHECK (`sort_order` >= 0),
	FOREIGN KEY (`hex_colors_id`) REFERENCES `hex_colors`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_account_types` (
	`id`,
	`name`,
	`account_group`,
	`icon_key`,
	`hex_colors_id`,
	`is_system`,
	`sort_order`,
	`created_at`,
	`updated_at`
)
SELECT
	`id`,
	`name`,
	`account_group`,
	`icon_key`,
	CASE `color`
		WHEN 'blue' THEN 'color_blue'
		WHEN '#2563EB' THEN 'color_blue'
		WHEN 'teal' THEN 'color_teal'
		WHEN '#0D9488' THEN 'color_teal'
		WHEN 'green' THEN 'color_green'
		WHEN '#16A34A' THEN 'color_green'
		WHEN 'lime' THEN 'color_lime'
		WHEN '#84CC16' THEN 'color_lime'
		WHEN 'amber' THEN 'color_amber'
		WHEN '#D97706' THEN 'color_amber'
		WHEN 'orange' THEN 'color_orange'
		WHEN '#EA580C' THEN 'color_orange'
		WHEN 'red' THEN 'color_red'
		WHEN '#DC2626' THEN 'color_red'
		WHEN 'purple' THEN 'color_purple'
		WHEN '#9333EA' THEN 'color_purple'
		WHEN 'indigo' THEN 'color_indigo'
		WHEN '#4F46E5' THEN 'color_indigo'
		WHEN 'pink' THEN 'color_pink'
		WHEN '#DB2777' THEN 'color_pink'
		WHEN 'slate' THEN 'color_slate'
		WHEN '#64748B' THEN 'color_slate'
		ELSE NULL
	END AS `hex_colors_id`,
	`is_system`,
	`sort_order`,
	`created_at`,
	`updated_at`
FROM `account_types`;
--> statement-breakpoint
DROP TABLE `account_types`;
--> statement-breakpoint
ALTER TABLE `__new_account_types` RENAME TO `account_types`;
--> statement-breakpoint
CREATE INDEX `account_types_group_sort_index` ON `account_types` (`account_group`,`sort_order`);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_types_group_name_unique` ON `account_types` (`account_group`,`name`);
--> statement-breakpoint
DROP TABLE IF EXISTS `__new_categories`;
--> statement-breakpoint
CREATE TABLE `__new_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`parent_id` text,
	`hex_colors_id` text,
	`icon` text,
	`is_system` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`hex_colors_id`) REFERENCES `hex_colors`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_categories` (
	`id`,
	`name`,
	`type`,
	`parent_id`,
	`hex_colors_id`,
	`icon`,
	`is_system`,
	`sort_order`,
	`created_at`,
	`updated_at`
)
SELECT
	`id`,
	`name`,
	`type`,
	`parent_id`,
	CASE `color`
		WHEN 'blue' THEN 'color_blue'
		WHEN '#2563EB' THEN 'color_blue'
		WHEN 'teal' THEN 'color_teal'
		WHEN '#0D9488' THEN 'color_teal'
		WHEN 'green' THEN 'color_green'
		WHEN '#16A34A' THEN 'color_green'
		WHEN 'lime' THEN 'color_lime'
		WHEN '#84CC16' THEN 'color_lime'
		WHEN 'amber' THEN 'color_amber'
		WHEN '#D97706' THEN 'color_amber'
		WHEN 'orange' THEN 'color_orange'
		WHEN '#EA580C' THEN 'color_orange'
		WHEN 'red' THEN 'color_red'
		WHEN '#DC2626' THEN 'color_red'
		WHEN 'purple' THEN 'color_purple'
		WHEN '#9333EA' THEN 'color_purple'
		WHEN 'indigo' THEN 'color_indigo'
		WHEN '#4F46E5' THEN 'color_indigo'
		WHEN 'pink' THEN 'color_pink'
		WHEN '#DB2777' THEN 'color_pink'
		WHEN 'slate' THEN 'color_slate'
		WHEN '#64748B' THEN 'color_slate'
		ELSE NULL
	END AS `hex_colors_id`,
	`icon`,
	`is_system`,
	`sort_order`,
	`created_at`,
	`updated_at`
FROM `categories`;
--> statement-breakpoint
DROP TABLE `categories`;
--> statement-breakpoint
ALTER TABLE `__new_categories` RENAME TO `categories`;
--> statement-breakpoint
CREATE INDEX `categories_type_index` ON `categories` (`type`);
--> statement-breakpoint
CREATE INDEX `categories_parent_id_index` ON `categories` (`parent_id`);
--> statement-breakpoint
CREATE INDEX `categories_sort_order_index` ON `categories` (`sort_order`);
--> statement-breakpoint
PRAGMA foreign_key_check;
