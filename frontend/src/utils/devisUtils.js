export function getDevisNumero(devis) {
  if (!devis) return '';
  if (devis.numero && String(devis.numero).includes('-')) {
    return devis.numero;
  }
  if (devis.numero && !isNaN(devis.numero)) {
    const annee = new Date().getFullYear();
    return `${annee}-${String(devis.numero).padStart(5, '0')}`;
  }
  return devis.id ? String(devis.id).slice(-6) : '';
}

export function formatMontant(value) {
  const num = Number(value) || 0;
  return num.toLocaleString('fr-FR');
}
