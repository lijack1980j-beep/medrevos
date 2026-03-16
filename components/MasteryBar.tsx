'use client';

import { useEffect, useRef } from 'react';

export function MasteryBar({ pct }: { pct: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    ref.current?.style.setProperty('--w', `${pct}%`);
  }, [pct]);

  return (
    <div className="progress">
      <span className="dash-progress-fill" ref={ref} />
    </div>
  );
}
