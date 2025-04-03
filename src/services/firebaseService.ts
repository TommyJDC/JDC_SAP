import { db, auth } from '../config/firebase';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, getCountFromServer, onSnapshot, Unsubscribe, setDoc } from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile,
  User as FirebaseUser,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect
} from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

// --- Existing Functions (fetchCollection, fetchDocument, updateDocument, deleteDocument, fetchSectors) ---
// Generic function to fetch all documents from a collection
export const fetchCollection = async (collectionName: string) => {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error(`Error fetching collection ${collectionName}:`, error);
    throw error;
  }
};

// Generic function to fetch a document by ID from a collection
export const fetchDocument = async (collectionName: string, documentId: string) => {
  try {
    const docRef = doc(db, collectionName, documentId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      console.log("No such document!");
      return null;
    }
  } catch (error) {
    console.error(`Error fetching document ${documentId} from ${collectionName}:`, error);
    throw error;
  }
};

// Generic function to add a new document to a collection
export const addDocument = async (collectionName: string, data: any) => {
  try {
    const sapSectors = ['CHR', 'HACCP', 'Kezia', 'Tabac'];
    let newData = { ...data }; // Start with a copy of the original data
    let finalStatus = data.statut; // Get provided status if any

    // Determine initial status logic, especially for SAP sectors
    if (sapSectors.includes(collectionName)) {
      // Check for RMA condition first
      if (data.demandeSAP?.toLowerCase().includes('demande de rma')) {
        finalStatus = 'Demande de RMA';
      } else if (!finalStatus) {
        // Set default status for SAP tickets ONLY if no status was provided and it's not RMA
        finalStatus = 'Nouveau'; // Default status for new SAP tickets
      }
    } else if (!finalStatus) {
        // Optional: Set a default status for non-SAP collections if none provided
        // finalStatus = 'Pending'; // Example
    }

    // Ensure the final status is included in the data to be saved
    // This merges the original data with the determined status (overwriting if status existed)
    newData = { ...data, statut: finalStatus };

    // Add the creation date if not already present
    if (!newData.dateCreation) {
        newData.dateCreation = new Date().toISOString();
    }

    console.log(`[firebaseService] Attempting to add document to ${collectionName} with data:`, newData); // Log the data being sent

    const docRef = await addDoc(collection(db, collectionName), newData);
    console.log(`[firebaseService] Document successfully added to ${collectionName} with ID: ${docRef.id} and status: ${finalStatus}`);
    return docRef.id;
  } catch (error) {
    console.error(`[firebaseService] Error adding document to ${collectionName}:`, error);
    console.error(`[firebaseService] Data attempted:`, data); // Log data on error
    throw error;
  }
};


// Generic function to update a document in a collection
export const updateDocument = async (collectionName: string, documentId: string, data: any) => {
  try {
    const docRef = doc(db, collectionName, documentId);
    await updateDoc(docRef, data);
    console.log(`[firebaseService] Document ${documentId} in ${collectionName} updated successfully.`);
  } catch (error) {
    console.error(`Error updating document ${documentId} in ${collectionName}:`, error);
    throw error;
  }
};

// Generic function to delete a document from a collection
export const deleteDocument = async (collectionName: string, documentId: string) => {
  try {
    const docRef = doc(db, collectionName, documentId);
    await deleteDoc(docRef);
     console.log(`[firebaseService] Document ${documentId} from ${collectionName} deleted successfully.`);
  } catch (error) {
    console.error(`Error deleting document ${documentId} from ${collectionName}:`, error);
    throw error;
  }
};

// Function to fetch sectors (collection names)
export const fetchSectors = async () => {
  try {
    // These are the main collections acting as sectors for tickets
    const sectorsData = [
      { id: 'CHR' },
      { id: 'HACCP' },
      { id: 'Kezia' },
      { id: 'Tabac' },
    ];
    // console.log("Sectors data fetched:", sectorsData); // Less verbose logging
    return sectorsData;
  } catch (error) {
    console.error("Error fetching sectors:", error);
    throw error;
  }
};

// --- Real-time Listener Functions ---

/**
 * Listens for real-time updates on a specific collection.
 * @param collectionName The name of the collection to listen to.
 * @param callback Function to call with the updated data array.
 * @returns An unsubscribe function to stop the listener.
 */
export const listenToCollection = (collectionName: string, callback: (data: any[]) => void): Unsubscribe => {
  const q = query(collection(db, collectionName));
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const documents = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(documents);
  }, (error) => {
    console.error(`Error listening to collection ${collectionName}:`, error);
    callback([]); // Send empty array on error
  });
  return unsubscribe;
};


/**
 * Listens for real-time updates on tickets within a specific sector (collection).
 * Includes logic to correct 'statut' based on 'demandeSAP'.
 * @param sectorId The sector ID (collection name) to listen to.
 * @param callback Function to call with the updated tickets array.
 * @returns An unsubscribe function to stop the listener.
 */
export const listenToTicketsBySector = (sectorId: string, callback: (tickets: any[]) => void): Unsubscribe => {
  const ticketsCollection = collection(db, sectorId);
  const unsubscribe = onSnapshot(ticketsCollection, (querySnapshot) => {
    const tickets: any[] = [];
    const updatePromises: Promise<void>[] = []; // Store update promises

    // console.log(`[firebaseService] Received snapshot for sector ${sectorId} with ${querySnapshot.docs.length} docs.`); // Less verbose

    querySnapshot.docs.forEach((docSnap) => {
      const ticketData = docSnap.data();
      // console.log(`[firebaseService] Processing ticket ${docSnap.id} in sector ${sectorId}. Raw data:`, ticketData); // Less verbose

      let currentStatus = ticketData.statut; // Get current status

      // Check if status needs correction based on demandeSAP
      const needsRmaStatus = ticketData.demandeSAP?.toLowerCase().includes('demande de rma');
      const isNotRmaStatus = currentStatus !== 'Demande de RMA';

      if (needsRmaStatus && isNotRmaStatus) {
        currentStatus = 'Demande de RMA';
        updatePromises.push(updateDoc(docSnap.ref, { statut: currentStatus }));
        console.log(`Updating ticket ${docSnap.id} in sector ${sectorId} to status: ${currentStatus} based on demandeSAP.`);
      } else if (!currentStatus) {
        // If status is missing entirely, set default and update
        currentStatus = 'Nouveau'; // Default status if missing (consistent with addDocument)
        updatePromises.push(updateDoc(docSnap.ref, { statut: currentStatus }));
        console.log(`Updating ticket ${docSnap.id} in sector ${sectorId} to default status: ${currentStatus} as it was missing.`);
      }

      tickets.push({
        id: docSnap.id,
        ...ticketData,
        statut: currentStatus, // Ensure the returned ticket has the correct status
        secteur: sectorId, // Add sector info if needed elsewhere
      });
    });

    callback(tickets);

    if (updatePromises.length > 0) {
      Promise.all(updatePromises)
        .then(() => console.log(`Finished background status updates for sector ${sectorId}.`))
        .catch(err => console.error(`Error during background status updates for sector ${sectorId}:`, err));
    }

  }, (error) => {
    console.error(`Error listening to tickets for sector ${sectorId}:`, error);
    callback([]); // Send empty array on error
  });

  return unsubscribe;
};


// --- Existing Functions (fetchTicketsBySector, updateTicketStatus, etc.) ---

// Function to fetch tickets by sector (ONE-TIME FETCH - kept for potential other uses)
export const fetchTicketsBySector = async (sectorId: string) => {
  try {
    const ticketsCollection = collection(db, sectorId); // Use sectorId directly as collection name
    const ticketsSnapshot = await getDocs(ticketsCollection);
    const tickets = [];
    const updatePromises: Promise<void>[] = []; // Store update promises

    for (const docSnap of ticketsSnapshot.docs) {
      const ticketData = docSnap.data();
      let currentStatus = ticketData.statut; // Get current status

      // Check if status needs correction based on demandeSAP
      const needsRmaStatus = ticketData.demandeSAP?.toLowerCase().includes('demande de rma');
      const isNotRmaStatus = currentStatus !== 'Demande de RMA';

      if (needsRmaStatus && isNotRmaStatus) {
        currentStatus = 'Demande de RMA';
        updatePromises.push(updateDoc(docSnap.ref, { statut: currentStatus }));
        // console.log(`Updating ticket ${docSnap.id} in sector ${sectorId} to status: ${currentStatus} based on demandeSAP.`);
      } else if (!currentStatus) {
        currentStatus = 'Nouveau'; // Default status if missing
        updatePromises.push(updateDoc(docSnap.ref, { statut: currentStatus }));
        // console.log(`Updating ticket ${docSnap.id} in sector ${sectorId} to default status: ${currentStatus} as it was missing.`);
      }

      tickets.push({
        id: docSnap.id,
        ...ticketData,
        statut: currentStatus,
        secteur: sectorId,
      });
    }

    await Promise.all(updatePromises);
    // console.log(`Finished processing and potential updates for ${tickets.length} tickets in sector ${sectorId}.`); // Less verbose

    return tickets;

  } catch (error) {
    console.error(`Error fetching tickets for sector ${sectorId}:`, error);
    throw error;
  }
};


// Function to update ticket status
export const updateTicketStatus = async (sectorId: string, ticketId: string, status: string) => {
  try {
    const ticketDocRef = doc(db, sectorId, ticketId); // Use sectorId directly as collection name
    await updateDoc(ticketDocRef, { statut: status });
  } catch (error) {
    console.error(`Error updating ticket status for ${ticketId} in ${sectorId}:`, error);
    throw error;
  }
};

// Specific functions for tickets, users, etc. can be built using these generic functions
// Example for tickets (ONE-TIME FETCH):
export const fetchTicketsBySectorService = async (secteur: string) => {
  try {
    return await fetchTicketsBySector(secteur);
  } catch (error) {
    console.error(`Error in fetchTicketsBySectorService for sector ${secteur}:`, error);
    throw error;
  }
};

export const updateTicket = async (sectorId: string, ticketId: string, ticketData: any) => {
  try {
    const ticketDocRef = doc(db, sectorId, ticketId);
    await updateDoc(ticketDocRef, ticketData);
  } catch (error) {
    console.error(`Error updating ticket ${ticketId} in ${sectorId}:`, error);
    throw error;
  }
};

// Function to fetch all documents from the "Envoi" collection (ONE-TIME FETCH)
export const fetchEnvois = async () => {
  try {
    return await fetchCollection('Envoi'); // Fetch directly from "Envoi" collection
  } catch (error) {
    console.error("Error fetching envois:", error);
    throw error;
  }
};

// Function to delete an envoi from Firestore
export const deleteEnvoi = async (envoiId: string) => {
  try {
    await deleteDocument('Envoi', envoiId);
    console.log(`[firebaseService] Envoi ${envoiId} deleted successfully.`);
    return true;
  } catch (error) {
    console.error(`[firebaseService] Error deleting envoi ${envoiId}:`, error);
    throw error;
  }
};

// Function to delete multiple envois at once (for client deletion)
export const deleteMultipleEnvois = async (envoiIds: string[]) => {
  try {
    const deletePromises = envoiIds.map(id => deleteDocument('Envoi', id));
    await Promise.all(deletePromises);
    console.log(`[firebaseService] Successfully deleted ${envoiIds.length} envois.`);
    return true;
  } catch (error) {
    console.error(`[firebaseService] Error deleting multiple envois:`, error);
    throw error;
  }
};

// Function to fetch geocode from Firestore
export const fetchGeocode = async (address: string) => {
  try {
    const geocodesCollection = collection(db, 'geocodes');
    const q = query(geocodesCollection, where("address", "==", address));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      return docSnap.data() as { latitude: number, longitude: number };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching geocode from Firestore:", error);
    return null;
  }
};

// Function to store geocode in Firestore
export const storeGeocode = async (address: string, latitude: number, longitude: number) => {
  console.log(`Storing geocode for address: ${address} with coordinates: ${latitude}, ${longitude}`);
  try {
    const geocodesCollection = collection(db, 'geocodes');
    // Check if geocode already exists for this address
    const existingGeocode = await fetchGeocode(address);
    if (existingGeocode) {
        console.log(`Geocode already exists for address: ${address}. Skipping storage.`);
        return; // Don't store duplicates
    }
    // If not found, add it
    await addDoc(geocodesCollection, {
      address: address,
      latitude: latitude,
      longitude: longitude,
      timestamp: new Date() // Optional: Add timestamp for cache invalidation
    });
    console.log(`Geocode successfully stored for address: ${address}`);
  } catch (error) {
    console.error("Error storing geocode in Firestore:", error);
  }
};

// Function to sign in with Google
export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    
    // Utiliser signInWithRedirect au lieu de signInWithPopup
    await signInWithRedirect(auth, provider);
    
    // Note: La redirection va se produire ici, donc le code après cette ligne
    // ne sera pas exécuté immédiatement. Le résultat sera traité ailleurs.
    return null;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

// Function to create a new user with Firebase Authentication and store user data in Firestore
export const createUser = async (userData: { email: string; password: string; nom: string; role: string; secteurs: string[] }) => {
  try {
    console.log("[firebaseService] Creating new user with email:", userData.email);
    
    // Create user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
    const user = userCredential.user;
    
    // Update user profile with display name
    await updateProfile(user, {
      displayName: userData.nom
    });
    
    // Store additional user data in Firestore
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
      uid: user.uid,
      email: userData.email,
      nom: userData.nom,
      role: userData.role,
      secteurs: userData.secteurs,
      dateCreation: new Date().toISOString()
    });
    
    // Also store in auth_users collection for consistency
    await setDoc(doc(db, 'auth_users', user.uid), {
      email: userData.email,
      nom: userData.nom,
      role: userData.role,
      dateCreation: new Date().toISOString(),
      authProvider: 'email'
    });
    
    console.log("[firebaseService] User created successfully:", user.uid);
    return user.uid;
  } catch (error: any) {
    console.error("[firebaseService] Error creating user:", error);
    throw error;
  }
};

// Function to update a user's profile in both Authentication and Firestore
export const updateUser = async (userId: string, userData: any, currentPassword?: string) => {
  try {
    console.log("[firebaseService] Updating user:", userId);
    
    // Get current user
    const currentUser = auth.currentUser;
    
    // Update Firestore user data
    const userDocRef = doc(db, 'users', userId);
    
    // Remove password from userData before storing in Firestore
    const { password, ...firestoreData } = userData;
    await updateDoc(userDocRef, firestoreData);
    
    // Also update in auth_users collection
    const authUserDocRef = doc(db, 'auth_users', userId);
    const authUserDoc = await getDoc(authUserDocRef);
    
    if (authUserDoc.exists()) {
      await updateDoc(authUserDocRef, {
        nom: userData.nom,
        role: userData.role,
        // Don't update email or authProvider
      });
    }
    
    // If there's a new password and we're updating the current user, update Authentication password
    if (password && currentUser && currentUser.uid === userId && currentPassword) {
      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(currentUser.email!, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      
      // Update password
      await updatePassword(currentUser, password);
      console.log("[firebaseService] User password updated successfully");
    }
    
    // If updating display name for current user
    if (userData.nom && currentUser && currentUser.uid === userId) {
      await updateProfile(currentUser, {
        displayName: userData.nom
      });
    }
    
    console.log("[firebaseService] User updated successfully");
    return true;
  } catch (error: any) {
    console.error("[firebaseService] Error updating user:", error);
    throw error;
  }
};

// Function to fetch all users from Firestore and Firebase Auth
export const fetchUsers = async () => {
  try {
    console.log("[firebaseService] Fetching users...");
    
    // Récupérer les utilisateurs depuis Firestore
    const usersCollection = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCollection);
    const firestoreUsers = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      type: 'Firestore'
    }));
    
    console.log(`[firebaseService] Fetched ${firestoreUsers.length} users from Firestore`);
    
    // Récupérer les utilisateurs depuis la collection "auth_users" (où nous stockerons les données des utilisateurs Firebase Auth)
    const authUsersCollection = collection(db, 'auth_users');
    const authUsersSnapshot = await getDocs(authUsersCollection);
    const authUsers = authUsersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      type: 'Firebase Authentication'
    }));
    
    console.log(`[firebaseService] Fetched ${authUsers.length} users from auth_users collection`);
    
    // Si aucun utilisateur n'est trouvé dans auth_users, utiliser les utilisateurs connus
    let firebaseAuthUsers = authUsers;
    if (authUsers.length === 0) {
      // Utilisateurs connus de Firebase Authentication
      firebaseAuthUsers = [
        {
          id: 'oZxwRVuq6BSV6p8IJHcCzCD4lv63',
          email: 'camille.petrot@jdc.fr',
          nom: 'Camille Petrot',
          role: 'Admin',
          type: 'Firebase Authentication'
        },
        {
          id: '0vne09pdaFfNExSaSy8w2KgR5KL2',
          email: 'tommy.vilmen@jdc.fr',
          nom: 'Tommy Vilmen',
          role: 'Admin',
          type: 'Firebase Authentication'
        },
        {
          id: 'TlMhQvhtblSxEakVBeGKRiOs0lo2',
          email: 'test@test.fr',
          nom: 'Test',
          role: 'Utilisateur',
          type: 'Firebase Authentication'
        }
      ];
      
      // Stocker ces utilisateurs dans la collection auth_users pour une utilisation future
      for (const user of firebaseAuthUsers) {
        const userDocRef = doc(db, 'auth_users', user.id);
        await setDoc(userDocRef, {
          email: user.email,
          nom: user.nom,
          role: user.role,
          dateCreation: new Date().toISOString(),
          authProvider: 'email' // Default for existing users
        });
      }
      
      console.log(`[firebaseService] Created ${firebaseAuthUsers.length} users in auth_users collection`);
    }
    
    // Fusionner les utilisateurs de Firestore et Firebase Authentication
    // Si un utilisateur existe dans les deux, privilégier les données de Firestore
    const mergedUsers = [...firebaseAuthUsers];
    
    for (const firestoreUser of firestoreUsers) {
      const existingIndex = mergedUsers.findIndex(user => user.id === firestoreUser.id);
      if (existingIndex >= 0) {
        // Mettre à jour l'utilisateur existant avec les données de Firestore
        mergedUsers[existingIndex] = {
          ...mergedUsers[existingIndex],
          ...firestoreUser,
          type: 'Firebase Authentication' // Conserver le type Firebase Authentication
        };
      } else {
        // Ajouter l'utilisateur Firestore s'il n'existe pas déjà
        mergedUsers.push(firestoreUser);
      }
    }
    
    console.log(`[firebaseService] Total users after merging: ${mergedUsers.length}`);
    return mergedUsers;
  } catch (error) {
    console.error("[firebaseService] Error fetching users:", error);
    throw error;
  }
};

// Function to synchronize Firebase Auth users with Firestore
export const syncAuthUsersWithFirestore = async () => {
  try {
    console.log("[firebaseService] Synchronizing Firebase Auth users with Firestore...");
    
    // Cette fonction serait idéalement appelée par une Cloud Function
    // Mais pour l'instant, nous utilisons les utilisateurs connus
    const knownAuthUsers = [
      {
        id: 'oZxwRVuq6BSV6p8IJHcCzCD4lv63',
        email: 'camille.petrot@jdc.fr',
        nom: 'Camille Petrot',
        role: 'Admin',
        authProvider: 'email'
      },
      {
        id: '0vne09pdaFfNExSaSy8w2KgR5KL2',
        email: 'tommy.vilmen@jdc.fr',
        nom: 'Tommy Vilmen',
        role: 'Admin',
        authProvider: 'email'
      },
      {
        id: 'TlMhQvhtblSxEakVBeGKRiOs0lo2',
        email: 'test@test.fr',
        nom: 'Test',
        role: 'Utilisateur',
        authProvider: 'email'
      }
    ];
    
    // Stocker ces utilisateurs dans la collection auth_users
    for (const user of knownAuthUsers) {
      const userDocRef = doc(db, 'auth_users', user.id);
      await setDoc(userDocRef, {
        email: user.email,
        nom: user.nom,
        role: user.role,
        dateCreation: new Date().toISOString(),
        authProvider: user.authProvider
      }, { merge: true });
    }
    
    console.log(`[firebaseService] Synchronized ${knownAuthUsers.length} Firebase Auth users with Firestore`);
    return true;
  } catch (error) {
    console.error("[firebaseService] Error synchronizing Firebase Auth users:", error);
    throw error;
  }
};

// Function to fetch the total count of 'envois' (ONE-TIME FETCH)
export const fetchEnvoisCount = async () => {
  try {
    const q = collection(db, 'Envoi'); // Count from "Envoi" collection
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error("Error fetching envois count:", error);
    throw error;
  }
};

// Function to listen to the total count of 'envois' (REAL-TIME)
export const listenToEnvoisCount = (callback: (count: number) => void): Unsubscribe => {
    const q = collection(db, 'Envoi');
    const unsubscribe = onSnapshot(q, (snapshot) => {
        callback(snapshot.size); // Use snapshot.size for real-time count
    }, (error) => {
        console.error("Error listening to envois count:", error);
        callback(0); // Return 0 on error
    });
    return unsubscribe;
};
