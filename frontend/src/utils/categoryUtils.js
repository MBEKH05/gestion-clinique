export function getCategoryName(categorie) {
  if (!categorie) return '';
  if (typeof categorie === 'string') return categorie;
  return categorie.nom || '';
}

export function isCategoryActive(categorie) {
  if (!categorie) return true;
  if (typeof categorie === 'string') return true;
  return categorie.actif !== false;
}

export function formatCategoryObject(categorie) {
  const nom = getCategoryName(categorie);
  const actif = isCategoryActive(categorie);
  return `${nom} (${actif ? 'Actif' : 'Inactif'})`;
}

export function formatCategoriesList(categories) {
  return (categories || []).map(formatCategoryObject);
}

export const CATEGORY_ICONS = {
  analyses: 'bi-clipboard-pulse',
  radiographie: 'bi-camera',
  hospitalisation: 'bi-hospital',
  maternite: 'bi-heart-pulse',
  consultations: 'bi-person-check',
  medicament: 'bi-capsule',
  autres: 'bi-tag',
};

export function getCategoryIcon(nom) {
  return CATEGORY_ICONS[nom] || 'bi-tag';
}

export const CATEGORY_ORDER = [
  'analyses',
  'radiographie',
  'hospitalisation',
  'maternite',
  'consultations',
  'medicament',
  'autres',
];
