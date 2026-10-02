CREATE TABLE `transaction_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text NOT NULL,
	`original_name` text NOT NULL,
	`storage_key` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`sha256` text NOT NULL,
	`drive_file_id` text,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`last_sync_error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "transaction_attachments_sync_status_check" CHECK("transaction_attachments"."sync_status" in ('pending', 'syncing', 'synced', 'failed')),
	CONSTRAINT "transaction_attachments_size_check" CHECK("transaction_attachments"."size_bytes" >= 0)
);
--> statement-breakpoint
CREATE INDEX `transaction_attachments_transaction_index` ON `transaction_attachments` (`transaction_id`,`deleted_at`);--> statement-breakpoint
CREATE INDEX `transaction_attachments_drive_file_index` ON `transaction_attachments` (`drive_file_id`);--> statement-breakpoint
CREATE TABLE `sync_operations` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`operation` text NOT NULL,
	`payload` text NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer,
	`last_error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "sync_operations_operation_check" CHECK("sync_operations"."operation" in ('upload', 'delete'))
);
--> statement-breakpoint
CREATE INDEX `sync_operations_due_index` ON `sync_operations` (`entity_type`,`next_attempt_at`,`created_at`);--> statement-breakpoint
CREATE INDEX `sync_operations_entity_index` ON `sync_operations` (`entity_type`,`entity_id`);