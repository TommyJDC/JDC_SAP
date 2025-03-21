import React, { useState } from 'react';

interface User {
  id: string;
  nom: string;
  email: string;
  secteurs: string[];
  role: string;
}

interface UserListProps {
  users: User[];
  onEditUser: (user: User) => void; // Add onEditUser prop
}

const UserDetail: React.FC<{ user: User | null, onClose: () => void }> = ({ user, onClose }) => {
  if (!user) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
        <h3 className="font-bold text-lg">Détails de l'utilisateur</h3>
        <div className="py-4">
          <p><b>Nom:</b> {user.nom}</p>
          <p><b>Email:</b> {user.email}</p>
          <p><b>Secteurs:</b> {Array.isArray(user.secteurs) ? user.secteurs.join(', ') : 'N/A'}</p>
          <p><b>Role:</b> {user.role}</p>
        </div>
      </div>
    </div>
  );
};


const UserList: React.FC<UserListProps> = ({ users, onEditUser }) => { // Receive onEditUser prop
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const handleDetailClick = (user: User) => {
    setSelectedUser(user);
  };

  const handleCloseDetail = () => {
    setSelectedUser(null);
  };

  const handleEditClick = (user: User) => {
    onEditUser(user); // Call onEditUser when edit button is clicked
  };


  return (
    <div>
      <div className="overflow-x-auto">
        <table className="table">
          {/* head */}
          <thead>
            <tr>
              <th>Nom</th>
              <th>Email</th>
              <th>Secteurs</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>
                  <div className="flex items-center space-x-3">
                    <div>
                      <div className="font-bold">{user.nom}</div>
                    </div>
                  </div>
                </td>
                <td>
                  {user.email}
                </td>
                <td>
                  {Array.isArray(user.secteurs) ? user.secteurs.join(', ') : 'N/A'}
                </td>
                <td>
                  {user.role}
                </td>
                <th>
                  <button className="btn btn-ghost btn-xs" onClick={() => handleDetailClick(user)}>details</button>
                  <button className="btn btn-ghost btn-xs" onClick={() => handleEditClick(user)}>Modifier</button> {/* Add Edit button */}
                </th>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th>Nom</th>
              <th>Email</th>
              <th>Secteurs</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </tfoot>
        </table>
      </div>
      {selectedUser && <UserDetail user={selectedUser} onClose={handleCloseDetail} />}
    </div>
  );
};

export default UserList;
