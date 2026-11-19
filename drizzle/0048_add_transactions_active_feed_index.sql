CREATE INDEX IF NOT EXISTS `transactions_active_feed_index` ON `transactions` (`occurred_at` DESC, `created_at` DESC, `id` DESC) WHERE `deleted_at` IS NULL;
