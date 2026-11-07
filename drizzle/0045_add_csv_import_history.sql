CREATE TABLE `import_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`file_name` text NOT NULL,
	`import_type` text NOT NULL,
	`source_name` text NOT NULL,
	`imported_count` integer NOT NULL,
	`left_out_count` integer NOT NULL,
	`summary` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `import_batches_created_at_idx` ON `import_batches` (`created_at`);
--> statement-breakpoint
CREATE TABLE `imported_source_identities` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`source_identity` text NOT NULL,
	`row_number` integer NOT NULL,
	`created_record_ids` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `import_batches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `imported_source_identities_source_identity_unique` ON `imported_source_identities` (`source_identity`);
--> statement-breakpoint
CREATE INDEX `imported_source_identities_batch_id_idx` ON `imported_source_identities` (`batch_id`);

