import React from 'react';
import ModusIcon from './ModusIcon';

/**
 * A numbered step card. SitePass leans on these so a flow reads as a short checklist
 * rather than a wall of form fields.
 */
const SectionCard = ({ step, icon, title, hint, actions, children, className = '' }) => (
  <section className={`card border-0 shadow-sm ${className}`.trim()}>
    <div className="card-body p-3 p-md-4">
      <div className="d-flex align-items-start gap-3 mb-3">
        {step !== undefined ? (
          <span
            className="badge rounded-circle bg-primary d-inline-flex align-items-center justify-content-center flex-shrink-0"
            style={{ width: '1.75rem', height: '1.75rem' }}
            aria-hidden="true"
          >
            {step}
          </span>
        ) : icon ? (
          <ModusIcon name={icon} size="24px" extraClasses="text-primary flex-shrink-0" />
        ) : null}

        <div className="flex-grow-1 min-w-0">
          <h2 className="h6 fw-bold mb-1">{title}</h2>
          {hint ? <p className="text-muted small mb-0">{hint}</p> : null}
        </div>

        {actions ? <div className="flex-shrink-0">{actions}</div> : null}
      </div>

      {children}
    </div>
  </section>
);

export default SectionCard;
