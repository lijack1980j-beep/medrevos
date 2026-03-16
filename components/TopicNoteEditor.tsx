'use client';

import { useEffect, useRef, useState } from 'react';

export function TopicNoteEditor({ topicId, initialContent }: { topicId: string; initialContent: string }) {
  const [content, setContent]   = useState(initialContent);
  const [status, setStatus]     = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setContent(initialContent);
    setStatus('idle');
  }, [topicId, initialContent]);

  function onChange(val: string) {
    setContent(val);
    setStatus('saving');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topicId, content: val }),
        });
        setStatus(res.ok ? 'saved' : 'error');
      } catch {
        setStatus('error');
      }
    }, 800);
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  return (
    <div className="note-editor">
      <div className="note-editor-header">
        <span className="note-editor-label">My notes</span>
        {status === 'saving' && <span className="note-status note-status--saving">Saving…</span>}
        {status === 'saved'  && <span className="note-status note-status--saved">Saved ✓</span>}
        {status === 'error'  && <span className="note-status note-status--error">Error saving</span>}
      </div>
      <textarea
        className="note-editor-area"
        value={content}
        onChange={e => onChange(e.target.value)}
        placeholder="Write your personal notes, mnemonics, or annotations here…"
        rows={5}
      />
    </div>
  );
}
