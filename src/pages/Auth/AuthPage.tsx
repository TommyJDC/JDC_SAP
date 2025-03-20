import React from 'react';

const AuthPage: React.FC = () => {
  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content flex-col lg:flex-row-reverse">
        <div className="text-center lg:text-left">
          <h1 className="text-5xl font-bold">Authentification</h1>
          <p className="py-6">Connectez-vous ou inscrivez-vous pour accéder à l'application de gestion des tickets de support.</p>
        </div>
        <div className="card shrink-0 w-full max-w-sm shadow-2xl bg-base-100">
          <div className="card-body">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Email</span>
              </label>
              <input type="email" placeholder="email" className="input input-bordered" />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Mot de passe</span>
              </label>
              <input type="password" placeholder="password" className="input input-bordered" />
              <label className="label">
                <a href="#" className="label-text-alt link link-hover">Mot de passe oublié?</a>
              </label>
            </div>
            <div className="form-control mt-6">
              <button className="btn btn-primary">Se connecter</button>
            </div>
            <div className="text-center mt-4">
              <p>Pas de compte? <a href="#" className="link link-primary">S'inscrire</a></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
