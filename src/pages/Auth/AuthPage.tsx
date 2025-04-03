import React, { useState, useEffect } from 'react';
import { auth } from '../../config/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged
} from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, getFirestore } from 'firebase/firestore';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const db = getFirestore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate('/dashboard');
      }
    });

    // Vérifier s'il y a un résultat de redirection Google
    const checkRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          // L'utilisateur s'est connecté avec succès via redirection
          await setDoc(doc(db, 'auth_users', result.user.uid), {
            email: result.user.email,
            nom: result.user.displayName || 'Utilisateur Google',
            role: 'Utilisateur', // Rôle par défaut
            dateCreation: new Date().toISOString(),
            authProvider: 'google'
          }, { merge: true });
          
          navigate('/dashboard');
        }
      } catch (error: any) {
        console.error('Redirect result error:', error);
        if (error.code === 'auth/account-exists-with-different-credential') {
          setError('Un compte existe déjà avec cette adresse email mais avec une méthode de connexion différente.');
        } else {
          setError(error.message);
        }
      }
    };

    checkRedirectResult();

    return () => unsubscribe();
  }, [navigate, db]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      navigate('/dashboard');
    } catch (firebaseError: any) {
      console.error('Authentication error:', firebaseError);
      
      // Traduire les messages d'erreur Firebase
      if (firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/wrong-password') {
        setError('Email ou mot de passe incorrect.');
      } else if (firebaseError.code === 'auth/email-already-in-use') {
        setError('Cette adresse email est déjà utilisée.');
      } else if (firebaseError.code === 'auth/weak-password') {
        setError('Le mot de passe doit contenir au moins 6 caractères.');
      } else if (firebaseError.code === 'auth/invalid-email') {
        setError('Adresse email invalide.');
      } else if (firebaseError.code === 'auth/network-request-failed') {
        setError('Problème de connexion réseau. Veuillez vérifier votre connexion internet.');
      } else {
        setError(firebaseError.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    
    try {
      const provider = new GoogleAuthProvider();
      
      // Utiliser signInWithRedirect au lieu de signInWithPopup
      // Cela évite les problèmes de blocage de popup
      await signInWithRedirect(auth, provider);
      
      // Note: La redirection va se produire ici, donc le code après cette ligne
      // ne sera pas exécuté immédiatement. Le résultat sera traité dans useEffect.
    } catch (googleError: any) {
      console.error('Google authentication error:', googleError);
      setIsLoading(false);
      
      if (googleError.code === 'auth/cancelled-popup-request') {
        setError('Opération annulée. Plusieurs demandes de connexion simultanées.');
      } else if (googleError.code === 'auth/account-exists-with-different-credential') {
        setError('Un compte existe déjà avec cette adresse email mais avec une méthode de connexion différente.');
      } else {
        setError(googleError.message);
      }
    }
  };

  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content flex-col lg:flex-row-reverse">
        <div className="text-center lg:text-left">
          <h1 className="text-5xl font-bold">{isLogin ? 'Connexion' : 'Inscription'}</h1>
          <p className="py-6">
            {isLogin
              ? 'Connectez-vous pour accéder à l\'application.'
              : 'Inscrivez-vous pour créer un compte.'}
          </p>
        </div>
        <div className="card shrink-0 w-full max-w-sm shadow-2xl bg-base-100">
          <form className="card-body" onSubmit={handleSubmit}>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Email</span>
              </label>
              <input
                type="email"
                placeholder="email"
                className="input input-bordered"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Mot de passe</span>
              </label>
              <input
                type="password"
                placeholder="password"
                className="input input-bordered"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-control mt-6">
              <button 
                type="submit" 
                className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
                disabled={isLoading}
              >
                {isLoading ? 'Chargement...' : (isLogin ? 'Se connecter' : 'S\'inscrire')}
              </button>
            </div>
            
            <div className="divider">OU</div>
            
            <div className="form-control">
              <button 
                type="button" 
                className={`btn ${isLoading ? 'loading' : ''}`}
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 48 48" className="mr-2">
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
                  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
                </svg>
                Continuer avec Google
              </button>
            </div>
            
            <div className="text-center mt-4">
              <p>
                {isLogin ? 'Pas de compte?' : 'Déjà un compte?'}
                <button
                  type="button"
                  className="link link-primary ml-2"
                  onClick={() => setIsLogin(!isLogin)}
                >
                  {isLogin ? 'S\'inscrire' : 'Se connecter'}
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
