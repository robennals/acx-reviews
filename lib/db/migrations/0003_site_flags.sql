CREATE TABLE `site_flags` (
	`id` text PRIMARY KEY NOT NULL,
	`contest_live` integer DEFAULT false NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
