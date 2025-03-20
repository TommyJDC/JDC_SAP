import React from 'react';

interface UserFormProps {
  onSubmit: (userData: any) => void; // Replace 'any' with the actual user type
}

const UserForm: React.FC<UserFormProps> = ({ onSubmit }) => {
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const userData = Object.fromEntries(formData.entries());
    onSubmit(userData);
  };

  return (
    <form onSubmit={handleSubmit} className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Ajouter un utilisateur</h2>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Nom</span>
          </label>
          <input type="text" placeholder="Nom" className="input input-bordered" name="nom" required />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Email</span>
          </label>
          <input type="email" placeholder="Email" className="input input-bordered" name="email" required />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Mot de passe</span>
          </label>
          <input type="password" placeholder="Mot de passe" className="input input-bordered" name="password" required />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Secteurs</span>
          </label>
          <input type="text" placeholder="Secteurs (séparés par des virgules)" className="input input-bordered" name="secteurs" />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Rôle</span>
          </label>
          <select className="select select-bordered" name="role">
            <option disabled selected>Choisir le rôle</option>
            <option>Utilisateur</option>
            <option>Admin</option>
          </select>
        </div>
        <div className="card-actions justify-end mt-4">
          <button type="submit" className="btn btn-primary">Ajouter</button>
        </div>
      </div>
    </form>
  );
};

export default UserForm;
