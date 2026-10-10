import type { ReactNode } from 'react';

/** Hover/focus tooltip in the chunk style. Keyboard users get it on focus. */
export function Tooltip({
  title,
  children,
  content,
  below,
  className,
}: {
  title?: string;
  content: ReactNode;
  children: ReactNode;
  below?: boolean;
  className?: string;
}) {
  return (
    <span className={className ? `tip-wrap ${className}` : 'tip-wrap'}>
      {children}
      <span className={`tip chunk ${below ? 'below' : ''}`} role="tooltip">
        {title && <b>{title}</b>}
        {content}
      </span>
    </span>
  );
}
