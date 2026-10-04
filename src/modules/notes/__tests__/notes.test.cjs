const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { DatabaseSync } = require("node:sqlite");

function setupTestDb() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  const journal = require("../../../../drizzle/meta/_journal.json");
  for (const entry of journal.entries) {
    const sql = fs.readFileSync(
      path.join(__dirname, "../../../../drizzle", `${entry.tag}.sql`),
      "utf-8",
    );
    for (const statement of sql.split("--> statement-breakpoint")) {
      if (statement.trim()) db.exec(statement);
    }
  }
  return db;
}

test("notes: can insert, read, and cascade delete notes with attachments", () => {
  const db = setupTestDb();
  const now = Date.now();

  // Insert note
  db.prepare(`
    INSERT INTO notes (id, title, content, color, is_pinned, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run("note-1", "Financial Goals 2026", "Save $20,000 in emergency fund", "#10b981", 1, now, now);

  const note = db.prepare("SELECT * FROM notes WHERE id = ?").get("note-1");
  assert.equal(note.title, "Financial Goals 2026");
  assert.equal(note.color, "#10b981");
  assert.equal(note.is_pinned, 1);

  // Insert attachment
  db.prepare(`
    INSERT INTO note_attachments (
      id, note_id, original_name, storage_key, mime_type, size_bytes, sha256, sync_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "att-1",
    "note-1",
    "receipt.jpg",
    "att-1.jpg",
    "image/jpeg",
    1024,
    "abcdef123456",
    "pending",
    now,
    now
  );

  const attachment = db.prepare("SELECT * FROM note_attachments WHERE id = ?").get("att-1");
  assert.equal(attachment.original_name, "receipt.jpg");
  assert.equal(attachment.note_id, "note-1");

  // Verify cascade delete
  db.prepare("DELETE FROM notes WHERE id = ?").run("note-1");
  const noteAfter = db.prepare("SELECT * FROM notes WHERE id = ?").get("note-1");
  const attAfter = db.prepare("SELECT * FROM note_attachments WHERE id = ?").get("att-1");

  assert.equal(noteAfter, undefined);
  assert.equal(attAfter, undefined);
});

test("notes: enforces check constraints on attachments", () => {
  const db = setupTestDb();
  const now = Date.now();

  db.prepare(`
    INSERT INTO notes (id, title, content, color, is_pinned, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run("note-2", "Tax Receipts", "Medical expense receipts", null, 0, now, now);

  // Negative size_bytes should fail
  assert.throws(() => {
    db.prepare(`
      INSERT INTO note_attachments (
        id, note_id, original_name, storage_key, mime_type, size_bytes, sha256, sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run("att-invalid-size", "note-2", "doc.png", "k.png", "image/png", -5, "hash", "pending", now, now);
  });

  // Invalid sync_status should fail
  assert.throws(() => {
    db.prepare(`
      INSERT INTO note_attachments (
        id, note_id, original_name, storage_key, mime_type, size_bytes, sha256, sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run("att-invalid-status", "note-2", "doc.png", "k.png", "image/png", 100, "hash", "invalid_status", now, now);
  });
});

test("notes: sorting prioritizes pinned notes, then last modified or title", () => {
  const db = setupTestDb();
  const t0 = 1000;
  const t1 = 2000;
  const t2 = 3000;

  db.prepare(`
    INSERT INTO notes (id, title, content, color, is_pinned, created_at, updated_at)
    VALUES 
      ('n1', 'Bravo Note', 'Content', null, 0, ?, ?),
      ('n2', 'Alpha Note', 'Content', null, 1, ?, ?),
      ('n3', 'Charlie Note', 'Content', null, 0, ?, ?)
  `).run(t0, t0, t1, t1, t2, t2);

  // Query: ORDER BY is_pinned DESC, updated_at DESC
  const byModified = db.prepare(`
    SELECT id, title, is_pinned FROM notes ORDER BY is_pinned DESC, updated_at DESC
  `).all();

  // n2 is pinned, so it must be first
  assert.equal(byModified[0].id, "n2");
  assert.equal(byModified[1].id, "n3"); // newest unpinned
  assert.equal(byModified[2].id, "n1"); // oldest unpinned

  // Query: ORDER BY is_pinned DESC, title ASC
  const byTitle = db.prepare(`
    SELECT id, title, is_pinned FROM notes ORDER BY is_pinned DESC, title ASC
  `).all();

  assert.equal(byTitle[0].id, "n2"); // pinned
  assert.equal(byTitle[1].id, "n1"); // Bravo Note
  assert.equal(byTitle[2].id, "n3"); // Charlie Note
});
