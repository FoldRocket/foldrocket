import type { ReactNode } from 'react';

type Props = {
  subtitle?: string;
  current: number;
  total: number;
  footer?: ReactNode;
};

/** Shared progress body for bulk Analyze AI, Generate ALT, and other bulk ops. */
export function BulkProgressPanel({ subtitle, current, total, footer }: Props) {
  const safeTotal = Math.max(1, total);
  const safeCurrent = Math.min(Math.max(0, current), safeTotal);
  const pct = Math.round((safeCurrent / safeTotal) * 100);
  const countLabel = `${safeCurrent.toLocaleString()} / ${safeTotal.toLocaleString()}`;

  return (
    <div className="frkt-bulk-progress" role="status" aria-live="polite">
      {subtitle ? <p className="frkt-muted">{subtitle}</p> : null}
      <div className="frkt-bulk-progress__count">{countLabel}</div>
      <div
        className="frkt-bulk-progress__bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={safeTotal}
        aria-valuenow={safeCurrent}
        aria-label={countLabel}
      >
        <span style={{ width: `${pct}%` }} />
      </div>
      <span className="frkt-bulk-progress__pct">{pct}%</span>
      {footer ? <div className="frkt-bulk-progress__footer">{footer}</div> : null}
    </div>
  );
}
