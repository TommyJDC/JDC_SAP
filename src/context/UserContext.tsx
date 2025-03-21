import React, { createContext, useState, useEffect, useContext } from 'react';
import { getAuth } from 'firebase/auth';
import { fetchUsers } from '../services/firebaseService';

interface UserContextType {
  userSectors: string[] | null;
  setUserSectors: React.Dispatch<React.SetStateAction<string[] | null>>;
  loadingSectors: boolean;
  errorSectors: string | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userSectors, setUserSectors] = useState<string[] | null>(null);
  const [loadingSectors, setLoadingSectors] = useState(true);
  const [errorSectors, setErrorSectors] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = auth.onAuthStateChanged(async (authUser) => {
      if (authUser) {
        setLoadingSectors(true);
        setErrorSectors(null);
        try {
          const allUsers = await fetchUsers();
          const currentUserData = allUsers.find(user => user.email === authUser.email);

          if (currentUserData && currentUserData.secteurs) {
            setUserSectors(currentUserData.secteurs);
          } else {
            setUserSectors([]); // Default to empty array if no sectors found
          }
        } catch (error: any) {
          setErrorSectors(error.message || 'Failed to load user sectors.');
          console.error("Error fetching user sectors:", error);
          setUserSectors(null);
        } finally {
          setLoadingSectors(false);
        }
      } else {
        setUserSectors(null); // Clear sectors when user logs out
        setLoadingSectors(false);
      }
    });

    return () => unsubscribeAuth(); // Unsubscribe on unmount
  }, []);

  const value: UserContextType = {
    userSectors,
    setUserSectors,
    loadingSectors,
    errorSectors,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUserSectors = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUserSectors must be used within a UserProvider");
  }
  return context;
};
