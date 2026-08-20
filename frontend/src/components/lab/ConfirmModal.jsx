import Modal from './Modal';

export default function ConfirmModal({
  show,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmer',
  confirmVariant = 'btn-danger',
  busy = false,
  irreversible = false,
  error = '',
}) {
  return (
    <Modal show={show} onClose={onClose} title={title}>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <div className="mb-3">{message}</div>
      {irreversible && (
        <div className="text-muted small mb-3">
          <i className="bi bi-exclamation-triangle me-1"></i>Cette action est irreversible.
        </div>
      )}
      <div className="d-flex gap-2">
        <button type="button" className={`btn ${confirmVariant}`} onClick={onConfirm} disabled={busy}>
          {busy && <span className="spinner-border spinner-border-sm me-2"></span>}
          {confirmLabel}
        </button>
        <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={busy}>
          Annuler
        </button>
      </div>
    </Modal>
  );
}
