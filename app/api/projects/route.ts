import { and, desc, eq, sql } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { projectVersions, projects } from "../../../db/schema";
import type { StructuralProject } from "../../../src/lib/types";

export const dynamic = "force-dynamic";

function unauthorized() {
  return Response.json({ error: "Debes ingresar para guardar proyectos." }, { status: 401 });
}

function parseModel(modelJson: string) {
  try {
    return JSON.parse(modelJson) as StructuralProject;
  } catch {
    return null;
  }
}

function isProject(value: unknown): value is StructuralProject {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StructuralProject>;
  return candidate.schemaVersion === 2 && typeof candidate.id === "string" && typeof candidate.metadata?.name === "string" && Array.isArray(candidate.nodes) && Array.isArray(candidate.elements);
}

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return unauthorized();
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  const db = getDb();
  if (projectId) {
    const rows = await db.select().from(projectVersions)
      .where(and(eq(projectVersions.ownerEmail, user.email), eq(projectVersions.projectId, projectId)))
      .orderBy(desc(projectVersions.versionNumber)).limit(30);
    return Response.json({ versions: rows.map((row) => ({ ...row, model: parseModel(row.modelJson), modelJson: undefined })) });
  }
  const rows = await db.select().from(projects)
    .where(eq(projects.ownerEmail, user.email))
    .orderBy(desc(projects.updatedAt)).limit(50);
  return Response.json({ projects: rows.map((row) => ({ ...row, model: parseModel(row.modelJson), modelJson: undefined })) });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return unauthorized();
  const payload = await request.json() as {
    action?: "save" | "delete";
    project?: StructuralProject;
    projectId?: string;
    versioned?: boolean;
    summary?: string;
  };
  const db = getDb();
  if (payload.action === "delete") {
    const projectId = payload.projectId?.trim();
    if (!projectId) return Response.json({ error: "Falta projectId." }, { status: 400 });
    await db.delete(projectVersions).where(and(eq(projectVersions.ownerEmail, user.email), eq(projectVersions.projectId, projectId)));
    await db.delete(projects).where(and(eq(projects.ownerEmail, user.email), eq(projects.id, projectId)));
    return Response.json({ ok: true });
  }
  if (!isProject(payload.project)) return Response.json({ error: "El modelo del proyecto no es válido." }, { status: 400 });
  const project = payload.project;
  const [collision] = await db.select().from(projects).where(eq(projects.id, project.id)).limit(1);
  if (collision && collision.ownerEmail !== user.email) return Response.json({ error: "El identificador pertenece a otra cuenta. Duplique el proyecto." }, { status: 409 });
  const versionNumber = collision ? collision.versionNumber + (payload.versioned ? 1 : 0) : 1;
  const modelJson = JSON.stringify(project);
  await db.insert(projects).values({
    id: project.id,
    ownerEmail: user.email,
    name: project.metadata.name,
    structureType: project.kind,
    modelJson,
    versionNumber,
  }).onConflictDoUpdate({
    target: projects.id,
    set: {
      name: project.metadata.name,
      structureType: project.kind,
      modelJson,
      versionNumber,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    },
  });
  if (!collision || payload.versioned) {
    await db.insert(projectVersions).values({
      projectId: project.id,
      ownerEmail: user.email,
      versionNumber,
      summary: payload.summary?.trim() || (collision ? "Versión manual" : "Versión inicial"),
      modelJson,
    });
  }
  return Response.json({ ok: true, versionNumber });
}
