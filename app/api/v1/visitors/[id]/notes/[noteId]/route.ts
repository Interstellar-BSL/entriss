import { success } from "@/lib/api/response";
import { withTenantParams } from "@/lib/api/with-tenant";
import {
  deleteVisitorNote,
  updateVisitorNote,
} from "@/lib/services/visitor-notes.service";
import { visitorNoteBodySchema } from "@/lib/validations/api";

export const PATCH = withTenantParams<{ id: string; noteId: string }>(
  async (request, ctx, { id, noteId }) => {
    const body = await request.json();
    const input = visitorNoteBodySchema.parse(body);
    const note = await updateVisitorNote(ctx, id, noteId, input);

    return success(note);
  },
);

export const DELETE = withTenantParams<{ id: string; noteId: string }>(
  async (_request, ctx, { id, noteId }) => {
    await deleteVisitorNote(ctx, id, noteId);
    return success({ deleted: true });
  },
);
