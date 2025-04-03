import React, { useState, useEffect } from 'react';
import UserList from '../../components/Users/UserList';
import UserForm from '../../components/Users/UserForm';
import { fetchUsers, updateUser, createUser, syncAuthUsersWithFirestore } from '../../services/firebaseService';
import { auth } from '../../config/firebase';

const AdminPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Fetching users from Firebase...");
      
      // Synchroniser les utilisateurs Firebase Auth avec Firestore
      await syncAuthUsersWithFirestore();
      
      // Récupérer tous les utilisateurs
      const fetchedUsers = await fetchUsers();
      console.log("Users fetched:", fetchedUsers);
      setUsers(fetchedUsers);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError(err.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  const handleUserSubmit = async (userData: any) => {
    setError(null);
    setSuccessMessage(null);
    
    try {
      if (editingUser) {
        // Update existing user
        console.log('Updating user:', editingUser.id, userData);
        await updateUser(editingUser.id, userData);
        setSuccessMessage('Utilisateur mis à jour avec succès!');
      } else {
        // Add new user
        console.log('Adding new user:', userData);
        // Check if email already exists
        const existingUser = users.find(user => user.email === userData.email);
        if (existingUser) {
          setError('Un utilisateur avec cet email existe déjà.');
          return;
        }
        
        // Create new user with Firebase Authentication
        await createUser(userData);
        setSuccessMessage('Nouvel utilisateur ajouté avec succès!');
      }

      // After successful submit, refresh user list and clear editing user
      await loadUsers();
      setEditingUser(null);
    } catch (submitError: any) {
      console.error("Error submitting user data:", submitError);
      
      // Handle specific Firebase Auth errors
      if (submitError.code === 'auth/email-already-in-use') {
        setError('Cette adresse email est déjà utilisée par un autre compte.');
      } else if (submitError.code === 'auth/weak-password') {
        setError('Le mot de passe est trop faible. Il doit contenir au moins 6 caractères.');
      } else if (submitError.code === 'auth/invalid-email') {
        setError('L\'adresse email n\'est pas valide.');
      } else {
        setError(submitError.message || 'Failed to submit user data.');
      }
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setSuccessMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <div className="container mx-auto mt-10 px-4">
      <h1 className="text-3xl font-bold mb-5">Administration des utilisateurs</h1>
      
      {successMessage && (
        <div className="alert alert-success mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{successMessage}</span>
        </div>
      )}
      
      {error && (
        <div className="alert alert-error mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <UserForm 
            onSubmit={handleUserSubmit} 
            user={editingUser} 
            onCancel={handleCancelEdit}
          />
        </div>
        
        <div>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : (
            <UserList 
              users={users} 
              onEditUser={handleEditUser} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
