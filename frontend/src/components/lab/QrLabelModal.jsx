import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Modal from './Modal';

// Lien ouvert par le scan : la page du dossier dans l'espace laboratoire.
// Il faut etre connecte avec un compte labo pour la voir ; le QR ne contient
// aucune donnee medicale, seulement ce lien.
export function dossierUrl(id) {
  return `${window.location.origin}${window.location.pathname}#/lab/dossier/${id}`;
}

const dateFr = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '');
const echapper = (texte) =>
  String(texte ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Etiquettes QR (une par dossier) avec impression.
export default function QrLabelModal({ show, onClose, dossiers = [] }) {
  const [etiquettes, setEtiquettes] = useState([]);
  // Cle stable : le tableau `dossiers` est souvent recree a chaque rendu du parent.
  const cle = dossiers.map((d) => d.id).join(',');

  useEffect(() => {
    if (!show) {
      setEtiquettes([]);
      return undefined;
    }
    let annule = false;
    Promise.all(
      dossiers.map(async (d) => ({
        id: d.id,
        patient: d.patient_nom || '-',
        numero: d.numero_client || '',
        date: dateFr(d.created_at),
        qr: await QRCode.toDataURL(dossierUrl(d.id), { width: 240, margin: 1, errorCorrectionLevel: 'M' }),
      }))
    ).then((liste) => {
      if (!annule) setEtiquettes(liste);
    });
    return () => {
      annule = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, cle]);

  const imprimer = () => {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Etiquettes</title>
      <style>
        @page { margin: 8mm; }
        body { font-family: Arial, sans-serif; margin: 0; }
        .etiquette { display: inline-flex; align-items: center; gap: 4mm; width: 85mm; height: 32mm;
          border: 0.3mm dashed #999; padding: 2mm; margin: 0 2mm 3mm 0; box-sizing: border-box;
          page-break-inside: avoid; vertical-align: top; }
        .etiquette img { width: 28mm; height: 28mm; }
        .texte { font-size: 10pt; line-height: 1.35; overflow: hidden; }
        .clinique { font-size: 8pt; color: #555; }
        .patient { font-weight: bold; font-size: 11pt; }
      </style></head><body>
      ${etiquettes
        .map(
          (e) => `<div class="etiquette"><img src="${e.qr}" alt="QR">
            <div class="texte"><div class="clinique">CLINIQUE SOPE NABY - Laboratoire</div>
            <div class="patient">${echapper(e.patient)}</div>
            ${e.numero ? `<div>N&deg; client : ${echapper(e.numero)}</div>` : ''}
            ${e.date ? `<div>Date : ${echapper(e.date)}</div>` : ''}</div></div>`
        )
        .join('')}
      </body></html>`;

    const iframe = document.createElement('iframe');
    Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
    iframe.srcdoc = html;
    iframe.onload = () => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => iframe.remove(), 60000);
    };
    document.body.appendChild(iframe);
  };

  return (
    <Modal show={show} onClose={onClose} title="QR code du dossier" maxWidth={560}>
      {etiquettes.length === 0 ? (
        <div className="text-center py-4">
          <div className="spinner-border text-primary"></div>
        </div>
      ) : (
        <>
          {etiquettes.map((e) => (
            <div key={e.id} className="d-flex align-items-center gap-3 border rounded p-2 mb-2">
              <img src={e.qr} alt={`QR du dossier de ${e.patient}`} width={110} height={110} />
              <div>
                <div className="fw-bold">{e.patient}</div>
                {e.numero && <div className="small">N&deg; client : {e.numero}</div>}
                {e.date && <div className="small text-muted">Date : {e.date}</div>}
              </div>
            </div>
          ))}
          <p className="small text-muted mb-3">
            Le scan ouvre le dossier dans l'application. Il faut etre connecte avec un compte du laboratoire.
          </p>
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
              Fermer
            </button>
            <button type="button" className="btn btn-primary" onClick={imprimer}>
              <i className="bi bi-printer me-2"></i>
              Imprimer {etiquettes.length > 1 ? `les ${etiquettes.length} etiquettes` : "l'etiquette"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
