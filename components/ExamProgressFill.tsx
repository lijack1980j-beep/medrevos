'use client';

import { useEffect, useRef } from 'react';

export function ExamProgressFill({ pct }: { pct: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.style.setProperty('width', `${pct}%`); }, [pct]);
  return <div className="exam-progress-fill" ref={ref} />;
}
