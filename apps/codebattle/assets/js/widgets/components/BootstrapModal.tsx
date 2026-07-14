import React from 'react';

import RBModal, { type ModalProps } from 'react-bootstrap/Modal';
import ModalDialog from 'react-bootstrap/ModalDialog';

const BootstrapModal = React.forwardRef<HTMLDivElement, ModalProps>(
  ({ dialogAs, ...props }, ref) => (
    <RBModal ref={ref} dialogAs={dialogAs || ModalDialog} {...props} />
  ),
) as React.ForwardRefExoticComponent<ModalProps & React.RefAttributes<HTMLDivElement>> & {
  Body: typeof RBModal.Body;
  Header: typeof RBModal.Header;
  Title: typeof RBModal.Title;
  Footer: typeof RBModal.Footer;
  Dialog: typeof RBModal.Dialog;
};

BootstrapModal.displayName = 'BootstrapModal';
BootstrapModal.Body = RBModal.Body;
BootstrapModal.Header = RBModal.Header;
BootstrapModal.Title = RBModal.Title;
BootstrapModal.Footer = RBModal.Footer;
BootstrapModal.Dialog = RBModal.Dialog;

export default BootstrapModal;
