-- Preserve original templates and flag historical payments for review.
-- Never automatically negate posted expenses: they may be intentional refunds.
INSERT OR IGNORE INTO settings (key, value, updated_at)
SELECT '__subscription_payment_sign_repair_v1', json_object(
  'schedules', (SELECT json_group_array(json_object('id', id, 'amount', amount_minor_units))
    FROM transaction_schedules WHERE amount_minor_units > 0 AND transaction_type = 'expense'
    AND subscription_id IN (SELECT id FROM subscriptions)),
  'occurrences', (SELECT json_group_array(json_object('id', id, 'snapshot', template_snapshot))
    FROM transaction_schedule_occurrences WHERE status IN ('due', 'failed')
    AND schedule_id IN (SELECT id FROM transaction_schedules WHERE transaction_type = 'expense'
      AND subscription_id IN (SELECT id FROM subscriptions))),
  'postedPaymentsForReview', (SELECT json_group_array(json_object(
      'transactionId', t.id, 'amount', t.amount_minor_units, 'updatedAt', t.updated_at))
    FROM subscription_payments p JOIN transactions t ON t.id = p.transaction_id
    JOIN transaction_schedule_postings posting ON posting.transaction_id = t.id
    WHERE t.type = 'expense' AND t.amount_minor_units > 0)
), CAST(strftime('%s', 'now') AS INTEGER) * 1000;
--> statement-breakpoint
UPDATE transaction_schedules SET amount_minor_units = -abs(amount_minor_units)
WHERE transaction_type = 'expense' AND amount_minor_units > 0
AND subscription_id IN (SELECT id FROM subscriptions);
--> statement-breakpoint
UPDATE transaction_schedule_occurrences
SET template_snapshot = json_set(template_snapshot, '$.amountMinorUnits',
  -abs(json_extract(template_snapshot, '$.amountMinorUnits')))
WHERE status IN ('due', 'failed')
AND CASE WHEN json_valid(template_snapshot) THEN
  json_extract(template_snapshot, '$.transactionType') = 'expense'
  AND json_type(template_snapshot, '$.amountMinorUnits') = 'integer'
  AND json_extract(template_snapshot, '$.amountMinorUnits') > 0
ELSE 0 END
AND schedule_id IN (SELECT id FROM transaction_schedules WHERE transaction_type = 'expense'
  AND subscription_id IN (SELECT id FROM subscriptions));
