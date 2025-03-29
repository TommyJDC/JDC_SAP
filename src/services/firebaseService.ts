import { db } from '../config/firebase';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, getCountFromServer, onSnapshot, Unsubscribe } from 'firebase/firestore'; // Import Unsubscribe

// --- Existing Functions (fetchCollection, fetchDocument, addDocument, updateDocument, deleteDocument, fetchSectors) ---
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
    // Check if the collection is one of the SAP sectors
    const sapSectors = ['CHR', 'HACCP', 'Kezia', 'Tabac'];
    let newData = { ...data };
    let initialStatus = data.statut; // Get provided status or undefined

    // Determine initial status for SAP sectors
    if (sapSectors.includes(collectionName)) {
        // Check for RMA condition first
        if (data.demandeSAP?.toLowerCase().includes('demande de rma')) {
            initialStatus = 'Demande de RMA';
        } else if (!initialStatus) {
            // Set default only if no status provided and not RMA
            initialStatus = 'en cours';
        }
        newData = { ...data, statut: initialStatus };
    }


    const docRef = await addDoc(collection(db, collectionName), newData);
    console.log(`Document added to ${collectionName} with ID: ${docRef.id} and status: ${initialStatus}`);
    return docRef.id;
  } catch (error) {
    console.error(`Error adding document to ${collectionName}:`, error);
    throw error;
  }
};

// Generic function to update a document in a collection
export const updateDocument = async (collectionName: string, documentId: string, data: any) => {
  try {
    const docRef = doc(db, collectionName, documentId);
    await updateDoc(docRef, data);
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
    console.log("Sectors data fetched:", sectorsData);
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
    // Optionally, inform the user or trigger specific error handling in the callback
    callback([]); // Send empty array on error or handle differently
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

    console.log(`[firebaseService] Received snapshot for sector ${sectorId} with ${querySnapshot.docs.length} docs.`); // *** ADDED LOG ***

    querySnapshot.docs.forEach((docSnap) => {
      const ticketData = docSnap.data();
      // *** ADDED DETAILED LOG for each ticket ***
      console.log(`[firebaseService] Processing ticket ${docSnap.id} in sector ${sectorId}. Raw data:`, ticketData);
      console.log(`[firebaseService]   >> Does it have 'Adresse'?`, ticketData.hasOwnProperty('Adresse'));
      console.log(`[firebaseService]   >> Value of 'Adresse':`, ticketData.Adresse);
      // *** END ADDED LOG ***

      let currentStatus = ticketData.statut; // Get current status

      // Check if status needs correction based on demandeSAP
      const needsRmaStatus = ticketData.demandeSAP?.toLowerCase().includes('demande de rma');
      const isNotRmaStatus = currentStatus !== 'Demande de RMA';

      if (needsRmaStatus && isNotRmaStatus) {
        // If demandeSAP indicates RMA but status isn't set correctly, update it
        currentStatus = 'Demande de RMA'; // Update local status for immediate return
        // Asynchronously update the document in Firestore (no need to await here for real-time)
        updatePromises.push(updateDoc(docSnap.ref, { statut: currentStatus }));
        console.log(`Updating ticket ${docSnap.id} in sector ${sectorId} to status: ${currentStatus} based on demandeSAP.`);
      } else if (!currentStatus) {
        // If status is missing entirely, set default and update
        currentStatus = 'en cours'; // Default status
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

    // Call the callback immediately with the processed tickets
    callback(tickets);

    // Handle updates in the background if any were needed
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
        console.log(`Updating ticket ${docSnap.id} in sector ${sectorId} to status: ${currentStatus} based on demandeSAP.`);
      } else if (!currentStatus) {
        currentStatus = 'en cours';
        updatePromises.push(updateDoc(docSnap.ref, { statut: currentStatus }));
        console.log(`Updating ticket ${docSnap.id} in sector ${sectorId} to default status: ${currentStatus} as it was missing.`);
      }

      tickets.push({
        id: docSnap.id,
        ...ticketData,
        statut: currentStatus,
        secteur: sectorId,
      });
    }

    await Promise.all(updatePromises);
    console.log(`Finished processing and potential updates for ${tickets.length} tickets in sector ${sectorId}.`);

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

// Function to fetch users from Firestore
export const fetchUsers = async () => {
  try {
    return await fetchCollection('users'); // Assuming 'users' is the name of your users collection
  } catch (error) {
    console.error("Error fetching users:", error);
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
