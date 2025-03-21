import React, { useState, useEffect } from 'react';
import UserList from '../../components/Users/UserList';
import UserForm from '../../components/Users/UserForm';
import { fetchUsers, updateDocument } from '../../services/firebaseService'; // Import updateDocument

const AdminPage: React.FC = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState(null); // State to hold user being edited

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedUsers = await fetchUsers();
        setUsers(fetchedUsers);
      } catch (err: any) {
        setError(err.message || 'Failed to load users.');
        console.error("Error fetching users:", err);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const handleUserSubmit = async (userData: any) => {
    console.log('User data submitted:', userData);
    try {
      if (editingUser) {
        // Update existing user
        await updateDocument('users', editingUser.id, userData);
        console.log('User updated successfully!');
      } else {
        // Add new user (implementation for adding new user remains to be done)
        console.log('Adding new user is not yet implemented in this handler.');
        return; // Early return as add user is not handled here yet
      }

      // After successful submit, refresh user list and clear editing user
      const fetchedUsers = await fetchUsers();
      setUsers(fetchedUsers);
      setEditingUser(null); // Clear editing user after submit

    } catch (submitError: any) {
      setError(submitError.message || 'Failed to submit user data.');
      console.error("Error submitting user data:", submitError);
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user); // Set the user to be edited
  };

  if (loading) {
    return <div>Loading users...</div>;
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  return (
    <div className="container mx-auto mt-10">
      <h1 className="text-3xl font-bold mb-5">Administration des utilisateurs</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UserForm onSubmit={handleUserSubmit} user={editingUser} /> {/* Pass editingUser to UserForm */}
        <UserList users={users} onEditUser={handleEditUser} /> {/* Pass handleEditUser to UserList */}
      </div>
    </div>
  );
};

export default AdminPage;
