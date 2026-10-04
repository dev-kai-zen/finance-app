High-Value Features to Consider for the Future
Biometric Security & App Lock (Face ID / Touch ID / PIN)
Why: Personal financial information is highly confidential.
Implementation: Integrate expo-local-authentication with an auto-lock timeout on app minimize/resume.
Local Push Notifications & Bill Reminders
Why: Scheduled transactions post silently.
Implementation: Use expo-notifications to trigger warnings 2–3 days before credit card paymentDueDay, alert when a category hits 90% of its budget, or confirm recurring subscription charges.
Smart Receipt OCR (On-Device Receipt Scanning)
Why: The app already supports photo attachments with SHA-256 integrity and local storage.
Implementation: Add on-device OCR (e.g. Google ML Kit text recognition) to parse merchant name, transaction date, and total amount straight into the transaction form modal.
Base Currency Normalization & FX Rates
Why: Protects Net Worth and Cash Flow stats for users with multi-currency accounts.
Implementation: Allow users to configure a "Base Reporting Currency" and store offline exchange rates or periodic FX rate snapshots.
Split Transactions
Why: A single supermarket receipt often spans multiple expense categories (e.g. ₱3,500 total = ₱2,500 Groceries + ₱1,000 Personal Care).
Implementation: Leverage your existing transaction_group_id pattern to link multi-category split legs to one parent charge.
CSV / Bank Statement Importer
Why: You have CSV export, but moving from another app or bank requires manual entry.
Implementation: A smart CSV importer with column mapping (Date, Payee, Category, Amount) and duplicate transaction detection.
Privacy / Stealth Mode
Why: Users often check finances in public transport or workspaces.
Implementation: A quick header toggle that obscures account balances and net worth with ₱••••••.
10:45 PM
