'use client';

import { useState } from 'react';

type Props = {
  topic: string;
  system: string;
  mastery: number;
  correctCount: number;
  questionCount: number;
};

export function TopicCertificate({ topic, system, mastery, correctCount, questionCount }: Props) {
  const [open, setOpen] = useState(false);
  if (mastery < 80) return null;

  const level = mastery >= 95 ? 'Distinguished' : mastery >= 90 ? 'Excellence' : 'Proficiency';
  const medal = mastery >= 95 ? '🏆' : mastery >= 90 ? '🥇' : '🎓';

  return (
    <>
      <button
        type="button"
        className="cert-trigger"
        onClick={() => setOpen(true)}
        title={`View ${topic} certificate`}
      >
        {medal}
      </button>

      {open && (
        <div className="cert-overlay" onClick={() => setOpen(false)}>
          <div className="cert-modal" onClick={e => e.stopPropagation()}>
            <button type="button" className="cert-close" onClick={() => setOpen(false)}>×</button>
            <div className="cert-decoration" />
            <div className="cert-medal">{medal}</div>
            <div className="cert-header">
              <div className="cert-label">Certificate of {level}</div>
              <div className="cert-subtitle">This certifies mastery of</div>
              <div className="cert-topic">{topic}</div>
              <div className="cert-system">{system}</div>
            </div>
            <div className="cert-stats">
              <div className="cert-stat">
                <span className="cert-stat-value">{mastery}%</span>
                <span className="cert-stat-label">Mastery</span>
              </div>
              <div className="cert-stat-divider" />
              <div className="cert-stat">
                <span className="cert-stat-value">{correctCount}</span>
                <span className="cert-stat-label">Correct</span>
              </div>
              <div className="cert-stat-divider" />
              <div className="cert-stat">
                <span className="cert-stat-value">{questionCount}</span>
                <span className="cert-stat-label">Attempted</span>
              </div>
            </div>
            <div className="cert-footer">MedRevision OS · {new Date().getFullYear()}</div>
          </div>
        </div>
      )}
    </>
  );
}
