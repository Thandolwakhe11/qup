import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

const number = ((import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) ?? '14155238886').replace(/\D/g, '');
const text = (import.meta.env.VITE_WHATSAPP_TEXT as string | undefined) ?? 'Hi';

export default function Poster({ clinicName, onBack }: { clinicName: string; onBack: () => void }) {
  const [qr, setQr] = useState('');
  const link = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;

  useEffect(() => {
    QRCode.toDataURL(link, { width: 600, margin: 1, color: { dark: '#0F2A5F', light: '#FFFFFF' } }).then(setQr);
  }, [link]);

  return (
    <>
      <div className="header no-print">
        <div className="brand">QUp<small>QR Poster</small></div>
        <div className="header-right">
          <button onClick={onBack}>BACK</button>
          <button onClick={() => window.print()}>PRINT / SAVE PDF</button>
        </div>
      </div>

      <div className="poster-wrap">
        <div className="poster">
          <div className="poster-logo">QUp</div>
          <h1>Skip the queue.<br />Wait where you want.</h1>
          <p>Scan to join the {clinicName || 'clinic'} queue on WhatsApp</p>
          <div className="poster-qr">{qr && <img src={qr} alt="QR code to join the queue on WhatsApp" />}</div>
          <div className="poster-steps">
            <div><b>1</b>Scan, then press Send in WhatsApp</div>
            <div><b>2</b>Pick your language and reason</div>
            <div><b>3</b>Get your ticket and alerts</div>
          </div>
          <p className="poster-foot">Free · English · isiZulu · Afrikaans · No app needed</p>
        </div>
      </div>
    </>
  );
}