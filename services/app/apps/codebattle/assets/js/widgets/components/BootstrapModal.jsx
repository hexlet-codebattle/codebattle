import React from 'react';

import RBModal from 'react-bootstrap/Modal';
import ModalDialog from 'react-bootstrap/ModalDialog';

const BootstrapModal = React.forwardRef(({ dialogAs, ...props }, ref) => (
  <RBModal
    ref={ref}
    dialogAs={dialogAs || ModalDialog}
    {...props}
  />
));

BootstrapModal.displayName = 'BootstrapModal';
BootstrapModal.Body = RBModal.Body;
BootstrapModal.Header = RBModal.Header;
BootstrapModal.Title = RBModal.Title;
BootstrapModal.Footer = RBModal.Footer;
BootstrapModal.Dialog = RBModal.Dialog;

export default BootstrapModal;
