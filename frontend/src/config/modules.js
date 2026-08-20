// Architecture multi-modules : chaque module regroupe ses propres menus.
// Le contenu de la sidebar depend de l'espace connecte (Facturation ou
// Laboratoire) et, pour le Laboratoire, du role de l'utilisateur.

const FACTURATION_MODULE = {
  key: 'facturation',
  label: 'Facturation',
  icon: 'bi-receipt-cutoff',
  color: 'grad-primary',
  sections: [
    {
      title: 'Gestion',
      items: [
        { to: '/categories', label: 'Categories', icon: 'bi-tags', adminOnly: true },
        { type: 'database-dropdown', label: 'Base de donnees', icon: 'bi-database' },
        { to: '/ipm', label: 'IPM', icon: 'bi-building' },
        { to: '/assurances', label: 'Assurances', icon: 'bi-shield-check' },
        { to: '/patients', label: 'Patients', icon: 'bi-people' },
      ],
    },
    {
      title: 'Operations',
      items: [
        { to: '/devis', label: 'Devis', icon: 'bi-file-earmark-text', end: true },
        { to: '/historique', label: 'Historique', icon: 'bi-clock-history' },
        { to: '/devis/proforma', label: 'Demande Devis', icon: 'bi-file-earmark-plus' },
        { to: '/devis/mensuel', label: 'Factures Mensuelles', icon: 'bi-calendar-month' },
        { to: '/detail-prestation', label: 'Detail de prestation', icon: 'bi-calendar-check', adminOnly: true },
        { to: '/statistiques', label: 'Statistiques', icon: 'bi-bar-chart', adminOnly: true },
      ],
    },
  ],
};

function laboratoireModule(role) {
  if (role === 'administrateur') {
    return {
      key: 'laboratoire',
      label: 'Laboratoire',
      icon: 'bi-droplet-half',
      color: 'grad-emerald',
      sections: [
        {
          title: 'Supervision',
          items: [{ to: '/lab/admin', label: 'Tableau de bord', icon: 'bi-speedometer2', end: true }],
        },
      ],
    };
  }

  const sections = [];

  if (role === 'technicien') {
    sections.push({
      title: 'Dossiers',
      items: [
        { to: '/lab/technicien', label: 'Mes dossiers', icon: 'bi-folder2-open', end: true },
        { to: '/lab/liste-dossiers', label: 'Liste des dossiers', icon: 'bi-list-ul' },
        { to: '/lab/hospitalisation', label: 'Hospitalisation', icon: 'bi-hospital' },
      ],
    });
  }

  if (role === 'medecin') {
    sections.push({
      title: 'Dossiers',
      items: [
        { to: '/lab/medecin', label: 'Dossiers a valider', icon: 'bi-clipboard2-check', end: true },
        { to: '/lab/liste-dossiers', label: 'Liste des dossiers', icon: 'bi-list-ul' },
      ],
    });
  }

  if (role === 'secretaire') {
    sections.push({
      title: 'Dossiers',
      items: [
        { to: '/lab/secretaire', label: 'Dossiers a imprimer', icon: 'bi-printer', end: true },
        { to: '/lab/liste-dossiers', label: 'Liste des dossiers', icon: 'bi-list-ul' },
      ],
    });
  }

  return {
    key: 'laboratoire',
    label: 'Laboratoire',
    icon: 'bi-droplet-half',
    color: 'grad-emerald',
    sections,
  };
}

const ADMINISTRATION_MODULE = {
  key: 'administration',
  label: 'Administration',
  icon: 'bi-shield-lock',
  color: 'grad-primary',
  sections: [
    {
      title: 'Vue d\'ensemble',
      items: [{ to: '/admin', label: 'Tableau de bord', icon: 'bi-speedometer2', end: true }],
    },
    {
      title: 'Comptes',
      items: [
        { to: '/admin/comptes-facturation', label: 'Comptes Facturation', icon: 'bi-receipt-cutoff' },
        { to: '/admin/comptes-labo', label: 'Comptes Laboratoire', icon: 'bi-droplet-half' },
      ],
    },
    {
      title: 'Laboratoire',
      items: [{ to: '/admin/dossiers-labo', label: 'Dossiers', icon: 'bi-folder2-open' }],
    },
  ],
};

export function getModules({ space, role } = {}) {
  if (space === 'laboratoire') {
    return [laboratoireModule(role)];
  }

  if (space === 'administration') {
    return [ADMINISTRATION_MODULE];
  }

  return [FACTURATION_MODULE];
}
