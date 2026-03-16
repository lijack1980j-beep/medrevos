import { prisma } from '@/lib/db';

export default async function CasesPage() {
  const cases = await prisma.caseStudy.findMany({
    include: { topic: true },
    orderBy: [{ topic: { system: 'asc' } }, { title: 'asc' }],
  });

  // Group by system
  const grouped = cases.reduce<Record<string, typeof cases>>((acc, c) => {
    const sys = c.topic.system;
    if (!acc[sys]) acc[sys] = [];
    acc[sys].push(c);
    return acc;
  }, {});

  return (
    <div className="cases-page">
      <div>
        <div className="kicker">Clinical reasoning</div>
        <h1>Case mode</h1>
        <p className="muted">
          Work through each case: read the presentation, form a differential, then reveal the diagnosis and management.
        </p>
      </div>

      {Object.entries(grouped).map(([system, systemCases]) => (
        <section key={system} className="grid cases-system-section">
          <div className="cases-system-heading">
            <span className="kicker">{system}</span>
            <span className="cases-system-count">{systemCases.length} case{systemCases.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="grid cols-2">
            {systemCases.map(c => (
              <div key={c.id} className="case-card cases-card">

                <div className="cases-card-header">
                  <span className="badge">{c.topic.title}</span>
                  <h3 className="cases-card-title">{c.title}</h3>
                </div>

                <div className="cases-section">
                  <div className="cases-section-label">Chief Complaint</div>
                  <p className="cases-section-text">{c.chiefComplaint}</p>
                </div>

                <details className="cases-reveal">
                  <summary className="cases-reveal-trigger">
                    <span>Findings &amp; Investigations</span>
                    <span className="cases-reveal-icon">▾</span>
                  </summary>
                  <div className="cases-reveal-body">
                    <div className="cases-section">
                      <div className="cases-section-label">Findings</div>
                      <p className="cases-section-text">{c.findings}</p>
                    </div>
                    <div className="cases-section">
                      <div className="cases-section-label">Investigations</div>
                      <p className="cases-section-text">{c.investigations}</p>
                    </div>
                  </div>
                </details>

                <details className="cases-reveal cases-reveal--answer">
                  <summary className="cases-reveal-trigger">
                    <span>Diagnosis &amp; Management</span>
                    <span className="cases-reveal-icon">▾</span>
                  </summary>
                  <div className="cases-reveal-body">
                    <div className="cases-section">
                      <div className="cases-section-label cases-section-label--dx">Diagnosis</div>
                      <p className="cases-section-text">{c.diagnosis}</p>
                    </div>
                    <div className="cases-section">
                      <div className="cases-section-label cases-section-label--rx">Management</div>
                      <p className="cases-section-text">{c.management}</p>
                    </div>
                  </div>
                </details>

              </div>
            ))}
          </div>
        </section>
      ))}

      {cases.length === 0 && (
        <div className="panel">
          <p className="muted">No cases yet. Reseed the platform from the admin panel to add demo cases.</p>
        </div>
      )}
    </div>
  );
}
