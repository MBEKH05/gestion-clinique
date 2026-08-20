import { useEffect, useState } from 'react';

const DISMISS_KEY = 'facturation_clinique_install_dismissed_at';
const DISMISS_DELAY_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function manualInstructions() {
  if (isIos()) {
    return 'Appuyez sur le bouton Partager de votre navigateur, puis sur "Sur l’ecran d’accueil".';
  }
  return 'Ouvrez le menu (⋮) de votre navigateur, puis choisissez "Installer l’application" ou "Installer Clinique Sope Naby".';
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DELAY_MS) return;

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const handleInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    // Beaucoup de navigateurs ne declenchent jamais beforeinstallprompt sur une
    // premiere visite (heuristiques d'engagement) : on affiche quand meme le
    // message, avec des instructions manuelles si l'installation native
    // n'est pas disponible au moment du clic.
    const t = setTimeout(() => setVisible(true), 600);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
      clearTimeout(t);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      setShowManual(true);
      return;
    }
    setInstalling(true);
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setInstalling(false);
    setVisible(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="install-prompt">
      <div className="d-flex align-items-center gap-3 w-100">
        <div className="install-prompt-icon">
          <img src="/NABY.jpg" alt="" onError={(e) => (e.target.style.display = 'none')} />
        </div>
        <div className="install-prompt-text">
          <div className="fw-semibold">Installer Clinique Sope Naby</div>
          <div className="text-muted small">Ajoutez la plateforme sur votre bureau pour un acces rapide.</div>
        </div>
        <div className="install-prompt-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={handleInstall} disabled={installing}>
            {installing && <span className="spinner-border spinner-border-sm me-2"></span>}
            Installer
          </button>
          <button type="button" className="install-prompt-close" onClick={handleDismiss} aria-label="Fermer">
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
      </div>
      {showManual && (
        <div className="install-prompt-manual">
          <i className="bi bi-info-circle me-1"></i>
          {manualInstructions()}
        </div>
      )}
    </div>
  );
}
