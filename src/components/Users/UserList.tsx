import React, { useState } from 'react';

interface User {
  id: string;
  email: string;
  nom: string;
  role: string;
  type?: string;
  secteurs?: string[];
}

interface UserListProps {
  users: User[];
  onEditUser: (user: User) => void;
}

const UserList: React.FC<UserListProps> = ({ users, onEditUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('Tous les utilisateurs');

  // Count users by type
  const userCounts = {
    total: users.length,
    firebase: users.filter(user => user.type === 'Firebase Authentication').length,
    firestore: users.filter(user => !user.type || user.type !== 'Firebase Authentication').length
  };

  // Filter users based on search term and filter type
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.nom?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = 
      filterType === 'Tous les utilisateurs' || 
      (filterType === 'Firebase Authentication' && user.type === 'Firebase Authentication') ||
      (filterType === 'Firestore' && (!user.type || user.type !== 'Firebase Authentication'));
    
    return matchesSearch && matchesType;
  });

  return (
    <div className="bg-base-200 p-4 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Liste des utilisateurs ({users.length})</h2>
      
      {/* User count cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-base-300 p-3 rounded-lg text-center">
          <div className="text-sm opacity-70">Total</div>
          <div className="text-3xl font-bold">{userCounts.total}</div>
        </div>
        <div className="bg-base-300 p-3 rounded-lg text-center">
          <div className="text-sm opacity-70">Firebase Auth</div>
          <div className="text-3xl font-bold text-info">{userCounts.firebase}</div>
        </div>
        <div className="bg-base-300 p-3 rounded-lg text-center">
          <div className="text-sm opacity-70">Firestore</div>
          <div className="text-3xl font-bold text-secondary">{userCounts.firestore}</div>
        </div>
      </div>
      
      {/* Search and filter */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          placeholder="Rechercher un utilisateur"
          className="input input-bordered w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select 
          className="select select-bordered w-full sm:w-auto"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option>Tous les utilisateurs</option>
          <option>Firebase Authentication</option>
          <option>Firestore</option>
        </select>
      </div>
      
      {/* Users table */}
      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Email</th>
              <th>Type</th>
              <th>UID</th>
              <th>Rôle</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map(user => (
                <tr key={user.id}>
                  <td>{user.nom || 'N/A'}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`badge ${user.type === 'Firebase Authentication' ? 'badge-info' : 'badge-secondary'}`}>
                      {user.type || 'Firestore'}
                    </span>
                  </td>
                  <td className="text-xs opacity-70">{user.id}</td>
                  <td>
                    <span className={`badge ${user.role?.toLowerCase() === 'admin' ? 'badge-primary' : 'badge-accent'}`}>
                      {user.role || 'Utilisateur'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button 
                        className="btn btn-sm btn-neutral"
                        onClick={() => onEditUser(user)}
                      >
                        Détails
                      </button>
                      <button 
                        className="btn btn-sm btn-warning"
                        onClick={() => onEditUser(user)}
                      >
                        Modifier
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-4">
                  Aucun utilisateur trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserList;
