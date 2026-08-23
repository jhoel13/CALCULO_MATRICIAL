import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("structural_projects", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  name: text("name").notNull(),
  structureType: text("structure_type").notNull(),
  modelJson: text("model_json").notNull(),
  versionNumber: integer("version_number").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("structural_projects_owner_idx").on(table.ownerEmail, table.updatedAt),
]);

export const projectVersions = sqliteTable("structural_project_versions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: text("project_id").notNull(),
  ownerEmail: text("owner_email").notNull(),
  versionNumber: integer("version_number").notNull(),
  summary: text("summary").notNull().default("Versión manual"),
  modelJson: text("model_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("structural_versions_project_idx").on(table.ownerEmail, table.projectId, table.versionNumber),
]);
