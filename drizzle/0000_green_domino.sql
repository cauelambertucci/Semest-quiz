CREATE TABLE `answers` (
	`id` text PRIMARY KEY NOT NULL,
	`pin` text NOT NULL,
	`player_id` text NOT NULL,
	`question` integer NOT NULL,
	`choice` integer NOT NULL,
	`points` integer NOT NULL,
	FOREIGN KEY (`pin`) REFERENCES `rooms`(`pin`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `answers_player_question` ON `answers` (`player_id`,`question`);--> statement-breakpoint
CREATE INDEX `answers_pin` ON `answers` (`pin`);--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`pin` text NOT NULL,
	`token` text NOT NULL,
	`name` text NOT NULL,
	`joined` integer NOT NULL,
	FOREIGN KEY (`pin`) REFERENCES `rooms`(`pin`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `players_pin_name` ON `players` (`pin`,`name`);--> statement-breakpoint
CREATE TABLE `rooms` (
	`pin` text PRIMARY KEY NOT NULL,
	`host_token` text NOT NULL,
	`title` text NOT NULL,
	`questions` text NOT NULL,
	`status` text DEFAULT 'lobby' NOT NULL,
	`current` integer DEFAULT -1 NOT NULL,
	`deadline` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL
);
