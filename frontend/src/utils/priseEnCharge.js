// Types de prise en charge d'un patient : IPM, Assurance ou Caisse.
// listKey : liste correspondante dans useData() ; idKey : champ id sur le patient / tarif converti.
export const TYPES_PRISE_EN_CHARGE = [
  { value: 'IPM', label: 'IPM', pluriel: 'IPM', listKey: 'ipms', idKey: 'ipmId' },
  { value: 'ASSURANCE', label: 'Assurance', pluriel: 'Assurances', listKey: 'assurances', idKey: 'assuranceId' },
  { value: 'CAISSE', label: 'Caisse', pluriel: 'Caisses', listKey: 'caisses', idKey: 'caisseId' },
];

export function getTypePriseEnCharge(value) {
  return TYPES_PRISE_EN_CHARGE.find((t) => t.value === value) ?? TYPES_PRISE_EN_CHARGE[0];
}

// Nom de l'IPM / assurance / caisse d'un patient converti (convertPatientFromAPI).
export function getEntiteNom(patient, listes) {
  if (!patient) return undefined;
  const type = getTypePriseEnCharge(patient.typePriseEnCharge);
  return (listes[type.listKey] || []).find((e) => e.id === patient[type.idKey])?.nom;
}
