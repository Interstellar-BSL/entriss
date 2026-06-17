"use client";

import { useEffect, useState } from "react";
import { Pencil, StickyNote, Trash2 } from "lucide-react";

import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api/client";
import {
  createVisitorNote,
  deleteVisitorNote,
  listVisitorNotes,
  updateVisitorNote,
  type VisitorNoteRecord,
} from "@/lib/api/visitors";

function formatApiError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    return err.message;
  }

  return fallback;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function NoteEditor({
  initialValue,
  onCancel,
  onSave,
  saving,
}: {
  initialValue: string;
  onCancel: () => void;
  onSave: (value: string) => Promise<void>;
  saving: boolean;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={4}
        className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] shadow-sm focus:border-[var(--ring)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        placeholder="Add operational context for reception and security teams…"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={saving || value.trim().length === 0}
          onClick={() => void onSave(value.trim())}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function NoteRow({
  note,
  visitorId,
  onChanged,
}: {
  note: VisitorNoteRecord;
  visitorId: string;
  onChanged: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpdate(nextNote: string) {
    setSaving(true);
    setError(null);

    try {
      await updateVisitorNote(visitorId, note.id, nextNote);
      setEditing(false);
      await onChanged();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to update note.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    try {
      await deleteVisitorNote(visitorId, note.id);
      setConfirmDelete(false);
      await onChanged();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to delete note.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--foreground)]">{note.createdByName}</p>
          <p className="text-xs text-[var(--muted)]">{formatDate(note.createdAt)}</p>
          {note.updatedAt !== note.createdAt ? (
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Updated {formatDate(note.updatedAt)} by {note.updatedByName}
            </p>
          ) : null}
        </div>

        {!editing && !confirmDelete ? (
          <div className="flex shrink-0 gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(true)}
              aria-label="Edit note"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete note"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-600" aria-hidden />
            </Button>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {editing ? (
        <div className="mt-3">
          <NoteEditor
            initialValue={note.note}
            saving={saving}
            onCancel={() => setEditing(false)}
            onSave={handleUpdate}
          />
        </div>
      ) : confirmDelete ? (
        <div className="mt-3 rounded-md border border-red-100 bg-red-50 p-3">
          <p className="text-sm text-red-800">
            Delete this note? This action cannot be undone.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="danger"
              disabled={deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? "Deleting…" : "Delete note"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={deleting}
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--foreground)]">
          {note.note}
        </p>
      )}
    </article>
  );
}

export function VisitorNotesPanel({ visitorId }: { visitorId: string }) {
  const [notes, setNotes] = useState<VisitorNoteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);

  async function loadNotes() {
    const items = await listVisitorNotes(visitorId);
    setNotes(items);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const items = await listVisitorNotes(visitorId);
        if (!cancelled) {
          setNotes(items);
        }
      } catch (err) {
        if (!cancelled) {
          setError(formatApiError(err, "Failed to load visitor notes."));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [visitorId]);

  async function handleCreate(note: string) {
    setCreating(true);
    setError(null);

    try {
      await createVisitorNote(visitorId, note);
      setAdding(false);
      await loadNotes();
    } catch (err) {
      setError(formatApiError(err, "Failed to create note."));
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading visitor notes…" />;
  }

  if (error && notes.length === 0 && !adding) {
    return <ErrorState title="Could not load notes" message={error} />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-[var(--muted)]" aria-hidden />
              <CardTitle>Operational notes</CardTitle>
            </div>
            {!adding ? (
              <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
                Add note
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          {adding ? (
            <NoteEditor
              initialValue=""
              saving={creating}
              onCancel={() => setAdding(false)}
              onSave={handleCreate}
            />
          ) : null}

          {notes.length === 0 && !adding ? (
            <p className="text-sm text-[var(--muted)]">
              No operational notes yet. Add context for reception, security, or
              host teams.
            </p>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <NoteRow
                  key={note.id}
                  note={note}
                  visitorId={visitorId}
                  onChanged={loadNotes}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
