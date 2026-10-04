CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`color` text,
	`is_pinned` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `notes_updated_at_idx` ON `notes` (`updated_at`);--> statement-breakpoint
CREATE INDEX `notes_title_idx` ON `notes` (`title`);--> statement-breakpoint
CREATE INDEX `notes_is_pinned_idx` ON `notes` (`is_pinned`);--> statement-breakpoint
CREATE INDEX `notes_deleted_at_idx` ON `notes` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `note_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`note_id` text NOT NULL,
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
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "note_attachments_sync_status_check" CHECK("note_attachments"."sync_status" in ('pending', 'syncing', 'synced', 'failed')),
	CONSTRAINT "note_attachments_size_check" CHECK("note_attachments"."size_bytes" >= 0)
);
--> statement-breakpoint
CREATE INDEX `note_attachments_note_index` ON `note_attachments` (`note_id`,`deleted_at`);--> statement-breakpoint
CREATE INDEX `note_attachments_drive_file_index` ON `note_attachments` (`drive_file_id`);