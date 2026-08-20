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

export async function generatePDFListeFactures(factures, mois, annee, statistiques) {
  await logoReady;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  let y = addHeader(doc, MARGIN + 4, 'SUIVI DES FACTURES MENSUELLES', `${mois}/${annee}`);

  doc.setFontSize(9);
  doc.text(
    `Non regles : ${statistiques.nonRegles}   Partiellement regles : ${statistiques.partiellementRegles}   Regles : ${statistiques.regles}`,
    MARGIN,
    y
  );
  y += 5;
  doc.text(`Montant total : ${Math.round(statistiques.montantTotal)} FCFA`, MARGIN, y);
  y += 8;

  doc.setFillColor(...HEADER_BLUE);
  doc.setTextColor(255, 255, 255);
  doc.rect(MARGIN, y, PAGE_WIDTH - MARGIN * 2, 7, 'F');
  doc.setFont(undefined, 'bold');
  doc.setFontSize(9);
  doc.text('N°', MARGIN + 2, y + 5);
  doc.text('Numero facture', MARGIN + 15, y + 5);
  doc.text('IPM / Assurance', MARGIN + 60, y + 5);
  doc.text('Montant (FCFA)', MARGIN + 120, y + 5);
  doc.text('Statut', PAGE_WIDTH - MARGIN - 5, y + 5, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  y += 9;

  doc.setFont(undefined, 'normal');
  let total = 0;
  factures.forEach((f, idx) => {
    if (y > PAGE_HEIGHT - 30) {
      doc.addPage();
      y = MARGIN;
    }
    doc.text(String(idx + 1), MARGIN + 2, y + 4);
    doc.text(f.numeroFacture, MARGIN + 15, y + 4);
    doc.text(String(f.entiteNom).slice(0, 25), MARGIN + 60, y + 4);
    doc.text(String(Math.round(f.montantCouvert)), MARGIN + 120, y + 4);
    doc.text(f.statutPaiement, PAGE_WIDTH - MARGIN - 5, y + 4, { align: 'right' });
    total += f.montantCouvert;
    y += 6;
  });

  y += 4;
  doc.setFont(undefined, 'bold');
  doc.text(`TOTAL GENERAL : ${Math.round(total)} FCFA`, PAGE_WIDTH - MARGIN, y, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.text('Genere par CLINIQUE SOPE NABY', MARGIN, PAGE_HEIGHT - 10);

  doc.save(`suivi-factures-${annee}-${String(mois).padStart(2, '0')}.pdf`);
}
