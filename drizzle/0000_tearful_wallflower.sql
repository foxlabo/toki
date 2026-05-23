CREATE TABLE `availability_windows` (
	`id` text PRIMARY KEY NOT NULL,
	`day_of_week` integer NOT NULL,
	`start_minute` integer NOT NULL,
	`end_minute` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`event_type_id` text NOT NULL,
	`start_at_ms` integer NOT NULL,
	`end_at_ms` integer NOT NULL,
	`guest_name` text NOT NULL,
	`guest_email` text NOT NULL,
	`guest_note` text DEFAULT '' NOT NULL,
	`cancel_token` text NOT NULL,
	`cancelled_at_ms` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`event_type_id`) REFERENCES `event_types`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_cancel_token_unique` ON `bookings` (`cancel_token`);--> statement-breakpoint
CREATE TABLE `event_types` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`duration_minutes` integer NOT NULL,
	`location_kind` text DEFAULT 'video' NOT NULL,
	`location_detail` text DEFAULT '' NOT NULL,
	`color` text DEFAULT 'zinc' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_types_slug_unique` ON `event_types` (`slug`);