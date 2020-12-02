import React, { useState } from 'react';
import { render } from 'react-dom';
import { Button, Modal } from 'react-bootstrap';

const isExtensionInstalled = info => new Promise(resolve => {
  const img = new Image();
  img.src = `chrome-extension://${info.id}/${info.path}`;
  img.onload = () => {
      resolve(true);
  };
  img.onerror = () => {
    resolve(false);
  };
});

const ExtensionPopup = () => {
  const [modalShowing, setModalShowing] = useState(true);
  const handleHide = () => { setModalShowing(false); };
  return (
    <Modal show={modalShowing} onHide={handleHide}>
      <Modal.Header className="mx-auto">
        <Modal.Title>
          <p>Do you know?</p>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center">
        <p>
          {'We have a '}
          <a
            href="https://chrome.google.com/webstore/detail/codebattle-web-extension/embfhnfkfobkdohleknckodkmhgmpdli?hl=ru&"
            target="_blank"
            rel="noreferrer"
            className="alert-link"
          >
            chrome extension
          </a>
          , would you like to install it?
        </p>
      </Modal.Body>
      <Modal.Footer className="mx-auto">
        <Button
          variant="outline-success"
          target="_blank"
          rel="noreferrer"
          href="https://chrome.google.com/webstore/detail/codebattle-web-extension/embfhnfkfobkdohleknckodkmhgmpdli?hl=ru&"
        >
          Install
        </Button>
        <Button
          variant="outline-secondary"
          onClick={handleHide}
        >
          Close
        </Button>
      </Modal.Footer>
    </Modal>
);
};

export default domElement => {
  const lastCheckExtension = window.localStorage.getItem('lastCheckExtension');
  const nowTime = Date.now();
  const threeDay = 1000 * 60 * 60 * 24 * 3;
  const isExpired = Number(lastCheckExtension) + threeDay < nowTime;
  if (window.chrome && isExpired) {
    // TODO: move to env config extension id and icon path
    const extensionInfo = { id: 'embfhnfkfobkdohleknckodkmhgmpdli', path: 'assets/128.png' };
    isExtensionInstalled(extensionInfo).then(isInstall => {
      if (!isInstall) {
        window.localStorage.setItem('lastCheckExtension', nowTime);
        render(<ExtensionPopup />, domElement);
      }
    });
  }
};
