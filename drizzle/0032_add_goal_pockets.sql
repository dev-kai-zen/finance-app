CREATE TABLE `goal_pockets` (
	`goal_id` text NOT NULL,
	`pocket_id` text NOT NULL,
	PRIMARY KEY(`goal_id`, `pocket_id`),
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pocket_id`) REFERENCES `pockets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `goal_pockets_goal_id_index` ON `goal_pockets` (`goal_id`);--> statement-breakpoint
CREATE INDEX `goal_pockets_pocket_id_index` ON `goal_pockets` (`pocket_id`);--> statement-breakpoint
INSERT OR IGNORE INTO `goal_pockets` (`goal_id`, `pocket_id`) SELECT `id`, `pocket_id` FROM `goals` WHERE `pocket_id` IS NOT NULL;