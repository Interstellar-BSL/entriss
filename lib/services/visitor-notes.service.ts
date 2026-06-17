import { writeAuditLog } from "@/lib/audit/logger";
import { prisma } from "@/lib/db/client";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/tenant/tenant-context";
import type { TenantContext } from "@/lib/tenant/tenant-context";

import { VisitorNoteNotFoundError } from "./errors";
import { getVisitorById } from "./visitor.service";

const noteAuthorSelect = {
  id: true,
  name: true,
  email: true,
} as const;

const noteInclude = {
  createdBy: { select: noteAuthorSelect },
  updatedBy: { select: noteAuthorSelect },
} as const;

export interface VisitorNoteRecord {
  id: string;
  visitorId: string;
  note: string;
  createdById: string;
  createdByName: string;
  updatedById: string;
  updatedByName: string;
  createdAt: string;
  updatedAt: string;
}

function authorName(author: { name: string | null; email: string }): string {
  return author.name?.trim() || author.email;
}

function mapVisitorNote(
  note: {
    id: string;
    visitorId: string;
    note: string;
    createdById: string;
    updatedById: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy: { name: string | null; email: string };
    updatedBy: { name: string | null; email: string };
  },
): VisitorNoteRecord {
  return {
    id: note.id,
    visitorId: note.visitorId,
    note: note.note,
    createdById: note.createdById,
    createdByName: authorName(note.createdBy),
    updatedById: note.updatedById,
    updatedByName: authorName(note.updatedBy),
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

async function getVisitorNoteOrThrow(
  ctx: TenantContext,
  visitorId: string,
  noteId: string,
) {
  await getVisitorById(ctx, visitorId);

  const note = await prisma.visitorNote.findFirst({
    where: {
      id: noteId,
      organizationId: ctx.organizationId,
      visitorId,
    },
    include: noteInclude,
  });

  if (!note) {
    throw new VisitorNoteNotFoundError(noteId);
  }

  return note;
}

export async function listVisitorNotes(
  ctx: TenantContext,
  visitorId: string,
): Promise<VisitorNoteRecord[]> {
  requirePermission(ctx, PERMISSIONS.VISITOR_READ);
  await getVisitorById(ctx, visitorId);

  const notes = await prisma.visitorNote.findMany({
    where: {
      organizationId: ctx.organizationId,
      visitorId,
    },
    include: noteInclude,
    orderBy: { createdAt: "desc" },
  });

  return notes.map(mapVisitorNote);
}

export async function createVisitorNote(
  ctx: TenantContext,
  visitorId: string,
  input: { note: string },
): Promise<VisitorNoteRecord> {
  requirePermission(ctx, PERMISSIONS.VISITOR_UPDATE);
  await getVisitorById(ctx, visitorId);

  const note = await prisma.visitorNote.create({
    data: {
      organizationId: ctx.organizationId,
      visitorId,
      note: input.note,
      createdById: ctx.userId,
      updatedById: ctx.userId,
    },
    include: noteInclude,
  });

  await writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "NOTE_CREATED",
    resourceType: "Visitor",
    resourceId: visitorId,
    metadata: {
      noteId: note.id,
      visitorId,
    },
  });

  return mapVisitorNote(note);
}

export async function updateVisitorNote(
  ctx: TenantContext,
  visitorId: string,
  noteId: string,
  input: { note: string },
): Promise<VisitorNoteRecord> {
  requirePermission(ctx, PERMISSIONS.VISITOR_UPDATE);

  const existing = await getVisitorNoteOrThrow(ctx, visitorId, noteId);

  const note = await prisma.visitorNote.update({
    where: { id: existing.id },
    data: {
      note: input.note,
      updatedById: ctx.userId,
    },
    include: noteInclude,
  });

  await writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "NOTE_UPDATED",
    resourceType: "Visitor",
    resourceId: visitorId,
    metadata: {
      noteId: note.id,
      visitorId,
    },
  });

  return mapVisitorNote(note);
}

export async function deleteVisitorNote(
  ctx: TenantContext,
  visitorId: string,
  noteId: string,
): Promise<void> {
  requirePermission(ctx, PERMISSIONS.VISITOR_UPDATE);

  const existing = await getVisitorNoteOrThrow(ctx, visitorId, noteId);

  await prisma.visitorNote.delete({
    where: { id: existing.id },
  });

  await writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "NOTE_DELETED",
    resourceType: "Visitor",
    resourceId: visitorId,
    metadata: {
      noteId,
      visitorId,
    },
  });
}
