import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { getCategoryName, getCategoryIcon, CATEGORY_ORDER } from '../utils/categoryUtils';
import { getModules } from '../config/modules';

export default function Layout() {
  const { user, isSuperAdmin, logout } = useAuth();
  const { categories } = useData();
  const location = useLocation();
  const navigate = useNavigate();

  const modules = getModules({ space: 'facturation' });

  const isBaseDeDonneesActive =
    location.pathname.startsWith('/base-de-donnees') || location.pathname.startsWith('/analyses');

  const [dbOpen, setDbOpen] = useState(isBaseDeDonneesActive);
  const [openModules, setOpenModules] = useState(() => new Set(modules.map((m) => m.key)));
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  const toggleModule = (key) => {
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

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
    if (item.adminOnly && !isSuperAdmin) return null;

    if (item.type === 'database-dropdown') {
      return (
        <div key="database-dropdown">
          <button
            type="button"
            className="btn btn-link nav-link text-white w-100 text-start d-flex align-items-center justify-content-between"
            onClick={() => setDbOpen((o) => !o)}
          >
            <span>
              <i className={`bi ${item.icon} me-2`}></i>
              {item.label}
            </span>
            <i className={`bi ${dbOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} style={{ fontSize: '0.75rem' }}></i>
          </button>

          {dbOpen && (
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
                    <i className={`bi ${getCategoryIcon(nom)} me-2`}></i>
                    {nom}
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
      >
        <i className={`bi ${item.icon} me-2`}></i>
        {item.label}
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

      <aside className={`sidebar text-white d-flex flex-column ${mobileOpen ? 'mobile-open' : ''}`} style={{ width: 272, flexShrink: 0 }}>
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
          <div>
            <div>Clinique</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 500, color: 'rgba(255,255,255,0.45)' }}>Sope Naby</div>
          </div>
        </div>

        <nav className="flex-grow-1 overflow-auto p-2 position-relative" style={{ zIndex: 1 }}>
          <NavLink to="/dashboard" className="nav-link text-white d-flex align-items-center" onClick={closeMobile}>
            <i className="bi bi-speedometer2 me-2"></i>Dashboard
          </NavLink>

          <div className="sidebar-section-title mt-3 mb-1 px-2">Modules</div>

          {modules.map((module) => {
            const isOpen = openModules.has(module.key);
            return (
              <div key={module.key} className="module-block">
                <button
                  type="button"
                  className="module-header"
                  onClick={() => toggleModule(module.key)}
                  aria-expanded={isOpen}
                >
                  <span className="d-flex align-items-center gap-2">
                    <span className={`module-icon ${module.color}`}>
                      <i className={`bi ${module.icon}`}></i>
                    </span>
                    <span className="module-label">{module.label}</span>
                  </span>
                  <i className={`bi ${isOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} style={{ fontSize: '0.7rem' }}></i>
                </button>

                {isOpen && (
                  <div className="module-body">
                    {module.sections.length === 0 ? (
                      <div className="module-empty">Bientot disponible</div>
                    ) : (
                      module.sections.map((section) => (
                        <div key={section.title}>
                          <div className="sidebar-section-title mt-2 mb-1 px-2">{section.title}</div>
                          {section.items.map(renderItem)}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-3 sidebar-footer position-relative" style={{ zIndex: 1 }}>
          <div className="d-flex align-items-center gap-2 mb-3">
            <div className="sidebar-avatar">{initial}</div>
            <div className="overflow-hidden">
              <div className="fw-semibold small text-truncate">{user?.username}</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>
                {isSuperAdmin ? 'Super Admin' : 'Manager'}
              </div>
            </div>
          </div>
          <button className="btn btn-outline-light btn-sm w-100" onClick={handleLogout}>
            <i className="bi bi-box-arrow-right me-2"></i>Deconnexion
          </button>
        </div>
      </aside>

      <main className="main-content flex-grow-1 p-3 p-md-4" style={{ overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
