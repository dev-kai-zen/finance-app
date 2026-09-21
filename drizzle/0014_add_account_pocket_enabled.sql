ALTER TABLE `accounts` ADD `pocket_enabled` integer DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE `accounts`
SET `pocket_enabled` = true
WHERE EXISTS (
	SELECT 1
	FROM `pockets`
	WHERE `pockets`.`account_id` = `accounts`.`id`
		AND `pockets`.`is_archived` = false
);
