CREATE INDEX IF NOT EXISTS `schedule_occurrences_actionable_index` ON `transaction_schedule_occurrences` (`nominal_due_at`, `id`) WHERE `status` IN ('due', 'failed');
