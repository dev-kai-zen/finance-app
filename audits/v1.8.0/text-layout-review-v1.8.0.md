# Text layout review — v1.8.0

**Date:** November 26, 2026 — Asia/Manila  
**Reviewed commit:** `699251f` (initial working tree clean).  
**Status:** Source review complete; native/manual validation pending. No UI fixes applied.

All nine previous audit reports are reopened **for the new text-layout criterion only**. Historical functional findings and accepted policies remain as recorded. Their previous sign-off does not establish that the new checklist passes. See the [shared audit checklist](../AUDIT_CHECKLIST.md).

## Manual revisit list

The order below prioritizes layouts with several competing siblings. These are source-backed risk candidates, **not device-reproduced overlap bugs**. Check all nine; a lower priority does not mean the feature passes.

| ID / priority | Feature and surface | Source evidence | Manual check / pass condition |
| --- | --- | --- | --- |
| TXT-ST-01 / High | Scheduled Transactions: Needs attention and schedule cards | [ScheduledOccurrenceCard](../../src/modules/scheduled-transactions/components/scheduled-occurrence-card.tsx): `cardMain` can shrink, but the amount has no width/shrink limit; title shares a row with a status badge. Outer actions wrap, but nested `rightActions` does not. [Schedule list](../../src/modules/scheduled-transactions/screens/scheduled-transactions-screen.tsx) also places an amount beside template details. | Long schedule/account/category names + a large signed amount; due and failed cards with long errors; transfer destination; Spanish/Filipino Retry/Skip/Post labels. Amount, badge and actions stay inside the card and remain readable. Existing outer wrapping is a safeguard, not proof of failure or success. |
| TXT-BUD-01 / High | Budgets: Spent / Budget / Remaining columns | [BudgetCard](../../src/modules/budgets/components/budget-card.tsx): three equal-width, `minWidth: 0` groups. Only the target amount has a one-line fit policy; spent and remaining use unconstrained text within their columns. | Large spending, target and over-budget values; custom periods, long category, rollover, privacy mode and translated labels. No neighboring-column intrusion, missing digits, or unreadably compressed amounts. Existing footer wrapping must remain intact. |
| TXT-CAL-01 / High | Calendar: summary ribbon and schedule groups | [CalendarSummaryRibbon](../../src/modules/calendar/components/calendar-summary-ribbon.tsx): equal-width metric cells with unbounded value/label rows. [CalendarSchedulesTab](../../src/modules/calendar/components/calendar-schedules-tab.tsx): non-wrapping date/count header and right amount/actions column. | All four tabs, month/day scope, long localized dates, large totals and counts, failed occurrences, long account names. Cells, badges and Post/Retry/Skip stay separated; also inspect seven-column day cells at large text. |
| TXT-ACCT-01 / High | Accounts: account row, custom type tag, amount | [AccountRow](../../src/modules/accounts/components/account-row.tsx): flexible left/info columns and a one-line name; right balance has no maximum width/shrink policy. Metadata wraps, but a long type tag is itself unbounded. | Long account and custom type names + large/negative/foreign balances; default income/expense tags; archived rows and pocket/group views. Amount and tags remain inside the card; full names can still be inspected. |
| TXT-DASH-01 / High | Dashboard: Cash Flow header/net row and Net Worth badges | [DashboardCashflowCard](../../src/modules/dashboard/components/dashboard-cashflow-card.tsx): savings pill cannot shrink; net row has no wrapping or explicit width budget for label/value. [DashboardNetWorthCard](../../src/modules/dashboard/components/dashboard-net-worth-card.tsx): trend pill cannot shrink; labels sit beside fixed icons. Main net worth already has fitting/bounds. | Simple and detailed Home; large positive/negative values and percentages, translated savings/no-prior-month labels, long month; privacy on/off. Inspect each active card, not the unused monthly-cashflow component. Badges must not consume the whole value area. |
| TXT-SUB-01 / High | Subscriptions (new audit): card, burn-rate summary and Mark Paid | [SubscriptionCard](../../src/modules/subscriptions/components/subscription-card.tsx): non-wrapping metadata/action rows, unconstrained amount column. [Summary](../../src/modules/subscriptions/components/subscription-burn-rate-summary.tsx): non-wrapping title/count, amount/suffix and projection/chip rows. [MarkPaidModal](../../src/modules/subscriptions/components/mark-paid-modal.tsx): selector text beside icon/chevron and footer buttons without reflow. | Long subscription/account/pocket/category, trial badge, large amount, Manage link plus all actions; translated summary chips; long selected account in Mark Paid. Verify modal content/actions fit vertically at large text too. See SUB-F07. |
| TXT-CC-01 / Medium | Credit Cards: metrics and recent activity | [CreditCardMonitoringCard](../../src/modules/credit-cards/components/credit-card-monitoring-card.tsx): metric values can shrink, but labels do not; activity amount column has `flexShrink: 0`. | Long card name, translated metrics, large limit/billed/available amounts, opening statement and long activity titles/dates. Validate existing value wrapping rather than assuming every metric fails. Open activity and limit-warning modals too. |
| TXT-TX-01 / Medium | Transactions: compact amount/balance column and detail lines | [TransactionRow](../../src/modules/transactions/components/transaction-row.tsx): compact right column has `flexShrink: 0`, with single-line amounts/balances; detailed mode already applies shrinking to several values. | Compact/detailed modes, long name/note/account/pocket, large amount and running balance, transfer with both balances/fee/FX text, split share and labels. Neither title nor amount loses its readable path. Inspect forms and detail modal with the same fixture. |
| TXT-CAT-01 / Medium | Categories: group header with every action | [CategoryGroupCard](../../src/modules/categories/components/category-group-card.tsx): two-line title and `minWidth: 0` protect names, but fixed icon/action widths consume a narrow header. Outer card hides overflow. | Long group name, at least two subcategories and deletable group so expand/reorder/add/edit/delete are all visible; long subcategory; expanded/collapsed. Titles remain useful and no action is clipped by the card. Current guards reduce risk; they do not replace native testing. |
| TXT-GDB-01 / Medium | Google Drive Backup: connected account and scheduled-backup headers | [GoogleDriveBackupPanel](../../src/modules/google-drive-backup/components/google-drive-backup-panel.tsx): icon + flexible copy + disconnect chip; inner title/PRO row does not wrap and outer card hides overflow. [ScheduledBackupCard](../../src/modules/google-drive-backup/components/scheduled-backup-card.tsx): wrapping title row already helps, with fixed icon/switch siblings. | Long signed-in email/name with translated Disconnect; free/Pro states; scheduled-backup title/help/toggle; restore rows and Quick Sync conflict/error messages. Confirm wrapping does not push controls outside borders or conceal text. |

## How to check manually

1. Start with the smallest supported phone (include 320/360 logical-pixel widths), normal display size and font scale. Use valid long names and a large amount such as `999,999,999.99` where supported.
2. Repeat in English, Filipino and Spanish at normal, approximately 130%, 150% and 200% system text scale where available. Then check landscape/larger display size. Use the [complete matrix](../AUDIT_CHECKLIST.md#test-matrix) for final sign-off.
3. Follow each row's surface/state list. Check both ordinary and privacy-masked amounts. Scroll to the next card to reveal vertical overflow; open related forms with the keyboard visible.
4. For a failure, record the TXT ID, exact name/value, language, width, font/display scale, device/OS, navigation steps, expected/actual, and screenshot. Do not fix it during this review pass.
5. Mark each row **native reproduced**, **passes tested matrix**, or **accepted limitation** and describe coverage. All rows currently remain **source risk / needs native validation**.

| Manual outcome | Tester / date / device / settings | Evidence and result |
| --- | --- | --- |
| TXT-ST-01 | Pending | Pending |
| TXT-BUD-01 | Pending | Pending |
| TXT-CAL-01 | Pending | Pending |
| TXT-ACCT-01 | Pending | Pending |
| TXT-DASH-01 | Pending | Pending |
| TXT-SUB-01 | Pending | Pending |
| TXT-CC-01 | Pending | Pending |
| TXT-TX-01 | Pending | Pending |
| TXT-CAT-01 | Pending | Pending |
| TXT-GDB-01 | Pending | Pending |

## Next feature audit order

1. **Subscriptions — audit conducted:** [subscriptions-audit-v1.8.0.md](subscriptions-audit-v1.8.0.md). Calendar recommended Reports next, with Subscriptions following it; this pass prioritizes Subscriptions because currency/payment/renewal ownership still has concrete financial risks after scheduler remediation. Scheduler sign-off covers shared paths, not the whole subscription lifecycle.
2. **Reports:** Reconcile all five views, comparisons, dates, refunds/splits/fees, currencies, drill-downs/exports, lazy tab queries, charts and dense tables. This remains the next unaudited feature.
3. **Goals:** Check currency aggregation and linked account/pocket ownership, contributions, derived progress, archive/delete, shared refresh, and progress-card containment.
4. **Data Import:** Check preview/commit parity, duplicates, currency/date parsing, failure rollback, Pro limits, large batches and long imported text.
5. **Local Backup / Restore:** Verify full restoration, attachment handling, migrations, database replacement and recovery independently of Drive transport.
6. **Global Search / Quick Entry**, then **Notifications / Reminders and Widgets**: shared entry points, bounded searches, hidden modal costs, one-write refresh ownership, reminder rescheduling and constrained widget text.
7. **Settings / currencies / localization / security / onboarding**, followed by **Notes, Chat with Kai, Pro/ads and remaining support screens**: dedicated audits remain useful; presence in an earlier broad review is not feature sign-off.

This is a risk-based sequence, not a statement that the unreviewed features currently fail.

## Performance and change boundary

Documentation and isolated in-memory audit probes add no application queries, navigation work, providers, or render subscriptions. Native layout/fps was not measured. Future fixes should first use local flex/reflow/min-height changes, preserve memoized rows and bounded reads, and avoid text-measurement loops, render-time queries, or app-wide scaling suppression. Recheck scrolling and layout on release devices against the 60–120fps standard.

No application code, migrations, dependency files, versions or release notes changed; no commit created.
