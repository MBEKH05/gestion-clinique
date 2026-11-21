import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { getCategoryName, getCategoryIcon, CATEGORY_ORDER } from '../utils/categoryUtils';
import { getModules } from '../config/modules';
import { itemActif, useSidebarState } from './useSidebarState';

export default function Layout() {
  const { user, isSuperAdmin, logout } = useAuth();
  const { categories } = useData();
  const location = useLocation();
  const navigate = useNavigate();

  const modules = getModules({ space: 'facturation' });
  // Sections visibles pour ce compte (une section dont tous les liens sont reserves a l'admin disparait).
  const sections = useMemo(
    () =>
      modules
        .flatMap((m) => m.sections)
        .map((s) => ({ ...s, items: s.items.filter((i) => !i.adminOnly || isSuperAdmin) }))
        .filter((s) => s.items.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isSuperAdmin]
  );

  const { collapsed, toggleCollapsed, expand, isSectionOpen, toggleSection } = useSidebarState('facturation', sections);

  const isBaseDeDonneesActive =
    location.pathname.startsWith('/base-de-donnees') || location.pathname.startsWith('/analyses');
  const [dbOpen, setDbOpen] = useState(isBaseDeDonneesActive);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const orderedCategories = useMemo(() => {
    return [...(categories || [])].sort((a, b) => {
      const nameA = getCategoryName(a);
      const nameB = getCategoryName(b);
      const idxA = CATEGORY_ORDER.indexOf(nameA);
      const idxB = CATEGORY_ORDER.indexOf(nameB);
      if (idxA === -1 && idxB === -1) return nameA.localeCompare(nameB);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }, [categories]);

  const initial = (user?.username || '?').charAt(0).toUpperCase();

  const renderItem = (item) => {
    if (item.type === 'database-dropdown') {
      // Menu reduit : l'icone rouvre le menu sur la liste des categories.
      const ouvrirBase = () => {
        if (collapsed) {
          expand();
          setDbOpen(true);
        } else {
          setDbOpen((o) => !o);
        }
      };
      return (
        <div key="database-dropdown">
          <button
            type="button"
            className={`btn btn-link nav-link text-white w-100 text-start d-flex align-items-center justify-content-between ${isBaseDeDonneesActive ? 'active' : ''}`}
            onClick={ouvrirBase}
            title={collapsed ? item.label : undefined}
          >
            <span className="d-flex align-items-center">
              <i className={`bi ${item.icon} nav-icon`}></i>
              <span className="nav-label">{item.label}</span>
            </span>
            <i className={`bi ${dbOpen ? 'bi-chevron-up' : 'bi-chevron-down'} nav-label`} style={{ fontSize: '0.75rem' }}></i>
          </button>

          {dbOpen && !collapsed && (
            <div className="ps-3">
              {(orderedCategories.length > 0
                ? orderedCategories
                : CATEGORY_ORDER.map((nom) => ({ nom, actif: true }))
              ).map((cat) => {
                const nom = getCategoryName(cat);
                return (
                  <NavLink
                    key={nom}
                    to={`/base-de-donnees/${nom}`}
                    className="nav-link text-white small d-flex align-items-center text-capitalize"
                    onClick={closeMobile}
                  >
                    <i className={`bi ${getCategoryIcon(nom)} nav-icon`}></i>
                    <span className="nav-label">{nom}</span>
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        className="nav-link text-white d-flex align-items-center"
        onClick={closeMobile}
        title={collapsed ? item.label : undefined}
      >
        <i className={`bi ${item.icon} nav-icon`}></i>
        <span className="nav-label">{item.label}</span>
      </NavLink>
    );
  };

  return (
    <div className="app-shell d-flex" style={{ minHeight: '100vh' }}>
      <div className="mobile-topbar">
        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Ouvrir le menu"
        >
          <i className="bi bi-list"></i>
        </button>
        <img
          src="/NABY.jpg"
          alt="Logo"
          style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'contain', background: '#fff' }}
          onError={(e) => (e.target.style.display = 'none')}
        />
        <span className="text-white fw-semibold">Clinique Sope Naby</span>
      </div>

      {mobileOpen && <div className="sidebar-backdrop show" onClick={closeMobile}></div>}

      <aside className={`sidebar text-white d-flex flex-column ${mobileOpen ? 'mobile-open' : ''} ${collapsed ? 'collapsed' : ''}`}>
        <div className="p-3 d-flex align-items-center gap-2 sidebar-brand position-relative" style={{ zIndex: 1 }}>
          <div className="brand-badge">
            <img
              src="/NABY.jpg"
              alt="Logo"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <i className="bi bi-hospital fs-5" style={{ display: 'none' }}></i>
          </div>
          <div className="nav-label">
            <div>Clinique</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 500, color: 'rgba(255,255,255,0.45)' }}>Sope Naby</div>
          </div>
          <SidebarToggle collapsed={collapsed} onToggle={toggleCollapsed} />
        </div>

        <nav className="flex-grow-1 overflow-auto p-2 position-relative" style={{ zIndex: 1 }}>
          <NavLink
            to="/dashboard"
            className="nav-link text-white d-flex align-items-center"
            onClick={closeMobile}
            title={collapsed ? 'Tableau de bord' : undefined}
          >
            <i className="bi bi-speedometer2 nav-icon"></i>
            <span className="nav-label">Tableau de bord</span>
          </NavLink>

          {sections.map((section) => {
            const contientPage = section.items.some((i) => itemActif(i, location.pathname));
            const ouverte = collapsed || isSectionOpen(section.title, contientPage);
            return (
              <div key={section.title} className="sidebar-section">
                <button
                  type="button"
                  className="sidebar-section-toggle"
                  onClick={() => toggleSection(section.title)}
                  aria-expanded={ouverte}
                  disabled={collapsed || contientPage}
                  title={contientPage && !collapsed ? 'Section de la page en cours' : undefined}
                >
                  <span>{section.title}</span>
                  {!contientPage && <i className={`bi ${ouverte ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>}
                </button>
                {ouverte && section.items.map(renderItem)}
              </div>
            );
          })}
        </nav>

        <SidebarFooter
          collapsed={collapsed}
          initial={initial}
          nom={user?.username}
          role={isSuperAdmin ? 'Super Admin' : 'Manager'}
          onLogout={handleLogout}
        />
      </aside>

      <main className="main-content flex-grow-1 p-3 p-md-4" style={{ overflowY: 'auto', minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  );
}

export function SidebarToggle({ collapsed, onToggle }) {
  return (
    <button
      type="button"
      className="sidebar-collapse-toggle"
      onClick={onToggle}
      title={collapsed ? 'Agrandir le menu' : 'Reduire le menu'}
      aria-label={collapsed ? 'Agrandir le menu' : 'Reduire le menu'}
    >
      <i className={`bi ${collapsed ? 'bi-chevron-double-right' : 'bi-chevron-double-left'}`}></i>
    </button>
  );
}

export function SidebarFooter({ collapsed, initial, nom, role, onLogout }) {
  return (
    <div className="p-3 sidebar-footer position-relative" style={{ zIndex: 1 }}>
      <div className="d-flex align-items-center gap-2 mb-3 sidebar-user" title={collapsed ? `${nom} - ${role}` : undefined}>
        <div className="sidebar-avatar">{initial}</div>
        <div className="overflow-hidden nav-label">
          <div className="fw-semibold small text-truncate">{nom}</div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>{role}</div>
        </div>
      </div>
      <button className="btn btn-outline-light btn-sm w-100" onClick={onLogout} title={collapsed ? 'Deconnexion' : undefined}>
        <i className="bi bi-box-arrow-right nav-icon"></i>
        <span className="nav-label">Deconnexion</span>
      </button>
    </div>
  );
}
