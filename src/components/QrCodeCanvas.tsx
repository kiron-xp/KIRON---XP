import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QrCodeCanvasProps {
  value: string;
  size?: number;
  className?: string;
}

export function QrCodeCanvas({ value, size = 192, className = '' }: QrCodeCanvasProps) {
  const [svgMarkup, setSvgMarkup] = useState<string>('');

  useEffect(() => {
    let active = true;
    QRCode.toString(value, {
      type: 'svg',
      width: size,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    })
      .then((svg) => {
        if (active) setSvgMarkup(svg);
      })
      .catch(() => {
        if (active) setSvgMarkup('');
      });

    return () => {
      active = false;
    };
  }, [value, size]);

  if (!svgMarkup) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xs text-slate-400 ${className}`}
      >
        QR
      </div>
    );
  }

  return (
    <div
      className={`inline-block rounded-xl bg-white p-2 border border-slate-200 dark:border-slate-700 ${className}`}
      style={{ width: size + 16, height: size + 16 }}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
      aria-label="QR Code"
    />
  );
}
