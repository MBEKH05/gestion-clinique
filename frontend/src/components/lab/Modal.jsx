export default function Modal({ show, onClose, title, children, maxWidth = 520 }) {
  if (!show) return null;

  return (
    <div className="lab-modal-backdrop" onClick={onClose}>
      <div className="lab-modal-panel" style={{ maxWidth }} onClick={(e) => e.stopPropagation()}>
        <div className="lab-modal-header">
          <h5 className="mb-0">{title}</h5>
          <button type="button" className="lab-modal-close" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
        <div className="lab-modal-body">{children}</div>
      </div>
    </div>
  );
}
