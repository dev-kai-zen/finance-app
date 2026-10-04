CREATE TABLE `exchange_rates` (
	`id` text PRIMARY KEY NOT NULL,
	`base_currency` text NOT NULL,
	`quote_currency` text NOT NULL,
	`rate_basis_points` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exchange_rates_base_quote_idx` ON `exchange_rates` (`base_currency`,`quote_currency`);--> statement-breakpoint
INSERT OR IGNORE INTO `exchange_rates` (`id`, `base_currency`, `quote_currency`, `rate_basis_points`, `created_at`, `updated_at`) VALUES
('rate_php_php', 'PHP', 'PHP', 10000, 1791127852000, 1791127852000),
('rate_php_usd', 'PHP', 'USD', 585000, 1791127852000, 1791127852000),
('rate_php_eur', 'PHP', 'EUR', 635000, 1791127852000, 1791127852000),
('rate_php_gbp', 'PHP', 'GBP', 745000, 1791127852000, 1791127852000),
('rate_php_jpy', 'PHP', 'JPY', 3900, 1791127852000, 1791127852000),
('rate_php_sgd', 'PHP', 'SGD', 435000, 1791127852000, 1791127852000),
('rate_php_cad', 'PHP', 'CAD', 425000, 1791127852000, 1791127852000),
('rate_php_aud', 'PHP', 'AUD', 385000, 1791127852000, 1791127852000),
('rate_php_hkd', 'PHP', 'HKD', 75000, 1791127852000, 1791127852000),
('rate_php_cny', 'PHP', 'CNY', 81000, 1791127852000, 1791127852000),
('rate_php_krw', 'PHP', 'KRW', 430, 1791127852000, 1791127852000),
('rate_php_thb', 'PHP', 'THB', 16500, 1791127852000, 1791127852000),
('rate_php_myr', 'PHP', 'MYR', 132000, 1791127852000, 1791127852000),
('rate_php_idr', 'PHP', 'IDR', 36, 1791127852000, 1791127852000),
('rate_php_vnd', 'PHP', 'VND', 23, 1791127852000, 1791127852000),
('rate_php_inr', 'PHP', 'INR', 7000, 1791127852000, 1791127852000),
('rate_php_aed', 'PHP', 'AED', 159000, 1791127852000, 1791127852000),
('rate_php_sar', 'PHP', 'SAR', 156000, 1791127852000, 1791127852000),
('rate_php_twd', 'PHP', 'TWD', 18200, 1791127852000, 1791127852000),
('rate_php_chf', 'PHP', 'CHF', 655000, 1791127852000, 1791127852000),
('rate_php_nzd', 'PHP', 'NZD', 355000, 1791127852000, 1791127852000);