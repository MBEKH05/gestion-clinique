export function convertPatientFromAPI(patient) {
  if (!patient) return patient;
  return {
    id: patient.id,
    nomComplet: patient.nom_complet,
    matricule: patient.matricule,
    typePriseEnCharge: patient.type_prise_en_charge,
    ipmId: patient.ipm || '',
    assuranceId: patient.assurance || '',
    createdAt: patient.created_at,
  };
}

export function convertPatientToAPI(patient) {
  return {
    id: patient.id,
    nom_complet: patient.nomComplet,
    matricule: patient.matricule,
    type_prise_en_charge: patient.typePriseEnCharge,
    ipm: patient.ipmId || null,
    assurance: patient.assuranceId || null,
  };
}

export function convertDevisLigneFromAPI(ligne) {
  return {
    id: ligne.id,
    analyseId: ligne.analyseId,
    nom: ligne.analyse_nom,
    categorie: ligne.analyse_categorie,
    prix: Number(ligne.prix),
    quantite: Number(ligne.quantite) || 1,
  };
}

export function convertDevisFromAPI(devis) {
  if (!devis) return devis;
  return {
    id: devis.id,
    numero: devis.numero,
    patientId: devis.patient,
    patientNom: devis.patient_nom,
    patientMatricule: devis.patient_matricule,
    total: Number(devis.total),
    souscripteur: devis.souscripteur,
    tauxCouverture: devis.taux_couverture,
    dateCreation: devis.date_creation,
    lignes: (devis.lignes || []).map(convertDevisLigneFromAPI),
    statutPaiement: devis.statut_paiement,
    datePaiement: devis.date_paiement,
    commentairePaiement: devis.commentaire_paiement,
    isProforma: !!devis.is_proforma,
  };
}

export function convertDevisToAPI(devis) {
  return {
    patient: devis.patientId,
    souscripteur: devis.souscripteur || null,
    taux_couverture: devis.tauxCouverture != null ? String(devis.tauxCouverture) : null,
    is_proforma: !!devis.isProforma,
    lignes: (devis.lignes || []).map((l) => ({
      analyseId: l.analyseId,
      prix: l.prix,
      quantite: l.quantite || 1,
    })),
  };
}

export function convertTarifFromAPI(tarif) {
  return {
    id: tarif.id,
    analyseId: tarif.analyse,
    typePriseEnCharge: tarif.type_prise_en_charge,
    ipmId: tarif.ipm || '',
    assuranceId: tarif.assurance || '',
    prix: Number(tarif.prix),
  };
}

export function convertTarifToAPI(tarif) {
  if (tarif.typePriseEnCharge) {
    return {
      analyse: tarif.analyseId,
      type_prise_en_charge: tarif.typePriseEnCharge,
      ipm: null,
      assurance: null,
      prix: tarif.prix,
    };
  }
  return {
    analyse: tarif.analyseId,
    type_prise_en_charge: null,
    ipm: tarif.ipmId || null,
    assurance: tarif.assuranceId || null,
    prix: tarif.prix,
  };
}
