CREATE TABLE `alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`recipient` text NOT NULL,
	`amount_cents` integer,
	`method` text NOT NULL,
	`said` text NOT NULL,
	`pattern` text NOT NULL,
	`risk` text NOT NULL,
	`explanation` text NOT NULL,
	`advice` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
