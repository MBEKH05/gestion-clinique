import { useEffect, useState } from 'react';

export default function PdfPreviewModal({ show, onClose, documents = [], title = 'Apercu du document' }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (show) setIndex(0);
  }, [show]);

  if (!show) return null;

  const current = documents[index];

  return (
    <div className="lab-modal-backdrop" onClick={onClose}>
      <div className="lab-modal-panel lab-modal-panel-pdf" onClick={(e) => e.stopPropagation()}>
        <div className="lab-modal-header">
          <h5 className="mb-0">{title}</h5>
          <button type="button" className="lab-modal-close" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {documents.length > 1 && (
          <div className="d-flex gap-2 flex-wrap px-3 pt-2">
            {documents.map((d, i) => (
              <button
                key={d.id}
                type="button"
                className={`btn btn-sm ${i === index ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setIndex(i)}
              >
                {d.nom_original}
              </button>
            ))}
          </div>
        )}

        <div className="lab-modal-body p-0">
          {current ? (
            <iframe src={current.url} title={current.nom_original} className="lab-pdf-frame" />
          ) : (
            <div className="text-center text-muted py-5">Aucun document.</div>
          )}
        </div>
      </div>
    </div>
  );
}
