CREATE INDEX IF NOT EXISTS `transactions_active_import_comparison_index`
ON `transactions` (`account_id`, `type`, `amount_minor_units`, `occurred_at`, `id`)
WHERE `deleted_at` IS NULL;
