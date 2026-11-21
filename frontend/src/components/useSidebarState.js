import { useCallback, useEffect, useState } from 'react';

// Etat du menu de gauche, memorise sur ce poste :
// - `collapsed` : menu reduit a ses icones (par defaut sur les ecrans de moins de 1200 px) ;
// - sections repliees, par espace (facturation, laboratoire, administration).
const CLE_REDUIT = 'sidebar_collapsed';
const REQUETE_MOBILE = '(max-width: 991.98px)';

const lire = (cle) => {
  try {
    return localStorage.getItem(cle);
  } catch {
    return null;
  }
};

const ecrire = (cle, valeur) => {
  try {
    localStorage.setItem(cle, valeur);
  } catch {
    // stockage indisponible (navigation privee...) : l'etat reste en memoire
  }
};

export function useSidebarState(espace, sections = []) {
  const cleSections = `sidebar_sections_${espace}`;

  const [collapsed, setCollapsed] = useState(() => {
    const memorise = lire(CLE_REDUIT);
    if (memorise !== null) return memorise === '1';
    return typeof window !== 'undefined' && window.innerWidth < 1200;
  });

  const [fermees, setFermees] = useState(() => {
    const memorise = lire(cleSections);
    if (memorise !== null) {
      try {
        return new Set(JSON.parse(memorise));
      } catch {
        // valeur illisible : on repart des valeurs par defaut
      }
    }
    return new Set(sections.filter((s) => s.collapsedByDefault).map((s) => s.title));
  });

  useEffect(() => ecrire(cleSections, JSON.stringify([...fermees])), [cleSections, fermees]);

  // Sur telephone (< 992 px), le menu est un tiroir : toujours affiche en entier.
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia(REQUETE_MOBILE).matches);
  useEffect(() => {
    const mq = window.matchMedia(REQUETE_MOBILE);
    const maj = () => setMobile(mq.matches);
    mq.addEventListener('change', maj);
    return () => mq.removeEventListener('change', maj);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      ecrire(CLE_REDUIT, c ? '0' : '1');
      return !c;
    });
  }, []);

  const expand = useCallback(() => {
    ecrire(CLE_REDUIT, '0');
    setCollapsed(false);
  }, []);

  const toggleSection = useCallback((titre) => {
    setFermees((prev) => {
      const next = new Set(prev);
      if (next.has(titre)) next.delete(titre);
      else next.add(titre);
      return next;
    });
  }, []);

  // Une section contenant la page en cours est toujours ouverte.
  const isSectionOpen = useCallback((titre, contientPageCourante) => contientPageCourante || !fermees.has(titre), [fermees]);

  return { collapsed: collapsed && !mobile, toggleCollapsed, expand, isSectionOpen, toggleSection };
}

// La page en cours appartient-elle a cet element du menu ?
export function itemActif(item, pathname) {
  if (item.type === 'database-dropdown') {
    return pathname.startsWith('/base-de-donnees') || pathname.startsWith('/analyses');
  }
  if (!item.to) return false;
  return item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`);
}
