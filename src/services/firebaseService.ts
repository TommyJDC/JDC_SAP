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

// Define the required secret
const FIRESTORE_SECRET = "E92N49W43Y29";

// Helper function to add the secret to data objects
const addSecret = (data: any) => {
  return { ...data, secret: FIRESTORE_SECRET };
};

// --- Existing Functions (fetchCollection, fetchDocument, updateDocument, deleteDocument, fetchSectors) ---
// Generic function to fetch all documents from a collection
export const fetchCollection = async (collectionName: string) => {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    // Reads might fail if the rule `allow read: if request.resource.data.secret == ...` is strictly enforced as written.
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
    // Reads might fail if the rule `allow read: if request.resource.data.secret == ...` is strictly enforced as written.
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
    let processedData = { ...data }; // Start with a copy
    let finalStatus = data.statut;

    if (sapSectors.includes(collectionName)) {
      if (data.demandeSAP?.toLowerCase().includes('demande de rma')) {
        finalStatus = 'Demande de RMA';
      } else if (!finalStatus) {
        finalStatus = 'Nouveau';
      }
    } else if (!finalStatus) {
      // Optional default for non-SAP
    }

    processedData = { ...processedData, statut: finalStatus };

    if (!processedData.dateCreation) {
        processedData.dateCreation = new Date().toISOString();
    }

    // Add the secret before writing
    const dataWithSecret = addSecret(processedData);

    console.log(`[firebaseService] Attempting to add document to ${collectionName} with data (secret included):`, dataWithSecret);

    const docRef = await addDoc(collection(db, collectionName), dataWithSecret);
    console.log(`[firebaseService] Document successfully added to ${collectionName} with ID: ${docRef.id} and status: ${finalStatus}`);
    return docRef.id;
  } catch (error) {
    console.error(`[firebaseService] Error adding document to ${collectionName}:`, error);
    console.error(`[firebaseService] Data attempted (before secret):`, data);
    throw error;
  }
};


// Generic function to update a document in a collection
export const updateDocument = async (collectionName: string, documentId: string, data: any) => {
  try {
    const docRef = doc(db, collectionName, documentId);
    // Add the secret before updating
    const dataWithSecret = addSecret(data);
    await updateDoc(docRef, dataWithSecret);
    console.log(`[firebaseService] Document ${documentId} in ${collectionName} updated successfully (secret included).`);
  } catch (error) {
    console.error(`Error updating document ${documentId} in ${collectionName}:`, error);
    throw error;
  }
};

// Generic function to delete a document from a collection
// Note: Delete operations might be affected by the read rule depending on how Firestore evaluates it.
// If deletes require reading the document first internally, they might fail.
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

// Function to fetch sectors (collection names) - This reads metadata, likely unaffected by data rules.
export const fetchSectors = async () => {
  try {
    const sectorsData = [
      { id: 'CHR' },
      { id: 'HACCP' },
      { id: 'Kezia' },
      { id: 'Tabac' },
    ];
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
  // Reads might fail if the rule `allow read: if request.resource.data.secret == ...` is strictly enforced as written.
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
  // Reads might fail if the rule `allow read: if request.resource.data.secret == ...` is strictly enforced as written.
  const unsubscribe = onSnapshot(ticketsCollection, (querySnapshot) => {
    const tickets: any[] = [];
    const updatePromises: Promise<void>[] = []; // Store update promises

    querySnapshot.docs.forEach((docSnap) => {
      const ticketData = docSnap.data();
      let currentStatus = ticketData.statut;
      const needsRmaStatus = ticketData.demandeSAP?.toLowerCase().includes('demande de rma');
      const isNotRmaStatus = currentStatus !== 'Demande de RMA';

      let needsUpdate = false;
      let updateData: any = {};

      if (needsRmaStatus && isNotRmaStatus) {
        currentStatus = 'Demande de RMA';
        updateData.statut = currentStatus;
        needsUpdate = true;
        console.log(`Planning update for ticket ${docSnap.id} in sector ${sectorId} to status: ${currentStatus} based on demandeSAP.`);
      } else if (!currentStatus) {
        currentStatus = 'Nouveau';
        updateData.statut = currentStatus;
        needsUpdate = true;
        console.log(`Planning update for ticket ${docSnap.id} in sector ${sectorId} to default status: ${currentStatus} as it was missing.`);
      }

      if (needsUpdate) {
        // Add secret to the update data
        const updateDataWithSecret = addSecret(updateData);
        updatePromises.push(updateDoc(docSnap.ref, updateDataWithSecret));
      }

      tickets.push({
        id: docSnap.id,
        ...ticketData,
        statut: currentStatus, // Use potentially corrected status
        secteur: sectorId,
      });
    });

    callback(tickets); // Callback with potentially corrected data immediately

    // Execute background updates
    if (updatePromises.length > 0) {
      Promise.all(updatePromises)
        .then(() => console.log(`Finished background status updates (with secret) for sector ${sectorId}.`))
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
    const ticketsCollection = collection(db, sectorId);
    // Reads might fail if the rule `allow read: if request.resource.data.secret == ...` is strictly enforced as written.
    const ticketsSnapshot = await getDocs(ticketsCollection);
    const tickets = [];
    const updatePromises: Promise<void>[] = [];

    for (const docSnap of ticketsSnapshot.docs) {
      const ticketData = docSnap.data();
      let currentStatus = ticketData.statut;
      const needsRmaStatus = ticketData.demandeSAP?.toLowerCase().includes('demande de rma');
      const isNotRmaStatus = currentStatus !== 'Demande de RMA';

      let needsUpdate = false;
      let updateData: any = {};

      if (needsRmaStatus && isNotRmaStatus) {
        currentStatus = 'Demande de RMA';
        updateData.statut = currentStatus;
        needsUpdate = true;
      } else if (!currentStatus) {
        currentStatus = 'Nouveau';
        updateData.statut = currentStatus;
        needsUpdate = true;
      }

      if (needsUpdate) {
        // Add secret to the update data
        const updateDataWithSecret = addSecret(updateData);
        updatePromises.push(updateDoc(docSnap.ref, updateDataWithSecret));
      }

      tickets.push({
        id: docSnap.id,
        ...ticketData,
        statut: currentStatus,
        secteur: sectorId,
      });
    }

    await Promise.all(updatePromises); // Wait for potential updates to finish

    return tickets;

  } catch (error) {
    console.error(`Error fetching tickets for sector ${sectorId}:`, error);
    throw error;
  }
};


// Function to update ticket status
export const updateTicketStatus = async (sectorId: string, ticketId: string, status: string) => {
  try {
    const ticketDocRef = doc(db, sectorId, ticketId);
    // Add secret when updating status
    await updateDoc(ticketDocRef, addSecret({ statut: status }));
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
    // Add secret when updating ticket data
    await updateDoc(ticketDocRef, addSecret(ticketData));
  } catch (error) {
    console.error(`Error updating ticket ${ticketId} in ${sectorId}:`, error);
    throw error;
  }
};

// Function to fetch all documents from the "Envoi" collection (ONE-TIME FETCH)
export const fetchEnvois = async () => {
  try {
    // Reads might fail if the rule `allow read: if request.resource.data.secret == ...` is strictly enforced as written.
    return await fetchCollection('Envoi'); // Uses generic fetchCollection
  } catch (error) {
    console.error("Error fetching envois:", error);
    throw error;
  }
};

// Function to delete an envoi from Firestore
export const deleteEnvoi = async (envoiId: string) => {
  try {
    // Uses generic deleteDocument which might be affected by read rule side-effects
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
    // Uses generic deleteDocument which might be affected by read rule side-effects
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
    // Reads might fail if the rule `allow read: if request.resource.data.secret == ...` is strictly enforced as written.
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
    const existingGeocode = await fetchGeocode(address); // Read might fail
    if (existingGeocode) {
        console.log(`Geocode already exists for address: ${address}. Skipping storage.`);
        return;
    }
    const geocodeData = {
      address: address,
      latitude: latitude,
      longitude: longitude,
      timestamp: new Date()
    };
    // Add secret before storing
    await addDoc(geocodesCollection, addSecret(geocodeData));
    console.log(`Geocode successfully stored for address: ${address} (secret included).`);
  } catch (error) {
    console.error("Error storing geocode in Firestore:", error);
  }
};

// Function to sign in with Google
export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(auth, provider);
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

    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
    const user = userCredential.user;

    await updateProfile(user, {
      displayName: userData.nom
    });

    // Prepare Firestore data
    const firestoreUserData = {
      uid: user.uid,
      email: userData.email,
      nom: userData.nom,
      role: userData.role,
      secteurs: userData.secteurs,
      dateCreation: new Date().toISOString()
    };
    // Add secret before writing to 'users'
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, addSecret(firestoreUserData));

    // Prepare auth_users data
    const authUsersData = {
      email: userData.email,
      nom: userData.nom,
      role: userData.role,
      dateCreation: new Date().toISOString(),
      authProvider: 'email'
    };
    // Add secret before writing to 'auth_users'
    await setDoc(doc(db, 'auth_users', user.uid), addSecret(authUsersData));

    console.log("[firebaseService] User created successfully (secret included in Firestore docs):", user.uid);
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

    const currentUser = auth.currentUser;
    const userDocRef = doc(db, 'users', userId);
    const { password, ...firestoreData } = userData;

    // Add secret before updating 'users' collection
    await updateDoc(userDocRef, addSecret(firestoreData));

    const authUserDocRef = doc(db, 'auth_users', userId);
    const authUserDoc = await getDoc(authUserDocRef); // Read might fail

    if (authUserDoc.exists()) {
      const authUpdateData = {
        nom: userData.nom,
        role: userData.role,
      };
      // Add secret before updating 'auth_users' collection
      await updateDoc(authUserDocRef, addSecret(authUpdateData));
    }

    // Password update logic remains the same (Auth operation, not Firestore)
    if (password && currentUser && currentUser.uid === userId && currentPassword) {
      const credential = EmailAuthProvider.credential(currentUser.email!, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, password);
      console.log("[firebaseService] User password updated successfully");
    }

    // Profile update logic remains the same (Auth operation, not Firestore)
    if (userData.nom && currentUser && currentUser.uid === userId) {
      await updateProfile(currentUser, {
        displayName: userData.nom
      });
    }

    console.log("[firebaseService] User updated successfully (secret included in Firestore updates)");
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
    // Reads might fail if the rule `allow read: if request.resource.data.secret == ...` is strictly enforced as written.

    const usersCollection = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCollection);
    const firestoreUsers = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      type: 'Firestore'
    }));
    console.log(`[firebaseService] Fetched ${firestoreUsers.length} users from Firestore`);

    const authUsersCollection = collection(db, 'auth_users');
    const authUsersSnapshot = await getDocs(authUsersCollection);
    const authUsers = authUsersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      type: 'Firebase Authentication'
    }));
    console.log(`[firebaseService] Fetched ${authUsers.length} users from auth_users collection`);

    let firebaseAuthUsers = authUsers;
    if (authUsers.length === 0) {
      // Fallback to known users and store them with secret
      const knownAuthUsers = [
        { id: 'oZxwRVuq6BSV6p8IJHcCzCD4lv63', email: 'camille.petrot@jdc.fr', nom: 'Camille Petrot', role: 'Admin', authProvider: 'email' },
        { id: '0vne09pdaFfNExSaSy8w2KgR5KL2', email: 'tommy.vilmen@jdc.fr', nom: 'Tommy Vilmen', role: 'Admin', authProvider: 'email' },
        { id: 'TlMhQvhtblSxEakVBeGKRiOs0lo2', email: 'test@test.fr', nom: 'Test', role: 'Utilisateur', authProvider: 'email' }
      ];
      firebaseAuthUsers = knownAuthUsers.map(u => ({ ...u, type: 'Firebase Authentication' }));

      for (const user of knownAuthUsers) {
        const userDocRef = doc(db, 'auth_users', user.id);
        const authData = {
          email: user.email,
          nom: user.nom,
          role: user.role,
          dateCreation: new Date().toISOString(),
          authProvider: user.authProvider
        };
        // Add secret when storing fallback users
        await setDoc(userDocRef, addSecret(authData));
      }
      console.log(`[firebaseService] Created ${firebaseAuthUsers.length} users in auth_users collection (secret included)`);
    }

    // Merge logic remains the same
    const mergedUsers = [...firebaseAuthUsers];
    for (const firestoreUser of firestoreUsers) {
      const existingIndex = mergedUsers.findIndex(user => user.id === firestoreUser.id);
      if (existingIndex >= 0) {
        mergedUsers[existingIndex] = {
          ...mergedUsers[existingIndex],
          ...firestoreUser,
          type: 'Firebase Authentication'
        };
      } else {
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
    // Using known users as placeholder for actual Auth list retrieval
    const knownAuthUsers = [
      { id: 'oZxwRVuq6BSV6p8IJHcCzCD4lv63', email: 'camille.petrot@jdc.fr', nom: 'Camille Petrot', role: 'Admin', authProvider: 'email' },
      { id: '0vne09pdaFfNExSaSy8w2KgR5KL2', email: 'tommy.vilmen@jdc.fr', nom: 'Tommy Vilmen', role: 'Admin', authProvider: 'email' },
      { id: 'TlMhQvhtblSxEakVBeGKRiOs0lo2', email: 'test@test.fr', nom: 'Test', role: 'Utilisateur', authProvider: 'email' }
    ];

    for (const user of knownAuthUsers) {
      const userDocRef = doc(db, 'auth_users', user.id);
      const authData = {
        email: user.email,
        nom: user.nom,
        role: user.role,
        dateCreation: new Date().toISOString(),
        authProvider: user.authProvider
      };
      // Add secret when syncing/setting data
      await setDoc(userDocRef, addSecret(authData), { merge: true });
    }

    console.log(`[firebaseService] Synchronized ${knownAuthUsers.length} Firebase Auth users with Firestore (secret included)`);
    return true;
  } catch (error) {
    console.error("[firebaseService] Error synchronizing Firebase Auth users:", error);
    throw error;
  }
};

// Function to fetch the total count of 'envois' (ONE-TIME FETCH)
export const fetchEnvoisCount = async () => {
  try {
    const q = collection(db, 'Envoi');
    // Reads might fail if the rule `allow read: if request.resource.data.secret == ...` is strictly enforced as written.
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
    // Reads might fail if the rule `allow read: if request.resource.data.secret == ...` is strictly enforced as written.
    const unsubscribe = onSnapshot(q, (snapshot) => {
        callback(snapshot.size); // Use snapshot.size for real-time count
    }, (error) => {
        console.error("Error listening to envois count:", error);
        callback(0); // Return 0 on error
    });
    return unsubscribe;
};
