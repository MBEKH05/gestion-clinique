import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getModules } from '../config/modules';

const LAB_ROLE_LABELS = {
  technicien: 'Technicien',
  medecin: 'Medecin',
  secretaire: 'Secretaire',
  administrateur: 'Administrateur',
};

const SPACE_LABELS = {
  laboratoire: 'Laboratoire',
  administration: 'Administration',
};

export default function SpaceLayout({ space }) {
  const { user, labRole, logout } = useAuth();
  const navigate = useNavigate();

  const roleLabel = space === 'laboratoire' ? LAB_ROLE_LABELS[labRole] || labRole : 'Administrateur';
  const modules = getModules({ space, role: labRole });
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

  const initial = (user?.name || user?.username || '?').charAt(0).toUpperCase();

  const renderItem = (item) => (
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
        <span className="text-white fw-semibold">{SPACE_LABELS[space]}</span>
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
            <div style={{ fontSize: '0.65rem', fontWeight: 500, color: 'rgba(255,255,255,0.45)' }}>
              {SPACE_LABELS[space]}
            </div>
          </div>
        </div>

        <nav className="flex-grow-1 overflow-auto p-2 position-relative" style={{ zIndex: 1 }}>
          <div className="sidebar-section-title mt-1 mb-1 px-2">Modules</div>

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
                    {module.sections.map((section) => (
                      <div key={section.title}>
                        <div className="sidebar-section-title mt-2 mb-1 px-2">{section.title}</div>
                        {section.items.map(renderItem)}
                      </div>
                    ))}
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
              <div className="fw-semibold small text-truncate">{user?.name || user?.username}</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>{roleLabel}</div>
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
