CREATE TABLE `quiz_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`questions` text NOT NULL,
	`revision` integer NOT NULL,
	`updated` integer NOT NULL
);
