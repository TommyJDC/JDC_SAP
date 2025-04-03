import React, { useState } from 'react';
import { addDocument } from '../../services/firebaseService'; // Assuming you'll use this
import { useNavigate } from 'react-router-dom'; // To redirect after creation

const CreateTicketPage: React.FC = () => {
  const [typeIntervention, setTypeIntervention] = useState('Installation');
  const [description, setDescription] = useState('');
  const [nomClient, setNomClient] = useState('');
  const [adresseClient, setAdresseClient] = useState('');
  const [contactClient, setContactClient] = useState('');
  const [secteur, setSecteur] = useState('CHR'); // Default sector
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    // Basic validation
    if (!nomClient || !adresseClient || !description || !secteur) {
        setError("Veuillez remplir tous les champs obligatoires (Nom Client, Adresse Client, Description, Secteur).");
        setLoading(false);
        return;
    }

    // Prepare data - DO NOT set statut here, let addDocument handle it
    const ticketData = {
      typeIntervention,
      description,
      nomClient,
      adresseClient,
      contactClient,
      secteur, // Include secteur in the data if you want it stored in the document itself
      dateCreation: new Date().toISOString(), // Keep creation date here or let addDocument handle it too
      // createdBy: currentUser?.uid, // Example if user context is available
    };

    // --- DEBUGGING STEP REMOVED ---
    // console.log("[CreateTicketPage] Data being sent to addDocument:", ticketData);
    // --- END DEBUGGING STEP REMOVED ---


    try {
      // Add the document to the selected sector's collection
      // The addDocument function will handle setting the initial 'statut'
      await addDocument(secteur, ticketData);
      console.log(`Ticket créé avec succès dans le secteur ${secteur}`);
      // Optionally, redirect to the SAP page or a success page
      navigate('/sap'); // Redirect to SAP tickets list after creation
    } catch (err) {
      console.error("Erreur lors de la création du ticket:", err);
      setError("Une erreur est survenue lors de la création du ticket.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto mt-8 p-6 bg-base-100 shadow-md rounded-md">
      <h1 className="text-2xl font-semibold mb-6 text-center">Créer un Ticket SAP</h1>
      {error && <div className="alert alert-error shadow-lg mb-4"><div><span>{error}</span></div></div>}
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">

        {/* Client Information Section */}
        <div className="p-4 border border-base-300 rounded-md">
          <h2 className="text-lg font-medium mb-3 text-primary">Informations Client</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="nomClient" className="block text-sm font-medium text-base-content">Nom du Client *</label>
              <input
                type="text"
                id="nomClient"
                value={nomClient}
                onChange={(e) => setNomClient(e.target.value)}
                className="input input-bordered w-full mt-1"
                required
              />
            </div>
            <div>
              <label htmlFor="adresseClient" className="block text-sm font-medium text-base-content">Adresse Client *</label>
              <input
                type="text"
                id="adresseClient"
                value={adresseClient}
                onChange={(e) => setAdresseClient(e.target.value)}
                className="input input-bordered w-full mt-1"
                placeholder="ex: 123 Rue Principale, 75001 Paris"
                required
              />
            </div>
            <div>
              <label htmlFor="contactClient" className="block text-sm font-medium text-base-content">Personne à contacter</label>
              <input
                type="text"
                id="contactClient"
                value={contactClient}
                onChange={(e) => setContactClient(e.target.value)}
                className="input input-bordered w-full mt-1"
              />
            </div>
          </div>
        </div>

        {/* Intervention Details Section */}
        <div className="p-4 border border-base-300 rounded-md">
          <h2 className="text-lg font-medium mb-3 text-primary">Détails de l'intervention</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <label htmlFor="secteur" className="block text-sm font-medium text-base-content">Secteur SAP *</label>
                <select
                  id="secteur"
                  value={secteur}
                  onChange={(e) => setSecteur(e.target.value)}
                  className="select select-bordered w-full mt-1"
                  required
                >
                  <option value="CHR">CHR</option>
                  <option value="HACCP">HACCP</option>
                  <option value="Kezia">Kezia</option>
                  <option value="Tabac">Tabac</option>
                  {/* Add other sectors if necessary */}
                </select>
              </div>
            <div>
              <label htmlFor="typeIntervention" className="block text-sm font-medium text-base-content">Type d'intervention</label>
              <select
                id="typeIntervention"
                value={typeIntervention}
                onChange={(e) => setTypeIntervention(e.target.value)}
                className="select select-bordered w-full mt-1"
              >
                <option>Installation</option>
                <option>Maintenance</option>
                <option>Réparation</option>
                <option>Consultation</option>
                <option>Formation</option>
                <option>Autre</option>
              </select>
            </div>
          </div>
           <div className="mt-4">
              <label htmlFor="description" className="block text-sm font-medium text-base-content">Description du problème / Demande *</label>
              <textarea
                id="description"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="textarea textarea-bordered w-full mt-1"
                placeholder="Décrivez le problème ou la demande ici..."
                required
              ></textarea>
            </div>
        </div>


        {/* Submission Button */}
        <div className="text-center pt-4">
          <button
            type="submit"
            className="btn btn-primary w-full md:w-auto"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading loading-spinner"></span>
                Création en cours...
              </>
            ) : (
              'Créer le Ticket'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTicketPage;
