import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, ReactNode } from 'react';

/** Sets the one colour variable the chunk recipe derives everything from. */
export const tint = (color: string, extra?: CSSProperties): CSSProperties =>
  ({ ['--c' as string]: color, ...extra }) as CSSProperties;

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

export function Chunk({
  color,
  gloss,
  className,
  style,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { color?: string; gloss?: boolean; children?: ReactNode }) {
  return (
    <div className={cx('chunk', gloss && 'gloss', className)} style={color ? tint(color, style) : style} {...rest}>
      {children}
    </div>
  );
}

/** Every clickable thing: chunk recipe + pop on hover and press. */
export function Button({
  color = 'var(--lime)',
  gloss = true,
  size,
  className,
  style,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { color?: string; gloss?: boolean; size?: 'sm' | 'lg' }) {
  return (
    <button
      type="button"
      className={cx('btn chunk pop', gloss && 'gloss', size, className)}
      style={tint(color, style)}
      {...rest}
    >
      {children}
    </button>
  );
}

export { cx };
