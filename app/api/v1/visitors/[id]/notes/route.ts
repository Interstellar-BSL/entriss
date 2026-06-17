import { success } from "@/lib/api/response";
import { withTenantParams } from "@/lib/api/with-tenant";
import {
  createVisitorNote,
  listVisitorNotes,
} from "@/lib/services/visitor-notes.service";
import { visitorNoteBodySchema } from "@/lib/validations/api";

export const GET = withTenantParams<{ id: string }>(
  async (_request, ctx, { id }) => {
    const notes = await listVisitorNotes(ctx, id);
    return success({ items: notes });
  },
);

export const POST = withTenantParams<{ id: string }>(
  async (request, ctx, { id }) => {
    const body = await request.json();
    const input = visitorNoteBodySchema.parse(body);
    const note = await createVisitorNote(ctx, id, input);

    return success(note, 201);
  },
);
