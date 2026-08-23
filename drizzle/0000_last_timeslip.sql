CREATE TABLE `structural_project_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` text NOT NULL,
	`owner_email` text NOT NULL,
	`version_number` integer NOT NULL,
	`summary` text DEFAULT 'Versión manual' NOT NULL,
	`model_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `structural_versions_project_idx` ON `structural_project_versions` (`owner_email`,`project_id`,`version_number`);--> statement-breakpoint
CREATE TABLE `structural_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`name` text NOT NULL,
	`structure_type` text NOT NULL,
	`model_json` text NOT NULL,
	`version_number` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `structural_projects_owner_idx` ON `structural_projects` (`owner_email`,`updated_at`);