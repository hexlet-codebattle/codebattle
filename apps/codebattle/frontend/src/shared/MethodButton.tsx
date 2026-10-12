import { ActionIcon, type ActionIconProps, Button, type ButtonProps, Tooltip } from '@mantine/core';
import type { ReactNode } from 'react';

const csrfToken = () => document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';

interface MethodButtonProps extends ButtonProps {
  /** Form target; Phoenix reads the real verb from `_method`. */
  action: string;
  method: 'post' | 'patch' | 'put' | 'delete';
  /** Ask before submitting (browser confirm, like the legacy `data-confirm`). */
  confirm?: string;
  children: ReactNode;
}

interface MethodActionIconProps extends Omit<ActionIconProps, 'children'> {
  action: string;
  method: 'post' | 'patch' | 'put' | 'delete';
  confirm?: string;
  /** Tooltip and accessible name. */
  label: string;
  icon: ReactNode;
}

/** Compact icon version of MethodButton for dense tables. */
export function MethodActionIcon({ action, method, confirm, label, icon, ...props }: MethodActionIconProps) {
  return (
    <form
      method="post"
      action={action}
      style={{ display: 'inline-flex' }}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      <input type="hidden" name="_method" value={method} />
      <input type="hidden" name="_csrf_token" value={csrfToken()} />
      <Tooltip label={label}>
        <ActionIcon type="submit" size="sm" variant="subtle" aria-label={label} {...props}>
          {icon}
        </ActionIcon>
      </Tooltip>
    </form>
  );
}

/**
 * Admin/owner actions on server routes (activate, disable, delete…): a plain
 * form post with CSRF and method override, so the controllers stay as they are.
 */
export function MethodButton({ action, method, confirm, children, ...props }: MethodButtonProps) {
  return (
    <form
      method="post"
      action={action}
      style={{ display: 'inline' }}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      <input type="hidden" name="_method" value={method} />
      <input type="hidden" name="_csrf_token" value={csrfToken()} />
      <Button type="submit" size="compact-xs" {...props}>
        {children}
      </Button>
    </form>
  );
}
