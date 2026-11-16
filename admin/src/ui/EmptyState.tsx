import type { ReactNode } from 'react';

type EmptyStateProps = {
  title: ReactNode;
  description: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  tourTarget?: string;
};

export function EmptyState({ title, description, icon, action, className = '', tourTarget }: EmptyStateProps) {
  return (
    <section
      className={`frkt-empty-state${className ? ` ${className}` : ''}`}
      {...(tourTarget ? { 'data-frkt-tour': tourTarget } : {})}
    >
      <div className="frkt-empty-state__body">
        {icon ? <span className="frkt-empty-state__icon" aria-hidden="true">{icon}</span> : null}
        <h2>{title}</h2>
        <p>{description}</p>
        {action ? <div className="frkt-empty-state__actions">{action}</div> : null}
      </div>
    </section>
  );
}
