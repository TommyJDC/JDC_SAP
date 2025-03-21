import React, { useState, useEffect } from 'react';
import { fetchSectors } from '../../services/firebaseService';

interface UserFormProps {
  onSubmit: (userData: any) => void;
  user?: any; // Optional user prop for editing existing users
}

const UserForm: React.FC<UserFormProps> = ({ onSubmit, user }) => {
  const [sectors, setSectors] = useState([]);
  const [loadingSectors, setLoadingSectors] = useState(true);
  const [sectorsError, setSectorsError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    password: '',
    role: 'Utilisateur', // Default role
    secteurs: [],
  });

  useEffect(() => {
    const loadSectors = async () => {
      setLoadingSectors(true);
      setSectorsError(null);
      try {
        const fetchedSectors = await fetchSectors();
        setSectors(fetchedSectors);
      } catch (err: any) {
        setSectorsError(err.message || 'Failed to load sectors.');
        console.error("Error fetching sectors:", err);
      } finally {
        setLoadingSectors(false);
      }
    };

    loadSectors();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        nom: user.nom || '',
        email: user.email || '',
        password: '', // Password should not be pre-filled for security reasons
        role: user.role || 'Utilisateur',
        secteurs: user.secteurs || [],
      });
    }
  }, [user]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSectorChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(event.target.selectedOptions, option => option.value);
    setFormData({ ...formData, secteurs: selectedOptions });
  };


  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit(formData);
  };

  if (loadingSectors) {
    return <div>Loading sectors...</div>;
  }

  if (sectorsError) {
    return <div className="alert alert-error">{sectorsError}</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">{user ? 'Modifier Utilisateur' : 'Ajouter un utilisateur'}</h2>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Nom</span>
          </label>
          <input
            type="text"
            placeholder="Nom"
            className="input input-bordered"
            name="nom"
            value={formData.nom}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Email</span>
          </label>
          <input
            type="email"
            placeholder="Email"
            className="input input-bordered"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            readOnly={!!user} // Make email read-only when editing user
          />
        </div>
        {!user && (
          <div className="form-control">
            <label className="label">
              <span className="label-text">Mot de passe</span>
            </label>
            <input
              type="password"
              placeholder="Mot de passe"
              className="input input-bordered"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
            />
          </div>
        )}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Rôle</span>
          </label>
          <select
            className="select select-bordered"
            name="role"
            value={formData.role}
            onChange={handleInputChange}
          >
            <option>Utilisateur</option>
            <option>Admin</option>
          </select>
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Secteurs</span>
          </label>
          <select
            className="select select-bordered"
            name="secteurs"
            multiple
            value={formData.secteurs}
            onChange={handleSectorChange}
          >
            {sectors.map(sector => (
              <option key={sector.id} value={sector.id}>{sector.id}</option>
            ))}
          </select>
        </div>
        <div className="card-actions justify-end mt-4">
          <button type="submit" className="btn btn-primary">{user ? 'Modifier' : 'Ajouter'}</button>
        </div>
      </div>
    </form>
  );
};

export default UserForm;
