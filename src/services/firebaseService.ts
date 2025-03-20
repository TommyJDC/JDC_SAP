import { db } from '../config/firebase';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, getCountFromServer, onSnapshot } from 'firebase/firestore';

// Generic function to fetch all documents from a collection
export const fetchCollection = async (collectionName: string) => {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching collection:", error);
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
    console.error("Error fetching document:", error);
    throw error;
  }
};

// Generic function to add a new document to a collection
export const addDocument = async (collectionName: string, data: any) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), data);
    return docRef.id;
  } catch (error) {
    console.error("Error adding document:", error);
    throw error;
  }
};

// Generic function to update a document in a collection
export const updateDocument = async (collectionName: string, documentId: string, data: any) => {
  try {
    const docRef = doc(db, collectionName, documentId);
    await updateDoc(docRef, data);
  } catch (error) {
    console.error("Error updating document:", error);
    throw error;
  }
};

// Generic function to delete a document from a collection
export const deleteDocument = async (collectionName: string, documentId: string) => {
  try {
    const docRef = doc(db, collectionName, documentId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting document:", error);
    throw error;
  }
};

// Function to fetch sectors
export const fetchSectors = async () => {
  try {
    // Use the root collection names directly as sectors
    const sectorsData = [
      { id: 'CHR' },
      { id: 'HACCP' },
      { id: 'Kezia' },
      { id: 'Tabac' },
    ];
    console.log("Sectors data fetched:", sectorsData); // Log sectors data
    return sectorsData;
  } catch (error) {
    console.error("Error fetching sectors:", error);
    throw error;
  }
};

// Function to fetch tickets by sector
export const fetchTicketsBySector = async (sectorId: string) => {
  try {
    const ticketsCollection = collection(db, sectorId); // Use sectorId directly as collection name
    const ticketsSnapshot = await getDocs(ticketsCollection);
    return ticketsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
    console.error("Error updating ticket status:", error);
    throw error;
  }
};

// Specific functions for tickets, users, etc. can be built using these generic functions
// Example for tickets:
export const fetchTickets = async () => fetchCollection('tickets'); // This might not be used anymore, use fetchTicketsBySector instead
export const fetchTicket = async (ticketId: string) => fetchDocument('tickets', ticketId); // Consider if this is still relevant
export const addTicket = async (ticketData: any) => addDocument('tickets', ticketData); // Consider where to add tickets, likely under a sector
export const updateTicket = async (ticketId: string, ticketData: any) => updateDocument('tickets', ticketId, ticketData); // Consider if this is still relevant
export const deleteTicket = async (ticketId: string) => deleteDocument('tickets', ticketId); // Consider if this is still relevant

// Example for users:
export const fetchUsers = async () => fetchCollection('users');
export const fetchUser = async (userId: string) => fetchDocument('users', userId);
export const addUser = async (userData: any) => addDocument('users', userData);
export const updateUser = async (userId: string, userData: any) => updateDocument('users', userId, userData);
export const deleteUser = async (userId: string) => deleteDocument('users', userId);

export const fetchTicketsBySectorService = async (secteur: string) => {
  try {
    return await fetchTicketsBySector(secteur);
  } catch (error) {
    console.error("Error fetching tickets by sector:", error);
    throw error;
  }
};
