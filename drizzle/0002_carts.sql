CREATE TABLE `carts` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`store` text NOT NULL,
	`category` text NOT NULL,
	`lines` text NOT NULL,
	`total_cents` integer NOT NULL,
	`status` text NOT NULL,
	`payment_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE no action
);
