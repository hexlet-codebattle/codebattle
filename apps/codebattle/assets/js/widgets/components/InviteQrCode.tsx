import React from 'react';

import cn from 'classnames';
import i18n from 'i18next';
import { QRCodeSVG } from 'qrcode.react';

interface InviteQrCodeProps {
  value: string;
  size?: number;
  className?: string;
  testId?: string;
}

// Renders an invite URL as a scannable QR code. The code is always drawn
// black-on-white with a quiet zone (marginSize) so webcams and phones can read
// it regardless of the surrounding (often dark) theme.
function InviteQrCode({
  value,
  size = 256,
  className,
  testId = 'invite-qr-code',
}: InviteQrCodeProps) {
  const label = i18n.t('QR code for the invite link');

  return (
    <div
      className={cn('d-inline-block bg-white rounded p-2', className)}
      data-testid={testId}
      data-value={value}
    >
      <QRCodeSVG
        value={value}
        size={size}
        level="M"
        marginSize={2}
        bgColor="#ffffff"
        fgColor="#000000"
        title={label}
        role="img"
        aria-label={label}
        style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
      />
    </div>
  );
}

export default InviteQrCode;
