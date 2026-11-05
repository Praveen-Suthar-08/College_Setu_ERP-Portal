import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Info,
  Moon,
  Sun,
  X,
} from 'lucide-react';
import { BUILT_IN_AVATARS, BuiltInAvatarGraphic } from '../../data/avatars';

import { NoticeItem } from '../../types/portal';
import { runFinanceAndAcademicUnitTests } from '../../utils/finance';
import { generateImagenAvatarSvgDataUrl, ImagenAvatarStyle } from '../../utils/imagenAvatar';

// ============================================================================
// 1. SOLID SURFACE CARD PRIMITIVE (<GlassCard>)
// ============================================================================
export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'strong' | 'accent';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  equalHeight?: boolean;
  interactive?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  variant = 'default',
  padding = 'md',
  equalHeight = false,
  interactive = false,
  className = '',
  children,
  ...props
}) => {
  const padMap = {
    none: '',
    sm: 'p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6',
  };

  const variantClass =
    variant === 'accent'
      ? 'bg-[var(--surface-2)] border border-[var(--border)] rounded-[16px] shadow-[var(--shadow)]'
      : variant === 'strong'
        ? 'glass-strong rounded-[16px]'
        : 'glass';

  return (
    <div
      className={`${variantClass} ${padMap[padding]} ${
        equalHeight ? 'h-full flex flex-col' : ''
      } ${
        interactive
          ? 'transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)] cursor-pointer'
          : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// ============================================================================
// 2. STAT TILE PRIMITIVE (<StatTile>)
// ============================================================================
export interface StatTileProps {
  label: string;
  value: React.ReactNode;
  delta?: string;
  footerText?: string;
  emptyHint?: string;
  tone?: 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'brass';
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  progress?: number;
  progressPct?: number;
  onClick?: () => void;
  actionLabel?: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
}

export const StatTile: React.FC<StatTileProps> = React.memo(({
  label,
  value,
  delta,
  footerText,
  emptyHint,
  tone = 'accent',
  icon: Icon,
  progress,
  progressPct,
  onClick,
  actionLabel,
  ctaLabel,
  onCtaClick,
}) => {
  const iconToneMap = {
    accent: 'bg-[var(--accent-soft)] text-[var(--accent-text)] border-[var(--border)]',
    brass: 'bg-[var(--accent-soft)] text-[var(--accent-text)] border-[var(--border)]',
    info: 'bg-[var(--accent-soft)] text-[var(--accent-text)] border-[var(--border)]',
    success: 'bg-[var(--success-soft)] text-[var(--success)] border-[var(--border)]',
    warning: 'bg-[var(--warning-soft)] text-[var(--warning)] border-[var(--border)]',
    danger: 'bg-[var(--danger-soft)] text-[var(--danger)] border-[var(--border)]',
  };

  const effectiveProgress = typeof progress === 'number' ? progress : progressPct;
  const effectiveClick = onClick || onCtaClick;
  const effectiveActionLabel = actionLabel || ctaLabel;
  const isZero = value === 0 || value === '0';
  const effectiveDelta = delta || (isZero && emptyHint ? emptyHint : footerText);

  return (
    <GlassCard
      equalHeight
      padding="md"
      interactive={Boolean(effectiveClick)}
      onClick={effectiveClick}
      className="min-h-[124px] justify-between"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0">
          <div className="text-xs font-medium text-[var(--text-muted)] truncate" title={label}>{label}</div>
          <div className="text-[28px] font-bold tracking-tight text-[var(--text)] tabular-nums leading-none">
            {value}
          </div>
        </div>
        {Icon && (
          <div
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border ${iconToneMap[tone]}`}
          >
            <Icon className="h-5 w-5" strokeWidth={1.85} />
          </div>
        )}
      </div>

      <div className="mt-4 pt-2 flex items-center justify-between gap-2">
        {typeof effectiveProgress === 'number' ? (
          <div className="w-16 h-1.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] overflow-hidden shrink-0">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${Math.max(4, Math.min(100, effectiveProgress))}%` }}
            />
          </div>
        ) : null}
        {effectiveDelta && (
          <span className="text-xs text-[var(--text-muted)] truncate" title={typeof effectiveDelta === 'string' ? effectiveDelta : undefined}>
            {effectiveDelta}
          </span>
        )}
        {effectiveActionLabel && (
          <span className="ml-auto inline-flex items-center gap-0.5 text-xs font-semibold text-[var(--accent-text)] shrink-0">
            {effectiveActionLabel} <ChevronRight className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </GlassCard>
  );
});

// ============================================================================
// 3. PAGE HEADER PRIMITIVE (<PageHeader>)
// ============================================================================
export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: string;
  datePill?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions,
  eyebrow,
  datePill,
}) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      {eyebrow && (
        <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--accent-text)] mb-1">
          {eyebrow}
        </div>
      )}
      <h1 className="text-[26px] font-bold tracking-tight text-[var(--text)] leading-tight">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1 text-[14px] text-[var(--text-muted)] max-w-3xl line-clamp-2 sm:line-clamp-none" title={typeof subtitle === 'string' ? subtitle : undefined}>
          {subtitle}
        </p>
      )}
    </div>
    {(datePill || actions) && (
      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
        {datePill && (
          <span className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-xs font-medium text-[var(--text-2)]">
            <Calendar className="h-3.5 w-3.5 text-[var(--accent-text)]" />
            <span>{datePill}</span>
          </span>
        )}
        {actions}
      </div>
    )}
  </div>
);

// ============================================================================
// 4. BADGE & CHIP PRIMITIVES (<Badge>, <Chip>)
// ============================================================================
export interface BadgeProps {
  tone?: 'success' | 'warning' | 'danger' | 'neutral' | 'brass' | 'accent' | 'info';
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  tone = 'neutral',
  children,
  dot = false,
  className = '',
}) => {
  const styles = {
    success: 'bg-[var(--success-soft)] text-[var(--success)] border-[var(--border)]',
    warning: 'bg-[var(--warning-soft)] text-[var(--warning)] border-[var(--border)]',
    danger: 'bg-[var(--danger-soft)] text-[var(--danger)] border-[var(--border)]',
    brass: 'bg-[var(--accent-soft)] text-[var(--accent-text)] border-[var(--border)]',
    accent: 'bg-[var(--accent-soft)] text-[var(--accent-text)] border-[var(--border)]',
    info: 'bg-[var(--accent-soft)] text-[var(--accent-text)] border-[var(--border)]',
    neutral: 'bg-[var(--surface-2)] text-[var(--text-2)] border-[var(--border)]',
  };

  const dotColors = {
    success: 'bg-[var(--success)]',
    warning: 'bg-[var(--warning)]',
    danger: 'bg-[var(--danger)]',
    brass: 'bg-[var(--accent)]',
    accent: 'bg-[var(--accent)]',
    info: 'bg-[var(--accent)]',
    neutral: 'bg-[var(--text-muted)]',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${styles[tone]} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColors[tone]}`} />}
      {children}
    </span>
  );
};

export const Chip: React.FC<{
  children: React.ReactNode;
  onRemove?: () => void;
  active?: boolean;
}> = ({ children, onRemove, active = false }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
      active
        ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)]'
        : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]'
    }`}
  >
    <span>{children}</span>
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove tag"
        className="ml-0.5 rounded-full p-0.5 text-[var(--text-muted)] hover:text-[var(--danger)] cursor-pointer"
      >
        <X className="h-3 w-3" />
      </button>
    )}
  </span>
);

// ============================================================================
// 5. DEFINITION LIST PRIMITIVE (<DefinitionList>)
// ============================================================================
export interface DefinitionListItem {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
  badge?: React.ReactNode;
}

export const DefinitionList: React.FC<{
  items: DefinitionListItem[];
  onCopy?: (label: string, value: string) => void;
}> = ({ items, onCopy }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (label: string, val: string) => {
    if (!val) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(val).catch(() => {});
    }
    setCopiedKey(label);
    if (onCopy) onCopy(label, val);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === label ? null : prev));
    }, 1500);
  };

  return (
    <dl className="divide-y divide-[var(--border)]">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex min-h-[44px] items-center justify-between gap-4 py-2.5 text-sm"
        >
          <dt className="text-xs font-medium text-[var(--text-muted)] shrink-0">{item.label}</dt>
          <dd className="flex items-center justify-end gap-2 min-w-0 text-right">
            <span
              className={`truncate font-medium text-[var(--text)] ${
                item.mono ? 'font-mono text-xs tabular-nums' : 'text-[13.5px]'
              }`}
            >
              {item.value || '—'}
            </span>
            {item.badge}
            {item.copyable && item.value && (
              <button
                type="button"
                onClick={() => handleCopy(item.label, item.value)}
                title={`Copy ${item.label}`}
                aria-label={`Copy ${item.label}`}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent-text)] transition-colors cursor-pointer"
              >
                {copiedKey === item.label ? (
                  <Check className="h-3.5 w-3.5 text-[var(--success)]" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
};

// ============================================================================
// 6. CLICKABLE FULL-DETAIL ANNOUNCEMENT MODAL (<NoticeDetailModal>)
// ============================================================================
export const NoticeDetailModal: React.FC<{
  notice: NoticeItem | null;
  onClose: () => void;
  onMarkRead?: (noticeId: string) => void;
  onAcknowledge?: (noticeId: string) => void;
}> = ({ notice, onClose, onMarkRead, onAcknowledge }) => {
  const [copiedNotice, setCopiedNotice] = useState(false);

  if (!notice) return null;

  const handleAck = onMarkRead || onAcknowledge;

  const toneMap: Record<NoticeItem['category'], BadgeProps['tone']> = {
    Urgent: 'danger',
    Exam: 'warning',
    Fees: 'brass',
    Event: 'info',
    Academic: 'accent',
    Holiday: 'success',
  };

  const handleDownloadCircular = () => {
    const content = [
      '====================================================================',
      `OFFICIAL INSTITUTIONAL CIRCULAR — ${notice.college_name || 'CAMPUS PORTAL'}`,
      '====================================================================',
      `Notice ID        : ${notice.id}`,
      `Category         : ${notice.category}`,
      `Target Audience  : ${notice.audience_scope.toUpperCase()} · ${notice.audience_target}`,
      `College Code     : ${notice.college_code || 'ALL'}`,
      `Published By     : ${notice.created_by_name} (${notice.created_by_role})`,
      `Published Date   : ${new Date(notice.publish_at).toLocaleString('en-IN')}`,
      '--------------------------------------------------------------------',
      `SUBJECT: ${notice.title}`,
      '--------------------------------------------------------------------',
      '',
      notice.body,
      '',
      '====================================================================',
      'Verified Digital Bulletin · Campus Portal Institutional Platform',
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Circular-${notice.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <ModalDialog
      open={Boolean(notice)}
      onClose={onClose}
      maxWidth="2xl"
      title={notice.title}
      description={`Official ${notice.category} Announcement · Published by ${notice.created_by_name} (${notice.created_by_role})`}
    >
      <div className="space-y-5">
        {/* Top Metadata Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={toneMap[notice.category]} dot>
              {notice.category} Circular
            </Badge>
            {notice.pinned && <Badge tone="danger">Pinned Bulletin</Badge>}
            <Badge tone="neutral">
              Scope: {notice.audience_scope.toUpperCase()} · {notice.audience_target}
            </Badge>
            {notice.college_code && (
              <span className="rounded-md bg-[var(--accent-soft)] px-2.5 py-0.5 font-mono text-xs font-semibold text-[var(--accent-text)]">
                {notice.college_code}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-mono">
            <Calendar className="h-3.5 w-3.5 text-[var(--accent-text)]" />
            <span>
              {new Date(notice.publish_at).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        {/* Full Readable Body Content */}
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)] p-5 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Full Announcement Details &amp; Instructions
          </div>
          <div className="text-[14px] leading-relaxed text-[var(--text)] whitespace-pre-line">
            {notice.body}
          </div>
        </div>

        {/* Publisher & Telemetry Details */}
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2">
          <DefinitionList
            items={[
              {
                label: 'Published By',
                value: `${notice.created_by_name} (${notice.created_by_role})`,
              },
              {
                label: 'Institution / College',
                value: notice.college_name
                  ? `${notice.college_name}${notice.college_code ? ` (${notice.college_code})` : ''}`
                  : 'All Registered Campuses',
              },
              {
                label: 'Read & Acknowledged',
                value: `${notice.read_count} of ${notice.total_target_count} recipients`,
                mono: true,
              },
              {
                label: 'Circular Reference ID',
                value: notice.id,
                mono: true,
                copyable: true,
              },
            ]}
          />
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard
                    .writeText(`${notice.title}\n\n${notice.body}`)
                    .catch(() => {});
                }
                setCopiedNotice(true);
                setTimeout(() => setCopiedNotice(false), 1500);
              }}
            >
              {copiedNotice ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[var(--success)]" />
                  <span>Copied Text</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Bulletin</span>
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleDownloadCircular}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Circular</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {handleAck && !notice.is_read && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  handleAck(notice.id);
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Mark as Read &amp; Acknowledge</span>
              </Button>
            )}
            {notice.is_read && <Badge tone="success" dot>Acknowledged</Badge>}
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </ModalDialog>
  );
};

// ============================================================================
// 7. CORE ATOMIC FORM & UI PRIMITIVES
// ============================================================================
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  children,
  disabled,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center gap-2 font-sans font-semibold transition-all duration-150 rounded-[10px] select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  const variants: Record<ButtonVariant, string> = {
    primary:
      'bg-[var(--accent)] text-[var(--on-accent)] border border-transparent hover:opacity-95 active:scale-[0.99]',
    secondary:
      'bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-2)]',
    ghost:
      'bg-transparent text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]',
    danger: 'bg-[var(--danger)] text-[#FFFFFF] border border-transparent hover:opacity-95',
  };

  const sizes: Record<ButtonSize, string> = {
    sm: 'h-[36px] text-xs px-3.5',
    md: 'h-[40px] text-sm px-4',
    lg: 'h-[44px] text-sm px-5',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span
          className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  id,
  className = '',
  ...props
}) => {
  const generatedId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={generatedId} className="text-[13px] font-semibold text-[var(--text)]">
          {label}
        </label>
      )}
      <input
        id={generatedId}
        className={`h-[44px] w-full rounded-[10px] border bg-[var(--surface-2)] px-[14px] text-[14px] text-[var(--text)] placeholder:text-[var(--placeholder)] transition-all disabled:opacity-60 ${
          error ? 'border-[var(--danger)]' : 'border-[var(--border)] focus:border-[var(--accent)]'
        } ${className}`}
        {...props}
      />
      {error && (
        <p role="alert" className="text-[12px] text-[var(--danger)] flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
      {!error && hint && <p className="text-[12px] text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  id,
  className = '',
  ...props
}) => {
  const generatedId = id || `select-${label?.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={generatedId} className="text-[13px] font-semibold text-[var(--text)]">
          {label}
        </label>
      )}
      <select
        id={generatedId}
        className={`h-[44px] w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] px-[14px] text-[14px] text-[var(--text)] transition-all focus:border-[var(--accent)] disabled:opacity-60 ${className}`}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export const Switch: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}> = ({ checked, onChange, label, description, disabled }) => (
  <div className="flex items-start justify-between gap-4 py-2.5">
    <div>
      <div className="text-sm font-medium text-[var(--text)]">{label}</div>
      {description && <div className="text-xs text-[var(--text-muted)] mt-0.5">{description}</div>}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors duration-200 cursor-pointer disabled:opacity-50 ${
        checked
          ? 'bg-[var(--accent)] border-[var(--accent)]'
          : 'bg-[var(--surface-2)] border-[var(--border)]'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full transition-transform duration-200 mt-0.5 ${
          checked
            ? 'translate-x-5 bg-[#FFFFFF]'
            : 'translate-x-0.5 bg-[var(--text-muted)]'
        }`}
      />
    </button>
  </div>
);

export const StatusLabel: React.FC<{
  tone: 'success' | 'warning' | 'danger' | 'neutral' | 'brass' | 'accent';
  label: string;
}> = ({ tone, label }) => {
  const styles = {
    success: 'bg-[var(--success-soft)] text-[var(--success)] border-[var(--border)]',
    warning: 'bg-[var(--warning-soft)] text-[var(--warning)] border-[var(--border)]',
    danger: 'bg-[var(--danger-soft)] text-[var(--danger)] border-[var(--border)]',
    brass: 'bg-[var(--accent-soft)] text-[var(--accent-text)] border-[var(--border)]',
    accent: 'bg-[var(--accent-soft)] text-[var(--accent-text)] border-[var(--border)]',
    neutral: 'bg-[var(--surface-2)] text-[var(--text-2)] border-[var(--border)]',
  };
  const Icon =
    tone === 'success'
      ? CheckCircle2
      : tone === 'warning'
        ? AlertTriangle
        : tone === 'danger'
          ? AlertCircle
          : tone === 'brass'
            ? Clock
            : Info;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${styles[tone]}`}
    >
      <Icon className="h-3 w-3 shrink-0" strokeWidth={2} />
      <span>{label}</span>
    </span>
  );
};

export const Avatar: React.FC<{
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  avatarId?: string;
  photoUrl?: string;
  imagenStyle?: ImagenAvatarStyle;
  customInitials?: string;
  className?: string;
}> = ({
  name,
  size = 'md',
  avatarId,
  photoUrl,
  imagenStyle,
  customInitials,
  className = '',
}) => {
  const dims = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
    '2xl': 'h-24 w-24 text-2xl',
  };

  if (photoUrl) {
    return (
      <div
        className={`relative inline-flex items-center justify-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-2)] shrink-0 ${dims[size]} ${className}`}
      >
        <img
          src={photoUrl}
          alt={name}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  if (avatarId) {
    return (
      <div
        className={`relative inline-flex items-center justify-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-2)] shrink-0 ${dims[size]} ${className}`}
      >
        <BuiltInAvatarGraphic avatarId={avatarId} name={name} className="h-full w-full" />
      </div>
    );
  }

  // Imagen AI Initial-Seed Placeholder Avatar
  const imagenAvatarUrl = generateImagenAvatarSvgDataUrl(name, {
    customInitials,
    styleId: imagenStyle,
  });

  return (
    <div
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-2)] shrink-0 shadow-xs transition-transform hover:scale-105 ${dims[size]} ${className}`}
      title={`Imagen AI Generated Avatar Seed (${name})`}
    >
      <img
        src={imagenAvatarUrl}
        alt={`Imagen AI Avatar for ${name}`}
        className="h-full w-full object-cover"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

export const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-10 w-full' }) => (
  <div className={`animate-pulse rounded-[12px] bg-[var(--surface-2)] ${className}`} />
);

export const EmptyState: React.FC<{
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, description, actionLabel, onAction }) => (
  <div className="glass flex flex-col items-center justify-center p-10 text-center">
    <h3 className="font-editorial text-lg font-semibold text-[var(--text)]">{title}</h3>
    <p className="mt-1 max-w-md text-sm text-[var(--text-muted)]">{description}</p>
    {actionLabel && onAction && (
      <div className="mt-4">
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      </div>
    )}
  </div>
);

export interface BreadcrumbItem {
  label: string;
  code?: string;
  onClick?: () => void;
  isCurrent?: boolean;
}

export const Breadcrumbs: React.FC<{ items: BreadcrumbItem[] }> = ({ items }) => (
  <nav aria-label="Breadcrumb" className="min-w-0">
    <ol className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1 || item.isCurrent;
        return (
          <li key={idx} className="inline-flex items-center gap-1.5 min-w-0">
            {idx > 0 && (
              <ChevronRight
                className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            )}
            {item.onClick && !isLast ? (
              <button
                type="button"
                onClick={item.onClick}
                title={item.label}
                className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors cursor-pointer whitespace-nowrap truncate max-w-[120px] sm:max-w-[200px]"
              >
                {item.label}
              </button>
            ) : (
              <span
                aria-current={isLast ? 'page' : undefined}
                className={`inline-flex items-center gap-1.5 min-w-0 ${
                  isLast ? 'font-semibold text-[var(--text)]' : 'text-[var(--text-muted)]'
                }`}
              >
                <span className="truncate max-w-[120px] sm:max-w-[240px]" title={item.label}>
                  {item.label}
                </span>
              </span>
            )}
          </li>
        );
      })}
    </ol>
  </nav>
);

export const ModalDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  maxWidth?: 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  children: React.ReactNode;
}> = ({ open, onClose, title, description, maxWidth = 'lg', children }) => {
  if (!open) return null;
  const maxWidthClass = {
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
  }[maxWidth];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto"
    >
      <div
        className={`w-full ${maxWidthClass} max-h-[90vh] overflow-y-auto rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
          <div>
            <h3 className="font-editorial text-lg font-bold text-[var(--text)]">{title}</h3>
            {description && <p className="mt-1 text-xs text-[var(--text-muted)]">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-[10px] p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] cursor-pointer"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
};

export const Reveal: React.FC<{
  children: React.ReactNode;
  delayMs?: number;
  className?: string;
}> = ({ children, delayMs = 0, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        transitionDelay: `${delayMs}ms`,
        transitionDuration: '600ms',
        transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      className={`transition-all ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      } ${className}`}
    >
      {children}
    </div>
  );
};

export const CountUp: React.FC<{
  end: number;
  suffix?: string;
  decimals?: number;
}> = ({ end, suffix = '', decimals = 0 }) => {
  const [value, setValue] = useState(end);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setValue(end);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const startTime = performance.now();
          const duration = 900;

          const tick = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(1, elapsed / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Number((end * eased).toFixed(decimals)));
            if (progress < 1) {
              requestAnimationFrame(tick);
            } else {
              setValue(end);
            }
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [end, decimals]);

  return (
    <span ref={ref} className="tabular-nums">
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
};

export const CampusLogo: React.FC<{
  size?: 'sm' | 'md';
  subtitle?: string;
  compact?: boolean;
  iconOnly?: boolean;
}> = ({ size = 'md', subtitle, compact = false, iconOnly = false }) => (
  <span className="inline-flex items-center gap-2.5 min-w-0">
    <svg
      viewBox="0 0 40 40"
      className={size === 'sm' || compact ? 'h-8 w-8 shrink-0' : 'h-9 w-9 shrink-0'}
      aria-hidden="true"
    >
      <rect x="1" y="1" width="38" height="38" rx="11" fill="#4F46E5" />
      <path d="M20 9L9 14.5V17H31V14.5L20 9Z" fill="#FFFFFF" />
      <path
        d="M13 19.5V27.5M17.6 19.5V27.5M22.4 19.5V27.5M27 19.5V27.5"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path d="M10 30.5H30" stroke="#A5B4FC" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
    {!iconOnly && (
      <span className="flex flex-col leading-tight min-w-0">
        <span
          className={`font-editorial font-bold tracking-tight text-[var(--text)] ${
            size === 'sm' || compact ? 'text-base' : 'text-lg'
          }`}
        >
          Campus Portal
        </span>
        {subtitle && !compact && (
          <span className="text-[11px] font-medium text-[var(--text-muted)] leading-snug truncate">
            {subtitle}
          </span>
        )}
      </span>
    )}
  </span>
);

export const ThemeToggleButton: React.FC<{
  isDark: boolean;
  onToggle: () => void;
  compact?: boolean;
}> = ({ isDark, onToggle, compact = true }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--accent-text)] cursor-pointer shrink-0"
  >
    {isDark ? (
      <Sun className="h-4 w-4 text-[var(--warning)]" strokeWidth={1.85} />
    ) : (
      <Moon className="h-4 w-4 text-[var(--accent-text)]" strokeWidth={1.85} />
    )}
    {!compact && <span className="ml-2 text-xs font-medium">{isDark ? 'Light' : 'Dark'}</span>}
  </button>
);

export const CampusArchitecturalPlate: React.FC<{
  variant?: 'quadrangle' | 'library' | 'auditorium';
  caption?: string;
  className?: string;
}> = ({ variant = 'quadrangle', caption, className = '' }) => {
  return (
    <div
      className={`group relative overflow-hidden rounded-[16px] border border-[var(--border)] bg-[#162235] text-[#F6F4EF] ${className}`}
    >
      <svg
        viewBox="0 0 800 640"
        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        aria-label={caption || 'University Campus Architecture'}
        role="img"
      >
        <rect width="800" height="640" fill="#132033" />
        <rect x="0" y="0" width="800" height="460" fill="#1A2C47" />
        <circle cx="630" cy="120" r="68" fill="#818CF8" fillOpacity="0.22" />

        {variant === 'quadrangle' && (
          <>
            <path d="M80 230 L400 95 L720 230 Z" fill="#E3DFD6" fillOpacity="0.95" />
            <path d="M115 222 L400 112 L685 222 Z" fill="#162235" />
            <circle cx="400" cy="178" r="24" stroke="#818CF8" strokeWidth="3.5" fill="#0E1A2B" />
            <rect x="70" y="230" width="660" height="22" fill="#F6F4EF" />
            {[120, 210, 300, 390, 480, 570, 650].map((x) => (
              <g key={x}>
                <rect x={x} y="252" width="32" height="230" fill="#EBE6DC" />
                <rect x={x + 6} y="252" width="6" height="230" fill="#D5CFC2" />
              </g>
            ))}
            {[162, 252, 342, 432, 522, 610].map((x) => (
              <rect
                key={x}
                x={x}
                y="286"
                width="36"
                height="96"
                rx="18"
                fill="#818CF8"
                fillOpacity="0.3"
              />
            ))}
            <rect x="50" y="482" width="700" height="20" fill="#D5CFC2" />
            <rect x="25" y="502" width="750" height="24" fill="#C4BCAE" />
            <rect x="0" y="526" width="800" height="114" fill="#0E1A2B" />
          </>
        )}

        {variant === 'library' && (
          <>
            {[110, 310, 510].map((x) => (
              <g key={x}>
                <rect
                  x={x}
                  y="100"
                  width="160"
                  height="340"
                  rx="80"
                  fill="#F6F4EF"
                  fillOpacity="0.12"
                  stroke="#818CF8"
                  strokeOpacity="0.45"
                  strokeWidth="2"
                />
                <line x1={x + 80} y1="100" x2={x + 80} y2="440" stroke="#E3DFD6" strokeOpacity="0.25" />
                <line x1={x} y1="270" x2={x + 160} y2="270" stroke="#E3DFD6" strokeOpacity="0.25" />
              </g>
            ))}
            <rect x="60" y="470" width="680" height="16" fill="#4F46E5" />
            <rect x="0" y="486" width="800" height="154" fill="#0E1A2B" />
          </>
        )}

        {variant === 'auditorium' && (
          <>
            <rect x="90" y="140" width="620" height="320" fill="#1E3250" stroke="#818CF8" strokeOpacity="0.4" />
            {[140, 220, 300, 380, 460, 540, 620].map((x) => (
              <line key={x} x1={x} y1="140" x2={x} y2="460" stroke="#F6F4EF" strokeOpacity="0.2" strokeWidth="8" />
            ))}
            <rect x="0" y="460" width="800" height="180" fill="#0E1A2B" />
          </>
        )}
      </svg>
    </div>
  );
};

export const DesignSystemShowcase: React.FC<{
  isDark: boolean;
  onToggleTheme: () => void;
  onBackHome: () => void;
}> = ({ isDark, onToggleTheme, onBackHome }) => {
  const [switchDemo, setSwitchDemo] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const unitTests = runFinanceAndAcademicUnitTests();

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[var(--bg)] text-[var(--text)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="flex w-full items-center justify-between gap-8 px-6 py-4 sm:px-10 lg:px-16">
          <div className="flex items-center gap-4">
            <Button variant="secondary" size="sm" onClick={onBackHome}>
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
              Back to Home
            </Button>
            <CampusLogo size="sm" />
          </div>
          <ThemeToggleButton isDark={isDark} onToggle={onToggleTheme} />
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-10 px-6 py-10 sm:px-10">
        <GlassCard className="space-y-4">
          <h2 className="font-editorial text-2xl font-bold text-[var(--text)]">
            Campus Portal UI System &amp; Verification
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary Action</Button>
            <Button variant="secondary">Secondary Action</Button>
            <Button variant="ghost">Ghost Action</Button>
            <Button variant="danger">Danger Action</Button>
            <Badge tone="success" dot>Active &amp; Verified</Badge>
            <Badge tone="warning" dot>Pending Approval</Badge>
            <Badge tone="accent">COLL-1234</Badge>
          </div>
          <Switch
            checked={switchDemo}
            onChange={setSwitchDemo}
            label="Block Hall Ticket on Overdue Fees"
            description="Controlled by Super Admin institutional policy"
          />
          <Button variant="secondary" size="sm" onClick={() => setDialogOpen(true)}>
            Open Modal Preview
          </Button>
        </GlassCard>

        <GlassCard className="space-y-4">
          <h2 className="font-editorial text-xl font-bold text-[var(--text)]">
            Automated Unit Tests: Integer-Paise Financial &amp; Attendance Math
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] text-xs text-[var(--text-muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Test Assertion</th>
                  <th className="px-4 py-3 font-medium">Expected Output</th>
                  <th className="px-4 py-3 font-medium">Actual Output</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {unitTests.map((t, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 font-medium text-[var(--text)]">{t.name}</td>
                    <td className="px-4 py-3 font-mono text-xs tabular-nums text-[var(--text-muted)]">
                      {t.expected}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs tabular-nums text-[var(--text)]">
                      {t.actual}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={t.passed ? 'success' : 'danger'}>
                        {t.passed ? 'PASS' : 'FAIL'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>


      </main>

      <ModalDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Accessible Modal Primitive"
        description="Keyboard-navigable dialog with solid surface contrast."
      >
        <p className="text-sm text-[var(--text-muted)]">
          All dialogs in Campus Portal use high-contrast solid surfaces.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setDialogOpen(false)}>
            Close
          </Button>
        </div>
      </ModalDialog>
    </div>
  );
};
