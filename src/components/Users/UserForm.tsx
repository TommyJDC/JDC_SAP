import React, { useState, useEffect } from 'react';

interface UserFormProps {
  user?: any;
  onSubmit: (userData: any) => void;
  onCancel: () => void;
}

const UserForm: React.FC<UserFormProps> = ({ user, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nom: '',
    role: 'Utilisateur',
    secteurs: [] as string[]
  });
  const [isEditing, setIsEditing] = useState(false);

  // Available sectors
  const availableSectors = ['CHR', 'HACCP', 'Kezia', 'Tabac'];

  useEffect(() => {
    if (user) {
      setIsEditing(true);
      setFormData({
        email: user.email || '',
        password: '', // Don't populate password for security
        nom: user.nom || '',
        role: user.role || 'Utilisateur',
        secteurs: user.secteurs || []
      });
    } else {
      setIsEditing(false);
      setFormData({
        email: '',
        password: '',
        nom: '',
        role: 'Utilisateur',
        secteurs: []
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSectorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setFormData(prev => {
      if (checked) {
        return { ...prev, secteurs: [...prev.secteurs, value] };
      } else {
        return { ...prev, secteurs: prev.secteurs.filter(sector => sector !== value) };
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="bg-base-200 p-4 rounded-lg">
      <h2 className="text-xl font-bold mb-4">
        {isEditing ? `Modifier l'utilisateur: ${user?.nom || user?.email}` : 'Ajouter un nouvel utilisateur'}
      </h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-control mb-3">
          <label className="label">
            <span className="label-text">Email</span>
          </label>
          <input
            type="email"
            name="email"
            placeholder="Email"
            className="input input-bordered"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={isEditing} // Email cannot be changed for existing users
          />
        </div>
        
        <div className="form-control mb-3">
          <label className="label">
            <span className="label-text">
              {isEditing ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe'}
            </span>
          </label>
          <input
            type="password"
            name="password"
            placeholder="Mot de passe"
            className="input input-bordered"
            value={formData.password}
            onChange={handleChange}
            required={!isEditing} // Required only for new users
          />
        </div>
        
        <div className="form-control mb-3">
          <label className="label">
            <span className="label-text">Nom</span>
          </label>
          <input
            type="text"
            name="nom"
            placeholder="Nom"
            className="input input-bordered"
            value={formData.nom}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-control mb-3">
          <label className="label">
            <span className="label-text">Rôle</span>
          </label>
          <select
            name="role"
            className="select select-bordered w-full"
            value={formData.role}
            onChange={handleChange}
          >
            <option value="Utilisateur">Utilisateur</option>
            <option value="Admin">Administrateur</option>
          </select>
        </div>
        
        <div className="form-control mb-5">
          <label className="label">
            <span className="label-text">Secteurs</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {availableSectors.map(sector => (
              <label key={sector} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox"
                  value={sector}
                  checked={formData.secteurs.includes(sector)}
                  onChange={handleSectorChange}
                />
                <span>{sector}</span>
              </label>
            ))}
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onCancel}
          >
            Annuler
          </button>
          <button
            type="submit"
            className="btn btn-primary"
          >
            {isEditing ? 'Mettre à jour' : 'Ajouter'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserForm;
