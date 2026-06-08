CREATE TABLE `feedback` (
	`sender_user_id` text NOT NULL,
	`review_slug` text NOT NULL,
	`sender_name` text NOT NULL,
	`message` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`sent_at` integer,
	PRIMARY KEY(`sender_user_id`, `review_slug`),
	FOREIGN KEY (`sender_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
