// Outils du module Rendez-vous : statuts, dates et messages WhatsApp.

export const CLINIQUE = {
  nom: 'Clinique Sope Naby',
  telephone: '+221 33 836 29 79',
};

export const STATUTS_RDV = {
  PREVU: { label: 'Prevu', className: 'bg-secondary' },
  CONFIRME: { label: 'Confirme', className: 'bg-primary' },
  VENU: { label: 'Venu', className: 'bg-success' },
  ABSENT: { label: 'Absent', className: 'bg-warning text-dark' },
  ANNULE: { label: 'Annule', className: 'bg-danger' },
};

export const JOURS_SEMAINE = [
  { num: 1, court: 'Lun', long: 'Lundi' },
  { num: 2, court: 'Mar', long: 'Mardi' },
  { num: 3, court: 'Mer', long: 'Mercredi' },
  { num: 4, court: 'Jeu', long: 'Jeudi' },
  { num: 5, court: 'Ven', long: 'Vendredi' },
  { num: 6, court: 'Sam', long: 'Samedi' },
  { num: 7, court: 'Dim', long: 'Dimanche' },
];

// Date locale au format AAAA-MM-JJ (sans decalage UTC).
export function dateISO(d = new Date()) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export function ajouterJours(iso, n) {
  const [a, m, j] = iso.split('-').map(Number);
  return dateISO(new Date(a, m - 1, j + n));
}

// "lundi 23 novembre 2026"
export function dateLongue(iso) {
  const [a, m, j] = iso.split('-').map(Number);
  return new Date(a, m - 1, j).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function dateCourte(iso) {
  return iso ? iso.split('-').reverse().join('/') : '-';
}

// Numero au format international pour wa.me : +221 ajoute si le numero
// senegalais est donne sans indicatif (9 chiffres).
export function numeroWhatsApp(telephone) {
  let n = String(telephone || '').replace(/[^\d+]/g, '');
  if (!n) return '';
  if (n.startsWith('+')) return n.slice(1);
  if (n.startsWith('00')) return n.slice(2);
  if (n.length === 9) return `221${n}`;
  return n;
}

const MODELES = {
  confirmation: (r) =>
    `Bonjour ${r.patientNom},\n\nVotre rendez-vous en ${r.specialite} a la ${CLINIQUE.nom} est confirme pour le ${dateLongue(r.date)} a ${r.heure}.\n\nMerci de vous presenter 15 minutes avant l'heure. En cas d'empechement, prevenez-nous au ${CLINIQUE.telephone}.`,
  rappel: (r) =>
    `Bonjour ${r.patientNom},\n\nNous vous rappelons votre rendez-vous en ${r.specialite} a la ${CLINIQUE.nom} le ${dateLongue(r.date)} a ${r.heure}.\n\nEn cas d'empechement, merci de nous prevenir au ${CLINIQUE.telephone}.`,
  annulation: (r) =>
    `Bonjour ${r.patientNom},\n\nVotre rendez-vous en ${r.specialite} du ${dateLongue(r.date)} a ${r.heure} a la ${CLINIQUE.nom} est annule.\n\nPour fixer un nouveau rendez-vous, contactez-nous au ${CLINIQUE.telephone}.`,
};

export const TYPES_MESSAGE = [
  { key: 'confirmation', label: 'Confirmation', icon: 'bi-check2-circle' },
  { key: 'rappel', label: 'Rappel', icon: 'bi-alarm' },
  { key: 'annulation', label: 'Annulation', icon: 'bi-x-circle' },
];

export function messageWhatsApp(type, rdv) {
  return (MODELES[type] || MODELES.confirmation)(rdv);
}

export function lienWhatsApp(type, rdv) {
  const numero = numeroWhatsApp(rdv.telephone);
  const texte = encodeURIComponent(messageWhatsApp(type, rdv));
  return numero ? `https://wa.me/${numero}?text=${texte}` : `https://wa.me/?text=${texte}`;
}
