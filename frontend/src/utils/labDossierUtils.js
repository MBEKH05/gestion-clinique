export const STATUT_LABELS = {
  EN_ATTENTE: { label: 'En attente', className: 'badge-warning' },
  VALIDE_MEDECIN: { label: 'Valide medecin', className: 'badge-success' },
  REFUSE: { label: 'Refuse', className: 'badge-danger' },
  VALIDE_FINAL: { label: 'Valide final', className: 'bg-info' },
  ARCHIVE: { label: 'Archive', className: 'bg-secondary' },
};

export function statutBadge(statut) {
  return STATUT_LABELS[statut] || { label: statut, className: 'bg-secondary' };
}

export function buildWhatsAppLink(dossier) {
  const telephone = (dossier.patient_telephone || '').replace(/[^\d+]/g, '');
  const documents = dossier.documents || [];
  const intro = documents.length > 1
    ? `Vos resultats d'analyse (dossier ${dossier.numero_client || ''}) sont disponibles.`
    : `Votre resultat d'analyse (dossier ${dossier.numero_client || ''}) est disponible.`;
  const links = documents.map((doc, index) => (
    documents.length > 1 ? `Document ${index + 1} : ${doc.url}` : `Vous pouvez le consulter ici : ${doc.url}`
  ));
  const message = [
    `Bonjour ${dossier.patient_nom || ''},`,
    intro,
    ...links,
  ]
    .filter(Boolean)
    .join(' ');

  // Sans numero connu, on ouvre WhatsApp avec le message pre-rempli et on
  // laisse la secretaire choisir le contact du patient elle-meme (envoi
  // manuel). Si un numero est disponible, on va directement a la conversation.
  const base = telephone ? `https://wa.me/${telephone.replace('+', '')}` : 'https://wa.me/';

  return `${base}?text=${encodeURIComponent(message)}`;
}

export function printPdf(url) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.src = url;
  iframe.onload = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      window.open(url, '_blank');
    }
    setTimeout(() => document.body.removeChild(iframe), 60000);
  };
  document.body.appendChild(iframe);
}

export function printAllDocuments(dossier) {
  (dossier.documents || []).forEach((doc, index) => {
    setTimeout(() => printPdf(doc.url), index * 1200);
  });
}

export function downloadFileName(dossier, index = 0, total = 1) {
  const parts = [dossier.patient_nom, dossier.numero_client].filter(Boolean);
  const base = (parts.join('-') || 'resultat').replace(/\s+/g, '_');
  const suffix = total > 1 ? `_${index + 1}` : '';
  const ext = dossier.documents?.[index]?.type_mime === 'image/png' ? 'png'
    : dossier.documents?.[index]?.type_mime?.startsWith('image/') ? 'jpg'
    : 'pdf';
  return `${base}${suffix}.${ext}`;
}

export function downloadAllDocuments(dossier) {
  const documents = dossier.documents || [];
  documents.forEach((doc, index) => {
    const a = document.createElement('a');
    a.href = doc.url;
    a.download = downloadFileName(dossier, index, documents.length);
    a.click();
  });
}
