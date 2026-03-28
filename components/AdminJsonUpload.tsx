'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Topic = {
  id: string;
  title: string;
  system: string;
};

type UploadKind = 'lesson' | 'flashcard' | 'question';
type FormStatus = { ok: boolean; message: string } | null;

const KIND_LABELS: Record<UploadKind, string> = {
  lesson: 'Lesson JSON',
  flashcard: 'Flashcards JSON',
  question: 'MSQ / MCQ JSON',
};

function getFileItems(kind: UploadKind, raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'object') {
    throw new Error('JSON root must be an array or object.');
  }

  const record = raw as Record<string, unknown>;
  const keysByKind: Record<UploadKind, string[]> = {
    lesson: ['items', 'lessons', 'lesson'],
    flashcard: ['items', 'flashcards', 'cards', 'flashcard'],
    question: ['items', 'questions', 'mcqs', 'msqs', 'question'],
  };

  for (const key of keysByKind[kind]) {
    const value = record[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') return [value];
  }

  return [raw];
}

export function AdminJsonUpload({
  topics,
  onSaved,
}: {
  topics: Topic[];
  onSaved?: () => void;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [kind, setKind] = useState<UploadKind>('question');
  const [topicId, setTopicId] = useState(topics[0]?.id ?? '');
  const [status, setStatus] = useState<FormStatus>(null);
  const [pending, setPending] = useState(false);
  const [fileName, setFileName] = useState('');
  const [jsonText, setJsonText] = useState('');

  function openFilePicker() {
    setStatus(null);
    fileRef.current?.click();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    const file = fileRef.current?.files?.[0];
    if (!topicId) {
      setStatus({ ok: false, message: 'Select a target topic.' });
      return;
    }

    setPending(true);
    try {
      const text = jsonText.trim() || (file ? await file.text() : '');
      if (!text) {
        setStatus({ ok: false, message: 'Paste JSON or choose a JSON file first.' });
        return;
      }

      const parsed = JSON.parse(text) as unknown;
      const items = getFileItems(kind, parsed);

      if (items.length === 0) {
        setStatus({ ok: false, message: 'The file does not contain any items to import.' });
        return;
      }

      const response = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'import-json', contentKind: kind, topicId, items }),
      });
      const data = await response.json();
      const message = data.error ? `${data.message}: ${data.error}` : (data.message ?? 'Import complete.');
      setStatus({ ok: response.ok, message });

      if (response.ok) {
        event.currentTarget.reset();
        setFileName('');
        setJsonText('');
        router.refresh();
        onSaved?.();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid JSON file.';
      setStatus({ ok: false, message });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="panel adm-upload-panel" onSubmit={handleSubmit}>
      <div className="adm-upload-head">
        <div>
          <h3>Upload JSON</h3>
          <p className="muted adm-upload-copy">
            Import lessons, flashcards, or MSQ / MCQ questions into an existing global topic.
          </p>
        </div>
      </div>

      {topics.length === 0 ? (
        <p className="muted">Create a topic first. Uploaded content must be attached to a topic.</p>
      ) : (
        <>
          <div className="adm-upload-grid">
            <label>
              Content type
              <select value={kind} onChange={e => setKind(e.target.value as UploadKind)}>
                <option value="question">{KIND_LABELS.question}</option>
                <option value="flashcard">{KIND_LABELS.flashcard}</option>
                <option value="lesson">{KIND_LABELS.lesson}</option>
              </select>
            </label>

            <label>
              Target topic
              <select value={topicId} onChange={e => setTopicId(e.target.value)} required>
                {topics.map(topic => (
                  <option key={topic.id} value={topic.id}>
                    {topic.title} ({topic.system})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="adm-upload-file">
            JSON file
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              onChange={e => setFileName(e.target.files?.[0]?.name ?? '')}
              className="adm-upload-file-input"
            />
            <div className="adm-upload-file-row">
              <button type="button" className="btn secondary" onClick={openFilePicker}>
                Choose file from device
              </button>
              <span className="muted adm-upload-file-name">{fileName || 'No file selected'}</span>
            </div>
          </label>

          <div className="adm-upload-divider">
            <span>or paste JSON</span>
          </div>

          <label className="adm-upload-paste">
            Paste JSON
            <textarea
              rows={12}
              value={jsonText}
              onChange={e => setJsonText(e.target.value)}
              placeholder='Paste an array or object JSON here, for example: {"questions":[...]}'
            />
          </label>

          <div className="adm-upload-hint">
            <strong>Accepted shapes:</strong> array roots, object `items`, `questions`, `msqs`, `flashcards`, or `lessons`.
          </div>

          <div className="adm-upload-hint">
            <strong>Fields:</strong> lessons use `title` and `content`; flashcards use `front` and `back`; questions use `stem`, four options, and the correct answer.
          </div>

          <button type="submit" className="btn primary" disabled={pending}>
            {pending ? 'Uploading...' : `Upload ${KIND_LABELS[kind]}`}
          </button>
        </>
      )}

      {status && (
        <p className={`admin-form-status${status.ok ? ' admin-form-status--ok' : ' admin-form-status--err'}`}>
          {status.message}
        </p>
      )}
    </form>
  );
}
