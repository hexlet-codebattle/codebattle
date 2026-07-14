import React, { type ReactNode } from 'react';

import { createPortal } from 'react-dom';

const modalRoot = document.getElementById('modal-root');

interface ModalProps {
  children?: ReactNode;
}

export default class Modal extends React.Component<ModalProps> {
  el: HTMLDivElement;

  constructor(props: ModalProps) {
    super(props);
    this.el = document.createElement('div');
  }

  componentDidMount() {
    modalRoot!.appendChild(this.el);
  }

  componentWillUnmount() {
    modalRoot!.removeChild(this.el);
  }

  render() {
    const { children } = this.props;
    return createPortal(children, this.el);
  }
}
