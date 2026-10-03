CREATE TABLE `labels` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `labels_name_unique` ON `labels` (lower("name"));--> statement-breakpoint
CREATE INDEX `labels_archived_sort_index` ON `labels` (`is_archived`,`sort_order`);--> statement-breakpoint
CREATE TABLE `transaction_labels` (
	`transaction_id` text NOT NULL,
	`label_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`transaction_id`, `label_id`),
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`label_id`) REFERENCES `labels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `transaction_labels_label_id_index` ON `transaction_labels` (`label_id`,`transaction_id`);--> statement-breakpoint
CREATE INDEX `transaction_labels_transaction_id_index` ON `transaction_labels` (`transaction_id`);