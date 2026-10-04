import jsPDF from 'jspdf';
import { getDevisNumero } from './devisUtils';
import { CATEGORY_ORDER } from './categoryUtils';

const MARGIN = 15;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const BLUE = [29, 95, 214];
const HEADER_BLUE = [29, 95, 214];

let logoDataUrl = null;
const logoReady = fetch('/NABY.jpg')
  .then((res) => res.blob())
  .then(
    (blob) =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          logoDataUrl = reader.result;
          resolve(logoDataUrl);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      })
  )
  .catch(() => null);

function addHeader(doc, y, titreDroite, sousTitreDroite) {
  let textX = MARGIN;

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'JPEG', MARGIN, y - 4, 16, 16);
      textX = MARGIN + 20;
    } catch {
      // ignore malformed image data
    }
  }

  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('CLINIQUE SOPE NABY', textX, y);
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.text('Tel : +221 33 836 29 79', textX, y + 5);
  doc.text('Email : cliniquenaby13@gmail.com', textX, y + 10);

  doc.setFontSize(13);
  doc.setFont(undefined, 'bold');
  doc.text(titreDroite, PAGE_WIDTH - MARGIN, y, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  const sousLignes = Array.isArray(sousTitreDroite) ? sousTitreDroite : sousTitreDroite ? [sousTitreDroite] : [];
  let ySous = y + 6;
  sousLignes.forEach((ligne) => {
    doc.text(ligne, PAGE_WIDTH - MARGIN, ySous, { align: 'right' });
    ySous += 5;
  });

  const yLigne = Math.max(y + 15, ySous + 2);
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(1);
  doc.line(MARGIN, yLigne, PAGE_WIDTH - MARGIN, yLigne);

  return yLigne + 7;
}

function formatPeriodeMois(mois) {
  if (!mois) return '';
  const [annee, moisNum] = mois.split('-').map(Number);
  const debut = new Date(annee, moisNum - 1, 1);
  const fin = new Date(annee, moisNum, 0);
  const fmt = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  return `${fmt(debut)} au ${fmt(fin)}`;
}

function addWatermark(doc) {
  doc.saveGraphicsState();
  doc.setTextColor(220, 53, 69);
  doc.setFontSize(60);
  doc.setFont(undefined, 'bold');
  doc.text('PROFORMA', PAGE_WIDTH / 2, PAGE_HEIGHT / 2, {
    align: 'center',
    angle: 35,
  });
  doc.restoreGraphicsState();
  doc.setTextColor(0, 0, 0);
}

function groupLignesParCategorie(lignes) {
  const groupes = {};
  lignes.forEach((l) => {
    const cat = l.categorie || 'autres';
    if (!groupes[cat]) groupes[cat] = [];
    groupes[cat].push(l);
  });
  const ordre = [...CATEGORY_ORDER.filter((c) => groupes[c]), ...Object.keys(groupes).filter((c) => !CATEGORY_ORDER.includes(c))];
  return ordre.map((cat) => ({ cat, lignes: groupes[cat] }));
}

function drawTableauPrestations(doc, y, lignes) {
  const colX = [MARGIN, MARGIN + 15, PAGE_WIDTH - MARGIN - 35];

  doc.setFillColor(...HEADER_BLUE);
  doc.setTextColor(255, 255, 255);
  doc.rect(MARGIN, y, PAGE_WIDTH - MARGIN * 2, 7, 'F');
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text('#', colX[0] + 2, y + 5);
  doc.text('Categorie / Prestation', colX[1], y + 5);
  doc.text('Prix (FCFA)', colX[2], y + 5);
  doc.setTextColor(0, 0, 0);
  y += 9;

  let compteur = 0;
  const groupes = groupLignesParCategorie(lignes);

  groupes.forEach(({ cat, lignes: catLignes }) => {
    if (y > PAGE_HEIGHT - 40) {
      doc.addPage();
      y = MARGIN;
    }
    doc.setFillColor(230, 238, 250);
    doc.rect(MARGIN, y, PAGE_WIDTH - MARGIN * 2, 6, 'F');
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...BLUE);
    doc.text(cat.toUpperCase(), colX[0] + 2, y + 4);
    doc.setTextColor(0, 0, 0);
    y += 8;

    doc.setFont(undefined, 'normal');
    catLignes.forEach((l) => {
      if (y > PAGE_HEIGHT - 40) {
        doc.addPage();
        y = MARGIN;
      }
      compteur += 1;
      const sousTotal = Math.round(l.prix * l.quantite);
      doc.text(String(compteur), colX[0] + 2, y + 4);
      const label = l.quantite > 1 ? `${l.nom}  x${l.quantite}` : l.nom;
      doc.text(label, colX[1], y + 4);
      doc.text(String(sousTotal), colX[2], y + 4);
      y += 6;
    });

    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 3;
  });

  return y;
}

export async function generatePDFDevis(devis, patient, entiteNom) {
  await logoReady;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  if (devis.isProforma) addWatermark(doc);

  let y = addHeader(
    doc,
    MARGIN + 4,
    `FACTURE N° ${getDevisNumero(devis)}`,
    devis.dateCreation ? new Date(devis.dateCreation).toLocaleDateString('fr-FR') : ''
  );

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Nom : ${devis.patientNom || ''}`, MARGIN, y);
  y += 5;
  if (devis.souscripteur) {
    doc.text(`Souscripteur : ${devis.souscripteur}`, MARGIN, y);
    y += 5;
  }
  doc.text(`Matricule : ${devis.patientMatricule || ''}`, MARGIN, y);
  y += 5;
  doc.text(`Prise en charge : ${patient?.typePriseEnCharge || ''} ${entiteNom ? '- ' + entiteNom : ''}`, MARGIN, y);
  y += 8;

  y = drawTableauPrestations(doc, y, devis.lignes);

  y += 4;
  doc.setFont(undefined, 'bold');
  doc.text(`TOTAL : ${Math.round(devis.total)} FCFA`, PAGE_WIDTH - MARGIN, y, { align: 'right' });
  y += 6;

  const taux = Number(devis.tauxCouverture) || 0;
  if (devis.tauxCouverture) {
    const montantAPayer = Math.round(devis.total * (taux / 100));
    const montantCouvert = Math.round(devis.total - montantAPayer);
    doc.setFont(undefined, 'normal');
    doc.text(`Part patients (${taux}%) : ${montantAPayer} FCFA`, PAGE_WIDTH - MARGIN, y, { align: 'right' });
    y += 6;
    doc.setFillColor(219, 234, 254);
    doc.rect(MARGIN, y - 4, PAGE_WIDTH - MARGIN * 2, 7, 'F');
    doc.setFont(undefined, 'bold');
    doc.text(`Montant a payer : ${montantAPayer} FCFA`, PAGE_WIDTH - MARGIN, y, { align: 'right' });
    y += 8;
    doc.setFont(undefined, 'normal');
    doc.text(`Montant couvert : ${montantCouvert} FCFA`, PAGE_WIDTH - MARGIN, y, { align: 'right' });
    y += 6;
  }

  doc.setFont(undefined, 'bold');
  doc.text('La comptabilite', PAGE_WIDTH / 2, PAGE_HEIGHT - 30, { align: 'center' });

  doc.save(`devis-${getDevisNumero(devis)}.pdf`);
}

export async function generatePDFDevisMensuel(rows, entiteNom, mois, typePriseEnCharge, numeroFacture) {
  await logoReady;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const typeLabel = typePriseEnCharge === 'IPM' ? 'IPM' : 'Assurance';
  let y = addHeader(doc, MARGIN + 4, `FACTURE MENSUELLE - ${(entiteNom || '').toUpperCase()}`, [
    `N° Facture : ${numeroFacture}`,
    `Periode : ${formatPeriodeMois(mois)}`,
    `Type : ${typeLabel}`,
    `Nombre de devis : ${rows.length}`,
  ]);
  y += 3;

  doc.setFillColor(...HEADER_BLUE);
  doc.setTextColor(255, 255, 255);
  doc.rect(MARGIN, y, PAGE_WIDTH - MARGIN * 2, 7, 'F');
  doc.setFont(undefined, 'bold');
  doc.setFontSize(9);
  doc.text('PARTICIPANT', MARGIN + 2, y + 5);
  doc.text('MATRICULE', MARGIN + 60, y + 5);
  doc.text('PATIENT', MARGIN + 95, y + 5);
  doc.text('MONTANT (FCFA)', PAGE_WIDTH - MARGIN - 5, y + 5, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  y += 9;

  doc.setFont(undefined, 'normal');
  let total = 0;
  rows.forEach((r) => {
    if (y > PAGE_HEIGHT - 30) {
      doc.addPage();
      y = MARGIN;
    }
    doc.text(String(r.participant).slice(0, 30), MARGIN + 2, y + 4);
    doc.text(String(r.matricule), MARGIN + 60, y + 4);
    doc.text(String(r.patientNom).slice(0, 25), MARGIN + 95, y + 4);
    doc.text(String(Math.round(r.montant)), PAGE_WIDTH - MARGIN - 5, y + 4, { align: 'right' });
    total += r.montant;
    y += 6;
  });

  y += 4;
  doc.setFont(undefined, 'bold');
  doc.text(`TOTAL GENERAL : ${Math.round(total)} FCFA`, PAGE_WIDTH - MARGIN, y, { align: 'right' });

  doc.text('La comptabilite', PAGE_WIDTH / 2, PAGE_HEIGHT - 20, { align: 'center' });

  doc.save(`devis-mensuel-${mois}.pdf`);
}

const STATUT_PAIEMENT_LABELS = {
  NON_REGLE: 'Non regle',
  PARTIELLEMENT_REGLE: 'Partiellement regle',
  REGLE: 'Regle',
};

// Montant avec separateur de milliers (espace simple : jsPDF n'affiche pas l'espace insecable de toLocaleString).
const formatMontantPDF = (valeur) => String(Math.round(Number(valeur) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export async function generatePDFListeFactures(factures, mois, annee, statistiques, titre = 'Factures', colonneEntite = 'IPM / Assurance') {
  await logoReady;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const largeur = PAGE_WIDTH - MARGIN * 2;

  const periodeLabel = mois ? `Periode : ${String(mois).padStart(2, '0')}/${annee}` : `Periode : annee ${annee}`;
  const dateEdition = `Edite le ${new Date().toLocaleDateString('fr-FR')}`;
  // Titre court a droite de l'en-tete pour ne pas chevaucher le nom de la clinique.
  let y = addHeader(doc, MARGIN + 4, 'SUIVI DES FACTURES', [periodeLabel, dateEdition]);

  // Bandeau titre (peut etre long : nom de l'IPM / assurance), coupe sur plusieurs lignes si besoin.
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  const lignesTitre = doc.splitTextToSize(String(titre).toUpperCase(), largeur - 8);
  const hauteurTitre = lignesTitre.length * 5.5 + 4;
  doc.setFillColor(235, 241, 252);
  doc.rect(MARGIN, y - 2, largeur, hauteurTitre, 'F');
  doc.setTextColor(...BLUE);
  doc.text(lignesTitre, PAGE_WIDTH / 2, y + 3.5, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  y += hauteurTitre + 4;

  // Resume : 4 cases
  const cases = [
    { label: 'Non regles', valeur: String(statistiques.nonRegles ?? 0), couleur: [220, 53, 69] },
    { label: 'Partiellement regles', valeur: String(statistiques.partiellementRegles ?? 0), couleur: [230, 150, 0] },
    { label: 'Regles', valeur: String(statistiques.regles ?? 0), couleur: [25, 135, 84] },
    { label: 'Montant total', valeur: `${formatMontantPDF(statistiques.montantTotal)} FCFA`, couleur: BLUE },
  ];
  const ecart = 3;
  const largeurCase = (largeur - ecart * (cases.length - 1)) / cases.length;
  cases.forEach((c, i) => {
    const x = MARGIN + i * (largeurCase + ecart);
    doc.setDrawColor(...c.couleur);
    doc.setLineWidth(0.4);
    doc.rect(x, y, largeurCase, 14);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(c.label, x + 3, y + 5);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...c.couleur);
    doc.text(c.valeur, x + 3, y + 11);
  });
  doc.setTextColor(0, 0, 0);
  y += 20;

  // Tableau
  const col = {
    num: MARGIN + 2,
    facture: MARGIN + 11,
    entite: MARGIN + 52,
    montant: MARGIN + 132,
    statut: PAGE_WIDTH - MARGIN - 2,
  };
  const enteteTableau = () => {
    doc.setFillColor(...HEADER_BLUE);
    doc.rect(MARGIN, y, largeur, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.text('N°', col.num, y + 5);
    doc.text('Numero facture', col.facture, y + 5);
    doc.text(colonneEntite, col.entite, y + 5);
    doc.text('Montant (FCFA)', col.montant, y + 5, { align: 'right' });
    doc.text('Statut', col.statut, y + 5, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    y += 7;
  };
  enteteTableau();

  let total = 0;
  doc.setFontSize(9);
  factures.forEach((f, idx) => {
    if (y > PAGE_HEIGHT - 30) {
      doc.addPage();
      y = MARGIN + 5;
      enteteTableau();
      doc.setFontSize(9);
    }
    if (idx % 2 === 1) {
      doc.setFillColor(245, 247, 250);
      doc.rect(MARGIN, y, largeur, 7, 'F');
    }
    const montant = Number(f.montantCouvert) || 0;
    const nom = doc.splitTextToSize(String(f.entiteNom ?? ''), col.montant - col.entite - 32)[0] ?? '';
    doc.text(String(idx + 1), col.num, y + 5);
    doc.text(String(f.numeroFacture ?? ''), col.facture, y + 5);
    doc.text(nom, col.entite, y + 5);
    doc.text(formatMontantPDF(montant), col.montant, y + 5, { align: 'right' });
    doc.text(STATUT_PAIEMENT_LABELS[f.statutPaiement] ?? 'Non regle', col.statut, y + 5, { align: 'right' });
    doc.setDrawColor(225, 225, 225);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y + 7, PAGE_WIDTH - MARGIN, y + 7);
    total += montant;
    y += 7;
  });

  if (factures.length === 0) {
    doc.setTextColor(120, 120, 120);
    doc.text('Aucune facture.', PAGE_WIDTH / 2, y + 6, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    y += 8;
  }

  // Total
  y += 3;
  doc.setFillColor(235, 241, 252);
  doc.rect(MARGIN, y, largeur, 8, 'F');
  doc.setFont(undefined, 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL GENERAL', col.facture, y + 5.5);
  doc.text(`${formatMontantPDF(total)} FCFA`, col.montant, y + 5.5, { align: 'right' });

  // Pied de page sur chaque page
  const nbPages = doc.getNumberOfPages();
  for (let i = 1; i <= nbPages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('Genere par CLINIQUE SOPE NABY', MARGIN, PAGE_HEIGHT - 10);
    doc.text(`Page ${i} / ${nbPages}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 10, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }

  const slug = String(titre).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  doc.save(`suivi-${slug}-${annee}${mois ? `-${String(mois).padStart(2, '0')}` : ''}.pdf`);
}

const TYPE_LABELS_PDF = { IPM: 'IPM', ASSURANCE: 'Assurance', CAISSE: 'Caisse' };

// Tracabilite des medicaments : resume, quantites par jour, par medicament, puis detail des ventes.
export async function generatePDFSuiviMedicaments(data, filtres = {}) {
  await logoReady;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const largeur = PAGE_WIDTH - MARGIN * 2;
  const jj = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '-');

  const sousTitres = [`Du ${jj(data.periode.debut)} au ${jj(data.periode.fin)}`];
  if (filtres.nomMedicament) sousTitres.push(`Medicament : ${filtres.nomMedicament}`.slice(0, 45));
  if (filtres.type) sousTitres.push(`Prise en charge : ${filtres.type}`);
  let y = addHeader(doc, MARGIN + 4, 'SUIVI DES MEDICAMENTS', sousTitres);

  const r = data.resume;
  const cases = [
    ['Quantite vendue', String(r.quantiteTotale)],
    ['Montant total', `${formatMontantPDF(r.montantTotal)} FCFA`],
    ['Medicaments', String(r.nbMedicaments)],
    ['Devis', String(r.nbDevis)],
  ];
  const lc = (largeur - 9) / 4;
  cases.forEach(([label, valeur], i) => {
    const x = MARGIN + i * (lc + 3);
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.4);
    doc.rect(x, y, lc, 13);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(label, x + 3, y + 5);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...BLUE);
    doc.text(valeur, x + 3, y + 10.5);
  });
  doc.setTextColor(0, 0, 0);
  y += 19;

  // colonnes : [titre, x, alignement]
  const tableau = (titre, colonnes, lignes) => {
    if (y > PAGE_HEIGHT - 40) {
      doc.addPage();
      y = MARGIN + 5;
    }
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...BLUE);
    doc.text(titre, MARGIN, y);
    doc.setTextColor(0, 0, 0);
    y += 3;
    const entete = () => {
      doc.setFillColor(...HEADER_BLUE);
      doc.rect(MARGIN, y, largeur, 6.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(8);
      colonnes.forEach(([t, x, align]) => doc.text(t, x, y + 4.5, align ? { align } : undefined));
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      y += 6.5;
    };
    entete();
    lignes.forEach((ligne, idx) => {
      if (y > PAGE_HEIGHT - 22) {
        doc.addPage();
        y = MARGIN + 5;
        entete();
      }
      if (idx % 2 === 1) {
        doc.setFillColor(245, 247, 250);
        doc.rect(MARGIN, y, largeur, 6, 'F');
      }
      doc.setFontSize(8);
      colonnes.forEach(([, x, align, maxLargeur], i) => {
        let texte = String(ligne[i] ?? '');
        if (maxLargeur) texte = doc.splitTextToSize(texte, maxLargeur)[0] ?? '';
        doc.text(texte, x, y + 4.2, align ? { align } : undefined);
      });
      y += 6;
    });
    if (lignes.length === 0) {
      doc.setTextColor(120, 120, 120);
      doc.text('Aucune vente.', MARGIN + 2, y + 4.5);
      doc.setTextColor(0, 0, 0);
      y += 6;
    }
    y += 6;
  };

  const D = PAGE_WIDTH - MARGIN - 2;
  tableau(
    'Ventes par jour',
    [['Date', MARGIN + 2], ['Quantite', MARGIN + 80, 'right'], ['Medicaments', MARGIN + 115, 'right'], ['Devis', MARGIN + 140, 'right'], ['Montant (FCFA)', D, 'right']],
    data.parJour.map((j) => [jj(j.jour), j.quantite, j.nbMedicaments, j.nbDevis, formatMontantPDF(j.montant)])
  );

  tableau(
    'Ventes par medicament',
    [['Medicament', MARGIN + 2, null, 85], ['Quantite', MARGIN + 110, 'right'], ['Jours', MARGIN + 128, 'right'], ['Devis', MARGIN + 145, 'right'], ['Montant (FCFA)', D, 'right']],
    data.parMedicament.map((m) => [m.medicament, m.quantite, m.nbJours, m.nbDevis, formatMontantPDF(m.montant)])
  );

  tableau(
    'Detail des ventes',
    [
      ['Date', MARGIN + 1],
      ['N° devis', MARGIN + 17],
      ['Medicament', MARGIN + 37, null, 48],
      ['Qte', MARGIN + 94, 'right'],
      ['Montant', MARGIN + 113, 'right'],
      ['Patient', MARGIN + 117, null, 37],
      ['Prise en charge', MARGIN + 156, null, 23],
    ],
    data.details.map((d) => [
      jj(d.date),
      d.devisNumero,
      d.medicament,
      d.quantite,
      formatMontantPDF(d.montant),
      d.patientNom || '-',
      d.typePriseEnCharge === 'CAISSE' ? 'Caisse' : d.entiteNom || TYPE_LABELS_PDF[d.typePriseEnCharge] || '-',
    ])
  );

  const nbPages = doc.getNumberOfPages();
  for (let i = 1; i <= nbPages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('Genere par CLINIQUE SOPE NABY', MARGIN, PAGE_HEIGHT - 10);
    doc.text(`Page ${i} / ${nbPages}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 10, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }

  doc.save(`suivi-medicaments-${data.periode.debut}-au-${data.periode.fin}.pdf`);
}

export async function generatePDFCatalogue(items, tarifs, categorie) {
  await logoReady;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const dateStr = new Date().toLocaleDateString('fr-FR');
  const titre = categorie.charAt(0).toUpperCase() + categorie.slice(1);
  let y = addHeader(doc, MARGIN + 4, `CATALOGUE : ${titre.toUpperCase()}`, `Edite le ${dateStr}`);

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Total : ${items.length} article(s)`, MARGIN, y);
  doc.setTextColor(0, 0, 0);
  y += 8;

  // En-tete du tableau
  const colNom = MARGIN + 12;
  const colPrix = PAGE_WIDTH - MARGIN - 5;
  doc.setFillColor(...HEADER_BLUE);
  doc.setTextColor(255, 255, 255);
  doc.rect(MARGIN, y, PAGE_WIDTH - MARGIN * 2, 7, 'F');
  doc.setFont(undefined, 'bold');
  doc.setFontSize(9);
  doc.text('#', MARGIN + 2, y + 5);
  doc.text('Designation', colNom, y + 5);
  doc.text('Prix (FCFA)', colPrix, y + 5, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  y += 9;

  doc.setFont(undefined, 'normal');
  items.forEach((item, idx) => {
    if (y > PAGE_HEIGHT - 25) {
      doc.addPage();
      y = MARGIN + 4;
    }
    const tarifItem = (tarifs || []).find(
      (t) => t.analyseId === item.id && !t.ipmId && !t.assuranceId && t.typePriseEnCharge !== 'CAISSE'
    );
    const prix = tarifItem ? Math.round(Number(tarifItem.prix)) : 0;

    if (idx % 2 === 0) {
      doc.setFillColor(245, 247, 250);
      doc.rect(MARGIN, y - 1, PAGE_WIDTH - MARGIN * 2, 6.5, 'F');
    }
    doc.setFontSize(9);
    doc.text(String(idx + 1), MARGIN + 2, y + 4);
    doc.text(item.nom, colNom, y + 4, { maxWidth: PAGE_WIDTH - MARGIN * 2 - 50 });
    doc.text(prix > 0 ? String(prix) : '-', colPrix, y + 4, { align: 'right' });
    y += 6.5;
  });

  y += 3;
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);

  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('Genere par CLINIQUE SOPE NABY', MARGIN, PAGE_HEIGHT - 10);
  doc.text(`Page 1`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 10, { align: 'right' });

  doc.save(`catalogue-${categorie}-${dateStr.replace(/\//g, '-')}.pdf`);
}
