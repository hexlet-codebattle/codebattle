import React, { type CSSProperties, type ReactNode } from 'react';

import { Box, Modal as MantineModal, ScrollArea } from '@mantine/core';
import cn from 'classnames';

// App modal wrapper: exposes a compound API (<CbModal>, CbModal.Header/Title/
// Body/Footer) over Mantine's Modal so call sites read as a single modal unit.
interface CbModalProps {
  show?: boolean;
  onHide?: () => void;
  centered?: boolean;
  backdrop?: boolean | 'static';
  keyboard?: boolean;
  size?: string;
  className?: string;
  contentClassName?: string;
  dialogClassName?: string;
  children?: ReactNode;
}

interface HeaderProps {
  style?: CSSProperties;
  closeButton?: boolean;
  className?: string;
  children?: ReactNode;
}

interface TitleProps {
  className?: string;
  children?: ReactNode;
}

interface SectionProps {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

function Header({ closeButton, className, children, style = {} }: HeaderProps) {
  return (
    <MantineModal.Header style={{ display: 'flex', flexShrink: 0, ...style }} className={className} >
      {children}
      {closeButton && <MantineModal.CloseButton />}
    </MantineModal.Header>
  );
}

function Title({ className, children }: TitleProps) {
  return <MantineModal.Title className={className}>{children}</MantineModal.Title>;
}

function Body({ className, style = {}, children }: SectionProps) {
  return (
    <MantineModal.Body
      className={className}
      style={{
        maxHeight: '70vh',
        overflowX: 'hidden',
        ...style
      }}
    >
      {children}
    </MantineModal.Body>
  );
}

// Mantine has no modal footer; render a right-aligned, top-bordered row.
function Footer({ className, style, children }: SectionProps) {
  return (
    <Box
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
        justifyContent: 'flex-end',
        gap: 'var(--mantine-spacing-sm)',
        padding: 'var(--mantine-spacing-md)',
        borderTop: '1px solid var(--mantine-color-default-border)',
        ...style,
      }}
    >
      {children}
    </Box>
  );
}

interface CbModalComponent extends React.FC<CbModalProps> {
  Header: typeof Header;
  Title: typeof Title;
  Body: typeof Body;
  Footer: typeof Footer;
}

const noop = () => { };

const CbModal = (({
  show,
  onHide,
  centered,
  backdrop,
  keyboard,
  size,
  className,
  contentClassName,
  dialogClassName,
  children,
}: CbModalProps) => (
  <MantineModal.Root
    opened={!!show}
    onClose={onHide ?? noop}
    centered={centered}
    size={size ?? 'lg'}
    closeOnClickOutside={backdrop !== 'static'}
    closeOnEscape={keyboard !== false}
    className={className}
  >
    <MantineModal.Overlay />
    <MantineModal.Content style={{ overflow: 'hidden' }} className={cn(contentClassName, dialogClassName)}>
      {children}
    </MantineModal.Content>
  </MantineModal.Root>
)) as CbModalComponent;

CbModal.displayName = 'CbModal';
CbModal.Header = Header;
CbModal.Title = Title;
CbModal.Body = Body;
CbModal.Footer = Footer;

export default CbModal;
