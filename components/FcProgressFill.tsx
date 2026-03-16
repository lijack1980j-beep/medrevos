'use client';

import { useEffect, useRef } from 'react';

export function FcProgressFill({ pct }: { pct: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.style.setProperty('width', `${pct}%`); }, [pct]);
  return <div className="fc-progress-fill" ref={ref} />;
}
