import React from 'react';
import UserList from '../../components/Users/UserList';
import UserForm from '../../components/Users/UserForm';

const AdminPage: React.FC = () => {
  // Dummy user data
  const users = [
    { id: 'U1001', nom: 'Admin User', email: 'admin@example.com', secteurs: ['SAP', 'Envois'], role: 'Admin' },
    { id: 'U1002', nom: 'Support User', email: 'support@example.com', secteurs: ['SAP'], role: 'Utilisateur' },
    // ... more users
  ];

  const handleUserSubmit = (userData) => {
    console.log('User data submitted:', userData);
    // Here you would typically handle the user data, e.g., send it to a service to create a new user
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Administration</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h3 className="text-xl font-bold mb-2">Liste des utilisateurs</h3>
          <UserList users={users} />
        </div>
        <div>
          <h3 className="text-xl font-bold mb-2">Ajouter un utilisateur</h3>
          <UserForm onSubmit={handleUserSubmit} />
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
