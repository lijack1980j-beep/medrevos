'use client';

import { useEffect, useRef } from 'react';

export function HourBar({ pct, className }: { pct: number; className: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.style.setProperty('height', `${pct}%`); }, [pct]);
  return <div className={className} ref={ref} />;
}
