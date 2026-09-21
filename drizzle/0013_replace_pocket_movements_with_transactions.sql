INSERT INTO `transactions` (
	`id`,
	`account_id`,
	`category_id`,
	`pocket_id`,
	`transaction_group_id`,
	`type`,
	`amount_cents`,
	`name`,
	`note`,
	`occurred_at`,
	`created_at`,
	`updated_at`,
	`deleted_at`
)
SELECT
	'pocket-transfer:' || `id` || ':out',
	`account_id`,
	NULL,
	`from_pocket_id`,
	'pocket-transfer:' || `id`,
	'transfer',
	-`amount_minor_units`,
	'Pocket transfer',
	`note`,
	`occurred_at`,
	`created_at`,
	`created_at`,
	NULL
FROM `pocket_movements`;
--> statement-breakpoint
INSERT INTO `transactions` (
	`id`,
	`account_id`,
	`category_id`,
	`pocket_id`,
	`transaction_group_id`,
	`type`,
	`amount_cents`,
	`name`,
	`note`,
	`occurred_at`,
	`created_at`,
	`updated_at`,
	`deleted_at`
)
SELECT
	'pocket-transfer:' || `id` || ':in',
	`account_id`,
	NULL,
	`to_pocket_id`,
	'pocket-transfer:' || `id`,
	'transfer',
	`amount_minor_units`,
	'Pocket transfer',
	`note`,
	`occurred_at`,
	`created_at` + 1,
	`created_at` + 1,
	NULL
FROM `pocket_movements`;
--> statement-breakpoint
DROP TABLE `pocket_movements`;
