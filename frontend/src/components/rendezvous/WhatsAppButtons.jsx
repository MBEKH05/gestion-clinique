import { rendezVousAPI } from '../../api/endpoints';
import { TYPES_MESSAGE, lienWhatsApp, numeroWhatsApp } from '../../utils/rendezVousUtils';

// Boutons qui ouvrent WhatsApp avec le message deja ecrit ; la secretaire
// n'a plus qu'a appuyer sur Envoyer. L'heure d'ouverture est notee sur le rendez-vous.
export default function WhatsAppButtons({ rdv, types = ['confirmation', 'rappel', 'annulation'], onSent, size = 'sm', withLabels = false }) {
  const sansNumero = !numeroWhatsApp(rdv.telephone);

  const ouvrir = (type) => {
    window.open(lienWhatsApp(type, rdv), '_blank', 'noopener');
    rendezVousAPI
      .marquerWhatsapp(rdv.id)
      .then(({ data }) => onSent?.(data))
      .catch(() => {});
  };

  return (
    <div className="d-inline-flex gap-1 flex-wrap">
      {TYPES_MESSAGE.filter((t) => types.includes(t.key)).map((t) => (
        <button
          key={t.key}
          type="button"
          className={`btn btn-${size} btn-outline-success`}
          title={sansNumero ? `${t.label} WhatsApp (pas de numero : choisir le contact dans WhatsApp)` : `${t.label} par WhatsApp`}
          onClick={() => ouvrir(t.key)}
        >
          <i className={`bi bi-whatsapp${withLabels ? ' me-1' : ''}`}></i>
          {withLabels ? t.label : <i className={`bi ${t.icon} ms-1`}></i>}
        </button>
      ))}
    </div>
  );
}
