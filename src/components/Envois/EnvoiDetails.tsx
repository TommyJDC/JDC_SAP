import React from 'react';

interface Envoi {
  id: string;
  articleNom: string;
  bt: string;
  codeClient: string;
  nomClient: string;
  secteur: string;
  statutExpedition: string;
  trackingLink?: string;
}

interface EnvoiDetailsProps {
  envoi: Envoi | null;
  onClose: () => void;
}

const EnvoiDetails: React.FC<EnvoiDetailsProps> = ({ envoi, onClose }) => {
  if (!envoi) {
    return null;
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-2xl"> {/* Adjusted width */}
        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
        <h3 className="font-bold text-lg mb-4">{envoi.nomClient} - Envoi BT {envoi.bt}</h3>
        <div className="space-y-2"> {/* Added spacing for details */}
            <p><b>Code Client:</b> {envoi.codeClient}</p>
            <p><b>Article:</b> {envoi.articleNom}</p>
            <p><b>Secteur:</b> {envoi.secteur}</p>
            <p><b>Statut Expédition:</b> {envoi.statutExpedition || 'N/A'}</p>
            {envoi.trackingLink ? (
              <p>
                <b>Lien de suivi:</b>{' '}
                <a href={envoi.trackingLink} target="_blank" rel="noopener noreferrer" className="link link-info break-all"> {/* Added break-all for long links */}
                  {envoi.trackingLink}
                </a>
              </p>
            ) : (
               <p><b>Lien de suivi:</b> Non disponible</p>
             )}
        </div>
        {/* Removed Summary, Solution, Status Update, and Comments sections */}
         <div className="modal-action mt-4">
            <button onClick={onClose} className="btn">Fermer</button>
        </div>
      </div>
       {/* Click outside to close */}
       <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
};

export default EnvoiDetails;
