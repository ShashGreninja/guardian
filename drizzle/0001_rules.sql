CREATE TABLE `mandates` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`version` integer NOT NULL,
	`source_text` text NOT NULL,
	`payload` text NOT NULL,
	`digest` text NOT NULL,
	`signature` text NOT NULL,
	`key_id` text NOT NULL,
	`active` integer NOT NULL,
	`signed_at` integer NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `signing_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`public_key` text NOT NULL,
	`private_key` text NOT NULL,
	`created_at` integer NOT NULL
);
