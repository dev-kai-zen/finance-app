CREATE INDEX IF NOT EXISTS `schedule_occurrences_calendar_due_index`
ON `transaction_schedule_occurrences` (COALESCE(`effective_due_at`, `nominal_due_at`));
