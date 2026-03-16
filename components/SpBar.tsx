'use client';

import { useEffect, useRef } from 'react';

export function SpBar({ pct }: { pct: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.style.setProperty('width', `${pct}%`); }, [pct]);
  return <div className="sp-bar-fill" ref={ref} />;
}
