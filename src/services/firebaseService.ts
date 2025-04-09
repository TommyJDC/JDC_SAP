import { db, auth, app } from '../config/firebase'; // Ensure 'app' is imported if needed for functions
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

// Helper function to add the secret to data objects for write/update
const addSecret = (data: any) => {
  return { ...data, secret: FIRESTORE_SECRET };
};

// --- Generic Firestore Operations ---

/**
 * Fetches all documents from a specified collection.
 * Note: Reads might fail based on Firestore security rules (e.g., requiring auth or specific data).
 * @param collectionName The name of the collection.
 * @returns A promise resolving to an array of documents with their IDs.
 */
export const fetchCollection = async (collectionName: string) => {
  console.log(`[firebaseService] Fetching collection: ${collectionName}`);
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const documents = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`[firebaseService] Fetched ${documents.length} documents from ${collectionName}.`);
    return documents;
  } catch (error) {
    console.error(`[firebaseService] Error fetching collection ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Fetches a single document by its ID from a specified collection.
 * Note: Reads might fail based on Firestore security rules.
 * @param collectionName The name of the collection.
 * @param documentId The ID of the document.
 * @returns A promise resolving to the document data with its ID, or null if not found.
 */
export const fetchDocument = async (collectionName: string, documentId: string) => {
  console.log(`[firebaseService] Fetching document: ${collectionName}/${documentId}`);
  try {
    const docRef = doc(db, collectionName, documentId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      console.log(`[firebaseService] Document ${documentId} found in ${collectionName}.`);
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      console.log(`[firebaseService] No such document: ${collectionName}/${documentId}`);
      return null;
    }
  } catch (error) {
    console.error(`[firebaseService] Error fetching document ${documentId} from ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Adds a new document to a specified collection.
 * Includes logic to set default 'statut' and 'dateCreation' if missing.
 * Adds a secret field before writing.
 * Note: Writes require appropriate Firestore security rules.
 * @param collectionName The name of the collection.
 * @param data The data for the new document.
 * @returns A promise resolving to the new document's ID.
 */
export const addDocument = async (collectionName: string, data: any) => {
  console.log(`[firebaseService] Attempting to add document to ${collectionName}...`);
  try {
    const sapSectors = ['CHR', 'HACCP', 'Kezia', 'Tabac'];
    let processedData = { ...data }; // Start with a copy
    let finalStatus = data.statut;
    const demandeSAPLower = data.demandeSAP?.toLowerCase() ?? ''; // Handle undefined

    // Auto-set status for SAP sectors based on demandeSAP or default to 'Nouveau'
    if (sapSectors.includes(collectionName)) {
      if (demandeSAPLower.includes('demande de rma')) {
        finalStatus = 'Demande de RMA';
      } else if (!finalStatus) {
        finalStatus = 'Nouveau';
      }
    } else if (!finalStatus) {
      // Optional default for non-SAP collections if needed
      // finalStatus = 'DefaultStatus';
    }

    processedData = { ...processedData, statut: finalStatus };

    // Set creation date if not provided - USING 'date' field now based on user feedback
    if (!processedData.date) {
        // If you want to auto-generate a date string in the French format:
        // const now = new Date();
        // const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        // processedData.date = now.toLocaleDateString('fr-FR', options);
        // console.log(`[firebaseService] Auto-generated date: ${processedData.date}`);
        // OR keep using ISO string if that's preferred for new entries without a date
         processedData.dateCreation = new Date().toISOString(); // Keep original dateCreation for auto-gen? Decide policy.
         console.warn(`[firebaseService] Document added to ${collectionName} without a 'date' field. Added 'dateCreation' instead.`);
    }

    // Add the secret before writing
    const dataWithSecret = addSecret(processedData);

    console.log(`[firebaseService] Adding document to ${collectionName} with data (secret included):`, dataWithSecret);

    const docRef = await addDoc(collection(db, collectionName), dataWithSecret);
    console.log(`[firebaseService] Document successfully added to ${collectionName} with ID: ${docRef.id} and status: ${finalStatus}`);
    return docRef.id;
  } catch (error) {
    console.error(`[firebaseService] Error adding document to ${collectionName}:`, error);
    console.error(`[firebaseService] Data attempted (before secret):`, data);
    throw error;
  }
};

/**
 * Updates an existing document in a specified collection.
 * Adds a secret field before updating.
 * Note: Updates require appropriate Firestore security rules.
 * @param collectionName The name of the collection.
 * @param documentId The ID of the document to update.
 * @param data An object containing the fields to update.
 * @returns A promise resolving when the update is complete.
 */
export const updateDocument = async (collectionName: string, documentId: string, data: any) => {
  console.log(`[firebaseService] Attempting to update document: ${collectionName}/${documentId}`);
  try {
    const docRef = doc(db, collectionName, documentId);
    // Add the secret before updating
    const dataWithSecret = addSecret(data);
    console.log(`[firebaseService] Updating document ${documentId} in ${collectionName} with data (secret included).`);
    await updateDoc(docRef, dataWithSecret);
    console.log(`[firebaseService] Document ${documentId} in ${collectionName} updated successfully.`);
  } catch (error) {
    console.error(`[firebaseService] Error updating document ${documentId} in ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Deletes a document from a specified collection.
 * Logs the authentication state before attempting deletion.
 * Note: Deletions require appropriate Firestore security rules, typically checking `request.auth` and/or `resource.data`.
 * Secrets passed with the request are usually NOT checked by delete rules.
 * @param collectionName The name of the collection.
 * @param documentId The ID of the document to delete.
 * @returns A promise resolving when the deletion is complete.
 */
export const deleteDocument = async (collectionName: string, documentId: string) => {
  const currentUser = auth.currentUser; // Get current user *before* the try block
  console.log(`[firebaseService] Attempting to delete document: ${collectionName}/${documentId}`);
  console.log(`[firebaseService] Current auth user state during delete attempt:`, currentUser ? `${currentUser.uid} (${currentUser.email})` : 'No user authenticated');

  try {
    const docRef = doc(db, collectionName, documentId);
    await deleteDoc(docRef);
    console.log(`[firebaseService] Document ${documentId} from ${collectionName} deleted successfully.`);
  } catch (error) {
    console.error(`[firebaseService] Error deleting document ${documentId} from ${collectionName}:`, error);
    // Log the auth state again in case of error, although it was logged above
    console.error(`[firebaseService] Auth state at time of error:`, currentUser ? `${currentUser.uid} (${currentUser.email})` : 'No user authenticated');
    throw error; // Re-throw the error to be caught by the caller
  }
};

// --- Sector and Ticket Specific Functions ---

/**
 * Fetches the list of available sectors (currently static).
 * @returns A promise resolving to an array of sector objects.
 */
export const fetchSectors = async () => {
  console.log("[firebaseService] Fetching sectors...");
  try {
    // This should ideally fetch from Firestore if sectors are dynamic
    // For now, using static list matching SAP collections
    const sectorsData = [
      { id: 'CHR' },
      { id: 'HACCP' },
      { id: 'Kezia' },
      { id: 'Tabac' },
      // Add other potential sectors if needed
    ];
    console.log(`[firebaseService] Returning ${sectorsData.length} static sectors.`);
    return sectorsData;
  } catch (error) {
    console.error("[firebaseService] Error fetching sectors:", error);
    throw error;
  }
};

/**
 * Listens for real-time updates on a specific collection.
 * @param collectionName The name of the collection to listen to.
 * @param callback Function to call with the updated data array.
 * @param onError Function to call on listener error.
 * @returns An unsubscribe function to stop the listener.
 */
export const listenToCollection = (
    collectionName: string,
    callback: (data: any[]) => void,
    onError: (error: Error) => void // Add error callback
): Unsubscribe => {
  const q = query(collection(db, collectionName));
  console.log(`[firebaseService] Setting up listener for collection: ${collectionName}`);
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const documents = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`[firebaseService] Listener received ${documents.length} documents from ${collectionName}`);
    callback(documents);
  }, (error) => {
    console.error(`[firebaseService] Error listening to collection ${collectionName}:`, error);
    onError(error); // Call the provided error handler
  });
  return unsubscribe;
};


/**
 * Listens for real-time updates on tickets within a specific sector (collection).
 * Includes logic to correct 'statut' based on 'demandeSAP' and default to 'Nouveau'.
 * Performs background updates if status needs correction (adds secret).
 * @param sectorId The sector ID (collection name) to listen to.
 * @param callback Function to call with the updated tickets array.
 * @param onError Function to call on listener error.
 * @returns An unsubscribe function to stop the listener.
 */
export const listenToTicketsBySector = (
    sectorId: string,
    callback: (tickets: any[]) => void,
    onError: (error: Error) => void // Add error callback
): Unsubscribe => {
  const ticketsCollection = collection(db, sectorId);
  console.log(`[firebaseService] Setting up listener for tickets in sector: ${sectorId}`);
  const unsubscribe = onSnapshot(ticketsCollection, (querySnapshot) => {
    const tickets: any[] = [];
    const updatePromises: Promise<void>[] = []; // Store update promises

    querySnapshot.docs.forEach((docSnap) => {
      const ticketData = docSnap.data();
      // --- DEBUG LOG ---
      console.log(`[firebaseService DEBUG ${sectorId}] Received ticket ${docSnap.id}: Raw date field =`, ticketData.date, `(Type: ${typeof ticketData.date})`);
      // --- END DEBUG LOG ---

      let currentStatus = ticketData.statut;
      const demandeSAPLower = ticketData.demandeSAP?.toLowerCase() ?? ''; // Handle undefined demandeSAP
      const needsRmaStatus = demandeSAPLower.includes('demande de rma');
      const isNotRmaStatus = currentStatus !== 'Demande de RMA';

      let needsUpdate = false;
      let updateData: any = {};

      // Logic to automatically set status based on 'demandeSAP' or default to 'Nouveau'
      if (needsRmaStatus && isNotRmaStatus) {
        currentStatus = 'Demande de RMA';
        updateData.statut = currentStatus;
        needsUpdate = true;
        console.log(`[firebaseService] Planning status update for ticket ${docSnap.id} in ${sectorId} to: ${currentStatus} (based on demandeSAP).`);
      } else if (!currentStatus && !needsRmaStatus) { // Only default to Nouveau if not RMA and status is missing
        currentStatus = 'Nouveau';
        updateData.statut = currentStatus;
        needsUpdate = true;
        console.log(`[firebaseService] Planning status update for ticket ${docSnap.id} in ${sectorId} to default: ${currentStatus} (was missing).`);
      }

      if (needsUpdate) {
        // Add secret to the update data
        const updateDataWithSecret = addSecret(updateData);
        // Push the update promise (will run in background)
        updatePromises.push(
          updateDoc(docSnap.ref, updateDataWithSecret).catch(err => {
            console.error(`[firebaseService] Failed background status update for ticket ${docSnap.id}:`, err);
            // Decide if you want to revert the status in the UI or just log
          })
        );
      }

      tickets.push({
        id: docSnap.id,
        ...ticketData,
        statut: currentStatus, // Use potentially corrected status for immediate UI update
        secteur: sectorId,
      });
    });

    console.log(`[firebaseService] Listener received ${tickets.length} tickets from ${sectorId}. Pending background updates: ${updatePromises.length}`);
    callback(tickets); // Callback with potentially corrected data immediately

    // Execute background updates if any
    if (updatePromises.length > 0) {
      Promise.all(updatePromises)
        .then(() => console.log(`[firebaseService] Finished ${updatePromises.length} background status updates (with secret) for sector ${sectorId}.`))
        .catch(err => console.error(`[firebaseService] Error during batch background status updates for sector ${sectorId}:`, err));
        // Note: Individual errors are caught within the push above. This catches Promise.all errors if any occur.
    }

  }, (error) => {
    console.error(`[firebaseService] Error listening to tickets for sector ${sectorId}:`, error);
    onError(error); // Call the provided error handler
  });

  return unsubscribe;
};


/**
 * Fetches tickets for a specific sector (one-time fetch).
 * Includes logic to correct 'statut' similar to the listener.
 * Performs background updates if status needs correction (adds secret).
 * @param sectorId The sector ID (collection name).
 * @returns A promise resolving to an array of ticket objects.
 */
export const fetchTicketsBySector = async (sectorId: string) => {
  console.log(`[firebaseService] Fetching tickets (one-time) for sector: ${sectorId}`);
  try {
    const ticketsCollection = collection(db, sectorId);
    const ticketsSnapshot = await getDocs(ticketsCollection);
    const tickets = [];
    const updatePromises: Promise<void>[] = [];

    for (const docSnap of ticketsSnapshot.docs) {
      const ticketData = docSnap.data();
      let currentStatus = ticketData.statut;
      const demandeSAPLower = ticketData.demandeSAP?.toLowerCase() ?? ''; // Handle undefined demandeSAP
      const needsRmaStatus = demandeSAPLower.includes('demande de rma');
      const isNotRmaStatus = currentStatus !== 'Demande de RMA';

      let needsUpdate = false;
      let updateData: any = {};

      // Logic to automatically set status based on 'demandeSAP' or default to 'Nouveau'
      if (needsRmaStatus && isNotRmaStatus) {
        currentStatus = 'Demande de RMA';
        updateData.statut = currentStatus;
        needsUpdate = true;
      } else if (!currentStatus && !needsRmaStatus) { // Only default to Nouveau if not RMA and status is missing
        currentStatus = 'Nouveau';
        updateData.statut = currentStatus;
        needsUpdate = true;
      }

      if (needsUpdate) {
        // Add secret to the update data
        const updateDataWithSecret = addSecret(updateData);
        console.log(`[firebaseService] Planning status update (during fetch) for ticket ${docSnap.id} in ${sectorId} to: ${currentStatus}`);
        updatePromises.push(updateDoc(docSnap.ref, updateDataWithSecret));
      }

      tickets.push({
        id: docSnap.id,
        ...ticketData,
        statut: currentStatus, // Use potentially corrected status
        secteur: sectorId,
      });
    }

    // Wait for potential updates to finish before returning data
    if (updatePromises.length > 0) {
        console.log(`[firebaseService] Waiting for ${updatePromises.length} background status updates during fetch for sector ${sectorId}...`);
        await Promise.all(updatePromises);
        console.log(`[firebaseService] Finished background status updates during fetch for sector ${sectorId}.`);
    }

    console.log(`[firebaseService] Fetched ${tickets.length} tickets (one-time) for sector ${sectorId}.`);
    return tickets;

  } catch (error) {
    console.error(`[firebaseService] Error fetching tickets (one-time) for sector ${sectorId}:`, error);
    throw error;
  }
};


/**
 * Updates the status of a specific ticket.
 * Adds the secret before updating.
 * @param sectorId The sector ID (collection name).
 * @param ticketId The ID of the ticket to update.
 * @param status The new status string.
 * @returns A promise resolving when the update is complete.
 */
export const updateTicketStatus = async (sectorId: string, ticketId: string, status: string) => {
  console.log(`[firebaseService] Updating status for ticket ${ticketId} in ${sectorId} to: ${status}`);
  try {
    const ticketDocRef = doc(db, sectorId, ticketId);
    // Add secret when updating status
    await updateDoc(ticketDocRef, addSecret({ statut: status }));
    console.log(`[firebaseService] Successfully updated status for ticket ${ticketId}.`);
  } catch (error) {
    console.error(`[firebaseService] Error updating ticket status for ${ticketId} in ${sectorId}:`, error);
    throw error;
  }
};

/**
 * Service function wrapper for fetching tickets by sector (one-time).
 * @param secteur The sector ID.
 * @returns A promise resolving to an array of ticket objects.
 */
export const fetchTicketsBySectorService = async (secteur: string) => {
  console.log(`[firebaseService] Service call: fetchTicketsBySectorService for sector ${secteur}`);
  try {
    return await fetchTicketsBySector(secteur);
  } catch (error) {
    console.error(`[firebaseService] Error in fetchTicketsBySectorService for sector ${secteur}:`, error);
    throw error;
  }
};

/**
 * Updates the data of a specific ticket.
 * Adds the secret before updating.
 * @param sectorId The sector ID (collection name).
 * @param ticketId The ID of the ticket to update.
 * @param ticketData An object containing the fields to update.
 * @returns A promise resolving when the update is complete.
 */
export const updateTicket = async (sectorId: string, ticketId: string, ticketData: any) => {
  console.log(`[firebaseService] Updating ticket ${ticketId} in ${sectorId}`);
  try {
    const ticketDocRef = doc(db, sectorId, ticketId);
    // Add secret when updating ticket data
    await updateDoc(ticketDocRef, addSecret(ticketData));
     console.log(`[firebaseService] Successfully updated ticket ${ticketId}.`);
  } catch (error) {
    console.error(`[firebaseService] Error updating ticket ${ticketId} in ${sectorId}:`, error);
    throw error;
  }
};

// --- Envoi Specific Functions ---

/**
 * Fetches all documents from the "Envoi" collection (one-time fetch).
 * @returns A promise resolving to an array of envoi objects.
 */
export const fetchEnvois = async () => {
  console.log(`[firebaseService] Fetching all envois (one-time)...`);
  try {
    const envois = await fetchCollection('Envoi'); // Uses generic fetchCollection
    console.log(`[firebaseService] Fetched ${envois.length} envois.`);
    return envois;
  } catch (error) {
    console.error("[firebaseService] Error fetching envois:", error);
    throw error;
  }
};

/**
 * Deletes a single envoi document.
 * Uses the generic deleteDocument function which includes auth logging.
 * @param envoiId The ID of the envoi to delete.
 * @returns A promise resolving to true if the deletion process was initiated.
 */
export const deleteEnvoi = async (envoiId: string) => {
  console.log(`[firebaseService] Service call: deleteEnvoi for ID ${envoiId}`);
  try {
    await deleteDocument('Envoi', envoiId);
    console.log(`[firebaseService] Successfully initiated deletion for envoi ${envoiId}.`);
    return true; // Indicate success at this level
  } catch (error) {
    console.error(`[firebaseService] Error in deleteEnvoi service call for ${envoiId}:`, error);
    throw error; // Re-throw to be handled by UI
  }
};

/**
 * Deletes multiple envoi documents.
 * Uses the generic deleteDocument function which includes auth logging.
 * @param envoiIds An array of envoi IDs to delete.
 * @returns A promise resolving to true if the deletion process was initiated for all IDs.
 */
export const deleteMultipleEnvois = async (envoiIds: string[]) => {
  console.log(`[firebaseService] Attempting to delete multiple envois: ${envoiIds.join(', ')}`);
  if (envoiIds.length === 0) {
    console.warn("[firebaseService] deleteMultipleEnvois called with empty ID list.");
    return true; // Nothing to delete
  }
  try {
    // Uses generic deleteDocument which now includes logging of auth state before attempting deletion
    const deletePromises = envoiIds.map(id => deleteDocument('Envoi', id));
    await Promise.all(deletePromises);
    console.log(`[firebaseService] Successfully initiated deletion for ${envoiIds.length} envois.`);
    return true; // Indicate success at this level
  } catch (error) {
    console.error(`[firebaseService] Error deleting multiple envois:`, error);
    // The specific error (like permissions) would have been logged by deleteDocument
    throw error; // Re-throw to be handled by UI
  }
};

/**
 * Fetches the total count of documents in the 'Envoi' collection (one-time fetch).
 * @returns A promise resolving to the number of documents.
 */
export const fetchEnvoisCount = async () => {
  console.log("[firebaseService] Fetching envois count (one-time)...");
  try {
    const q = collection(db, 'Envoi');
    const snapshot = await getCountFromServer(q);
    const count = snapshot.data().count;
    console.log(`[firebaseService] Envois count: ${count}`);
    return count;
  } catch (error) {
    console.error("[firebaseService] Error fetching envois count:", error);
    throw error; // Re-throw the error
  }
};

/**
 * Listens for real-time updates to the count of documents in the 'Envoi' collection.
 * @param callback Function to call with the updated count.
 * @param onError Function to call on listener error.
 * @returns An unsubscribe function to stop the listener.
 */
export const listenToEnvoisCount = (
    callback: (count: number) => void,
    onError: (error: Error) => void // Add error callback
): Unsubscribe => {
    console.log("[firebaseService] Setting up listener for envois count...");
    const q = collection(db, 'Envoi');
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const count = snapshot.size; // Use snapshot.size for real-time count
        console.log(`[firebaseService] Envois count listener update: ${count}`);
        callback(count);
    }, (error) => {
        console.error("[firebaseService] Error listening to envois count:", error);
        onError(error); // Call the provided error handler
    });
    return unsubscribe;
};

// --- Geocoding Functions ---

/**
 * Fetches geocoding data (lat/lng) for a given address from the 'geocodes' collection.
 * @param address The address string to look up.
 * @returns A promise resolving to the coordinates object { latitude, longitude } or null if not found or on error.
 */
export const fetchGeocode = async (address: string) => {
  console.log(`[firebaseService] Fetching geocode for address: "${address}"`);
  try {
    const geocodesCollection = collection(db, 'geocodes');
    const q = query(geocodesCollection, where("address", "==", address));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      console.log(`[firebaseService] Geocode found for address: "${address}"`);
      return docSnap.data() as { latitude: number, longitude: number };
    } else {
      console.log(`[firebaseService] No geocode found in Firestore for address: "${address}"`);
      return null;
    }
  } catch (error) {
    console.error(`[firebaseService] Error fetching geocode from Firestore for "${address}":`, error);
    return null; // Return null on error to allow fallback
  }
};

/**
 * Stores geocoding data (address, lat, lng) in the 'geocodes' collection.
 * Checks if the geocode already exists before storing.
 * Adds the secret before storing.
 * @param address The address string.
 * @param latitude The latitude.
 * @param longitude The longitude.
 * @returns A promise resolving when the operation is complete.
 */
export const storeGeocode = async (address: string, latitude: number, longitude: number) => {
  console.log(`[firebaseService] Attempting to store geocode for address: "${address}"`);
  try {
    const geocodesCollection = collection(db, 'geocodes');
    // Check if geocode already exists (Read might fail based on rules)
    const existingGeocode = await fetchGeocode(address);
    if (existingGeocode) {
        console.log(`[firebaseService] Geocode already exists for address: "${address}". Skipping storage.`);
        return; // Don't store if already present
    }
    // Prepare data with secret
    const geocodeData = {
      address: address,
      latitude: latitude,
      longitude: longitude,
      timestamp: new Date() // Add timestamp for potential cache invalidation
    };
    // Add secret before storing
    await addDoc(geocodesCollection, addSecret(geocodeData));
    console.log(`[firebaseService] Geocode successfully stored for address: "${address}" (secret included).`);
  } catch (error) {
    console.error(`[firebaseService] Error storing geocode in Firestore for "${address}":`, error);
    // Decide if you need to throw or just log
  }
};

// --- Authentication and User Management Functions ---

/**
 * Initiates the Google Sign-In process using redirect.
 * @returns A promise that might not resolve in this window (due to redirect).
 */
export const signInWithGoogle = async () => {
  console.log("[firebaseService] Attempting sign in with Google redirect...");
  try {
    const provider = new GoogleAuthProvider();
    // Using redirect is generally better for web containers/mobile
    await signInWithRedirect(auth, provider);
    // No user returned here, handle result with onAuthStateChanged or getRedirectResult
    console.log("[firebaseService] Google sign-in redirect initiated.");
    return null; // Redirect will navigate away
  } catch (error) {
    console.error("[firebaseService] Error initiating sign in with Google:", error);
    throw error;
  }
};

/**
 * Creates a new user with email/password in Firebase Auth.
 * Stores user details (including role, sectors) in Firestore 'users' and 'auth_users' collections.
 * Adds the secret before writing to Firestore.
 * @param userData Object containing email, password, nom, role, secteurs.
 * @returns A promise resolving to the new user's UID.
 */
export const createUser = async (userData: { email: string; password: string; nom: string; role: string; secteurs: string[] }) => {
  try {
    console.log("[firebaseService] Creating new user with email:", userData.email);

    // 1. Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
    const user = userCredential.user;
    console.log("[firebaseService] User created in Auth:", user.uid);

    // 2. Update Auth profile (optional but good practice)
    await updateProfile(user, {
      displayName: userData.nom
    });
    console.log("[firebaseService] Auth profile updated for:", user.uid);

    // 3. Prepare Firestore data for 'users' collection
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
    console.log("[firebaseService] User data stored in 'users' collection (secret included):", user.uid);

    // 4. Prepare Firestore data for 'auth_users' collection (Consider if truly needed)
    // This seems to duplicate data. Ensure consistency if kept.
    const authUsersData = {
      email: userData.email,
      nom: userData.nom,
      role: userData.role,
      dateCreation: new Date().toISOString(),
      authProvider: 'email' // Assuming email/password provider
    };
    // Add secret before writing to 'auth_users'
    await setDoc(doc(db, 'auth_users', user.uid), addSecret(authUsersData));
    console.log("[firebaseService] User data stored in 'auth_users' collection (secret included):", user.uid);


    console.log("[firebaseService] User creation process completed successfully for:", user.uid);
    return user.uid;
  } catch (error: any) {
    console.error("[firebaseService] Error creating user:", error);
    // Log specific Firebase error codes if available
    if (error.code) {
      console.error("[firebaseService] Firebase error code:", error.code);
    }
    throw error;
  }
};

/**
 * Updates a user's profile data in Firestore ('users' and 'auth_users') and Firebase Auth (display name, password).
 * Requires re-authentication to update the password.
 * Adds the secret before updating Firestore documents.
 * @param userId The UID of the user to update.
 * @param userData Object containing fields to update (e.g., nom, role, secteurs, password).
 * @param currentPassword Required if updating the password.
 * @returns A promise resolving to true on success.
 */
export const updateUser = async (userId: string, userData: any, currentPassword?: string) => {
  try {
    console.log(`[firebaseService] Updating user: ${userId} with data:`, userData);

    const currentUser = auth.currentUser;
    const userDocRef = doc(db, 'users', userId);
    const { password, ...firestoreData } = userData; // Separate password from other data

    // 1. Update Firestore 'users' collection
    // Add secret before updating 'users' collection
    await updateDoc(userDocRef, addSecret(firestoreData));
    console.log(`[firebaseService] Updated 'users' collection for ${userId} (secret included).`);

    // 2. Update Firestore 'auth_users' collection (if it exists and is necessary)
    const authUserDocRef = doc(db, 'auth_users', userId);
    try {
        const authUserDoc = await getDoc(authUserDocRef); // Read might fail based on rules
        if (authUserDoc.exists()) {
          const authUpdateData = {
            nom: userData.nom, // Ensure you only update relevant fields
            role: userData.role,
            // email should generally not be updated here, handle separately if needed
          };
          // Add secret before updating 'auth_users' collection
          await updateDoc(authUserDocRef, addSecret(authUpdateData));
          console.log(`[firebaseService] Updated 'auth_users' collection for ${userId} (secret included).`);
        } else {
             console.log(`[firebaseService] Document for user ${userId} not found in 'auth_users'. Skipping update.`);
        }
    } catch (readError) {
        console.error(`[firebaseService] Error reading 'auth_users' for ${userId} during update, skipping:`, readError);
    }


    // 3. Update Firebase Auth Password (if provided and user matches)
    // This requires re-authentication for security.
    if (password && currentUser && currentUser.uid === userId) {
      if (!currentPassword) {
        console.warn(`[firebaseService] Password update requested for ${userId} but currentPassword was not provided. Skipping password update.`);
        throw new Error("Le mot de passe actuel est requis pour mettre à jour le mot de passe.");
      } else {
        try {
          console.log(`[firebaseService] Re-authenticating user ${userId} for password update...`);
          const credential = EmailAuthProvider.credential(currentUser.email!, currentPassword);
          await reauthenticateWithCredential(currentUser, credential);
          console.log(`[firebaseService] Re-authentication successful. Updating password...`);
          await updatePassword(currentUser, password);
          console.log(`[firebaseService] User password updated successfully in Firebase Auth for ${userId}.`);
        } catch (authError: any) {
          console.error(`[firebaseService] Error updating password for user ${userId}:`, authError);
          // Provide more specific feedback if possible
          if (authError.code === 'auth/wrong-password') {
            throw new Error("Le mot de passe actuel est incorrect.");
          } else if (authError.code === 'auth/requires-recent-login') {
             throw new Error("Veuillez vous reconnecter avant de changer le mot de passe.");
          }
          throw new Error("Erreur lors de la mise à jour du mot de passe."); // Generic fallback
        }
      }
    } else if (password && (!currentUser || currentUser.uid !== userId)) {
         console.warn(`[firebaseService] Password update requested for ${userId}, but the current authenticated user (${currentUser?.uid}) does not match or is not logged in. Skipping password update.`);
    }

    // 4. Update Firebase Auth Profile (Display Name)
    // Only update if the name is provided and the current user matches
    if (userData.nom && currentUser && currentUser.uid === userId) {
       if (currentUser.displayName !== userData.nom) {
            console.log(`[firebaseService] Updating Firebase Auth display name for ${userId} to: ${userData.nom}`);
            await updateProfile(currentUser, {
              displayName: userData.nom
            });
            console.log(`[firebaseService] Firebase Auth display name updated for ${userId}.`);
       }
    } else if (userData.nom && (!currentUser || currentUser.uid !== userId)) {
        console.warn(`[firebaseService] Display name update requested for ${userId}, but the current authenticated user (${currentUser?.uid}) does not match or is not logged in. Skipping Auth profile update.`);
    }

    console.log(`[firebaseService] User update process completed for ${userId}.`);
    return true;
  } catch (error: any) {
    console.error(`[firebaseService] General error updating user ${userId}:`, error);
    // Avoid throwing generic errors if specific ones were thrown (like wrong password)
    if (!error.message.includes("mot de passe")) { // Check if it's not already a password error
        throw new Error("Erreur lors de la mise à jour de l'utilisateur.");
    } else {
        throw error; // Re-throw specific password errors
    }
  }
};

/**
 * Fetches all users by merging data from Firestore 'users' and 'auth_users' collections.
 * Prioritizes data from the 'users' collection.
 * Note: Reads might fail based on Firestore security rules.
 * @returns A promise resolving to an array of merged user objects.
 */
export const fetchUsers = async () => {
  try {
    console.log("[firebaseService] Fetching users...");
    // Reads might fail if the rule `allow read: if request.resource.data.secret == ...` is strictly enforced as written.
    // Or if the rule requires authentication: `allow read: if request.auth != null;`

    // 1. Fetch from 'users' collection (Firestore)
    const usersCollection = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCollection);
    const firestoreUsers = usersSnapshot.docs.map(doc => ({
      id: doc.id, // Use Firestore doc ID as the primary ID (should match Auth UID)
      ...doc.data(),
      source: 'Firestore (users)' // Add source for clarity
    }));
    console.log(`[firebaseService] Fetched ${firestoreUsers.length} users from Firestore 'users' collection.`);

    // 2. Fetch from 'auth_users' collection (Firestore - consider if needed)
    const authUsersCollection = collection(db, 'auth_users');
    const authUsersSnapshot = await getDocs(authUsersCollection);
    const authDbUsers = authUsersSnapshot.docs.map(doc => ({
      id: doc.id, // Use Firestore doc ID as the primary ID (should match Auth UID)
      ...doc.data(),
      source: 'Firestore (auth_users)' // Add source
    }));
    console.log(`[firebaseService] Fetched ${authDbUsers.length} users from Firestore 'auth_users' collection.`);

    // 3. Merge Data (Prioritize 'users' collection data, supplement with 'auth_users' if needed)
    // Using a Map for efficient merging based on user ID (which should be the Auth UID)
    const mergedUsersMap = new Map<string, any>();

    // Add users from 'auth_users' first (less critical data)
    authDbUsers.forEach(user => {
      if (user.id) { // Ensure user has an ID
        mergedUsersMap.set(user.id, { ...user, id: user.id }); // Ensure 'id' field is present
      } else {
        console.warn("[firebaseService] User found in 'auth_users' without an ID:", user);
      }
    });

    // Merge data from 'users', overwriting/adding fields from 'auth_users'
    firestoreUsers.forEach(user => {
       if (user.id) { // Ensure user has an ID
            const existingUser = mergedUsersMap.get(user.id);
            mergedUsersMap.set(user.id, {
                ...(existingUser || {}), // Keep existing data if any
                ...user, // Overwrite with data from 'users' collection (primary source)
                id: user.id // Ensure 'id' field is present
            });
       } else {
           console.warn("[firebaseService] User found in 'users' without an ID:", user);
       }
    });

    // Convert Map back to array
    const mergedUsers = Array.from(mergedUsersMap.values());

    console.log(`[firebaseService] Total unique users after merging: ${mergedUsers.length}`);
    return mergedUsers;
  } catch (error) {
    console.error("[firebaseService] Error fetching users:", error);
    throw error; // Re-throw the error
  }
};


/**
 * Synchronizes a hardcoded list of known Firebase Auth users with the Firestore 'auth_users' collection.
 * WARNING: This is NOT a scalable or secure solution for production. Listing all Auth users requires Admin SDK (backend) or a Cloud Function.
 * Adds the secret before writing to Firestore.
 * @returns A promise resolving to true on completion.
 */
export const syncAuthUsersWithFirestore = async () => {
  try {
    console.warn("[firebaseService] Attempting client-side sync of Auth users with Firestore 'auth_users'. This uses a hardcoded list and is NOT recommended for production.");
    // Using known users as placeholder for actual Auth list retrieval (WHICH IS NOT POSSIBLE CLIENT-SIDE)
    const knownAuthUsers = [
      { id: 'oZxwRVuq6BSV6p8IJHcCzCD4lv63', email: 'camille.petrot@jdc.fr', nom: 'Camille Petrot', role: 'Admin', authProvider: 'email' },
      { id: '0vne09pdaFfNExSaSy8w2KgR5KL2', email: 'tommy.vilmen@jdc.fr', nom: 'Tommy Vilmen', role: 'Admin', authProvider: 'email' },
      { id: 'TlMhQvhtblSxEakVBeGKRiOs0lo2', email: 'test@test.fr', nom: 'Test', role: 'Utilisateur', authProvider: 'email' }
      // Add other known users if necessary for this limited sync
    ];

    let syncCount = 0;
    const syncPromises: Promise<void>[] = [];

    for (const user of knownAuthUsers) {
      if (!user.id) {
          console.warn("[firebaseService] Skipping sync for known user without ID:", user);
          continue;
      }
      const userDocRef = doc(db, 'auth_users', user.id);
      const authData = {
        email: user.email,
        nom: user.nom,
        role: user.role, // Ensure role is correctly sourced if available
        dateCreation: new Date().toISOString(), // Consider fetching existing date if merging
        authProvider: user.authProvider || 'unknown' // Default provider if missing
      };
      // Add secret when syncing/setting data
      // Using setDoc with merge: true to avoid overwriting fields not included here
      syncPromises.push(
        setDoc(userDocRef, addSecret(authData), { merge: true })
          .then(() => { syncCount++; })
          .catch(err => console.error(`[firebaseService] Error syncing user ${user.id} to auth_users:`, err))
      );
    }

    await Promise.all(syncPromises);

    console.log(`[firebaseService] Synchronized ${syncCount}/${knownAuthUsers.length} known Firebase Auth users with Firestore 'auth_users' (secret included).`);
    return true;
  } catch (error) {
    console.error("[firebaseService] Error synchronizing Firebase Auth users:", error);
    throw error; // Re-throw the error
  }
};

// --- Cloud Function Calls (Example) ---

/**
 * Example of how to call a Firebase Cloud Function.
 * Replace 'yourFunctionName' with the actual name of your callable function.
 * @param data The data to pass to the Cloud Function.
 * @returns A promise resolving with the result from the Cloud Function.
 */
export const callCloudFunction = async (functionName: string, data: any) => {
    console.log(`[firebaseService] Calling Cloud Function: ${functionName}`);
    try {
        const functions = getFunctions(app); // Ensure 'app' is your initialized Firebase app
        const callableFunction = httpsCallable(functions, functionName);
        const result = await callableFunction(data);
        console.log(`[firebaseService] Cloud Function ${functionName} returned:`, result.data);
        return result.data;
    } catch (error) {
        console.error(`[firebaseService] Error calling Cloud Function ${functionName}:`, error);
        throw error;
    }
};

// --- End of File ---
