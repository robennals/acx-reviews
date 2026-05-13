DROP TABLE IF EXISTS `votes`;
--> statement-breakpoint
CREATE TABLE `votes` (
	`user_id` text NOT NULL,
	`contest_id` text NOT NULL,
	`review_id` text NOT NULL,
	`rating` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`user_id`, `contest_id`, `review_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CHECK (`rating` BETWEEN 1 AND 10)
);
--> statement-breakpoint
CREATE INDEX `votes_contest_review_idx` ON `votes` (`contest_id`, `review_id`);
--> statement-breakpoint
CREATE INDEX `votes_contest_recency_idx` ON `votes` (`contest_id`, `updated_at`);
