// Architecture multi-modules : chaque module regroupe ses propres menus.
// Le contenu de la sidebar depend de l'espace connecte (Facturation ou
// Laboratoire) et, pour le Laboratoire, du role de l'utilisateur.

const FACTURATION_MODULE = {
  key: 'facturation',
  label: 'Facturation',
  icon: 'bi-receipt-cutoff',
  color: 'grad-primary',
  // Rangement par metier, dans l'ordre de la journee d'une secretaire ;
  // les reglages (Parametres) sont en bas et replies par defaut.
  sections: [
    {
      title: 'Accueil',
      items: [
        { to: '/rendez-vous', label: 'Agenda des rendez-vous', icon: 'bi-calendar3', end: true },
        { to: '/rendez-vous/nouveau', label: 'Nouveau rendez-vous', icon: 'bi-calendar-plus' },
      ],
    },
    {
      title: 'Patients & devis',
      items: [
        { to: '/patients', label: 'Patients', icon: 'bi-people' },
        { to: '/devis', label: 'Nouveau devis', icon: 'bi-file-earmark-text', end: true },
        { to: '/historique', label: 'Historique des devis', icon: 'bi-clock-history' },
        { to: '/devis/proforma', label: 'Devis proforma', icon: 'bi-file-earmark-plus' },
      ],
    },
    {
      title: 'Prise en charge',
      items: [
        { to: '/ipm', label: 'IPM', icon: 'bi-building' },
        { to: '/assurances', label: 'Assurances', icon: 'bi-shield-check' },
        { to: '/caisse', label: 'Caisse (tarifs)', icon: 'bi-cash-coin' },
        { to: '/devis/mensuel', label: 'Factures mensuelles', icon: 'bi-calendar-month', adminOnly: true },
      ],
    },
    {
      title: 'Pharmacie',
      items: [
        { to: '/medicaments/stock', label: 'Stock medicaments', icon: 'bi-box-seam', adminOnly: true },
        { to: '/medicaments/suivi', label: 'Suivi medicaments', icon: 'bi-capsule', adminOnly: true },
      ],
    },
    {
      title: 'Rapports',
      items: [
        { to: '/rapport-activite', label: "Rapport d'activite", icon: 'bi-person-lines-fill' },
        { to: '/detail-prestation', label: 'Detail de prestation', icon: 'bi-calendar-check', adminOnly: true },
        { to: '/statistiques', label: 'Statistiques', icon: 'bi-bar-chart', adminOnly: true },
      ],
    },
    {
      title: 'Parametres',
      collapsedByDefault: true,
      items: [
        { to: '/categories', label: 'Categories', icon: 'bi-tags', adminOnly: true },
        { type: 'database-dropdown', label: 'Base de donnees', icon: 'bi-database' },
        { to: '/rendez-vous/specialites', label: 'Specialites (rendez-vous)', icon: 'bi-hospital', adminOnly: true },
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
