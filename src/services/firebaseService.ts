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
        // Check if the collection is one of the SAP sectors
        const sapSectors = ['CHR', 'HACCP', 'Kezia', 'Tabac'];
        let newData = { ...data };

        if (sapSectors.includes(collectionName) && !data.statut) {
          // Set default status to "en cours" if it's an SAP sector and status is not already provided
          newData = { ...data, statut: 'en cours' };
        }

        const docRef = await addDoc(collection(db, collectionName), newData);
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
        const tickets = [];

        for (const doc of ticketsSnapshot.docs) {
          const ticketData = doc.data();
          let updated = false;

          // Check if status is missing or empty
          if (!ticketData.statut) {
            ticketData.statut = 'en cours';
            updated = true;
            // Update the document in Firestore
            await updateDoc(doc.ref, { statut: 'en cours' });
          }

          tickets.push({
            id: doc.id,
            ...ticketData,
            secteur: sectorId,
          });
        }
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
        console.error("Error updating ticket status:", error);
        throw error;
      }
    };

    // Specific functions for tickets, users, etc. can be built using these generic functions
    // Example for tickets:
    export const fetchTickets = async () => fetchCollection('tickets'); // This might not be used anymore, use fetchTicketsBySector instead
    export const fetchTicket = async (ticketId: string) => fetchDocument('tickets', ticketId); // Consider if this is still relevant
    export const addTicket = async (ticketData: any) => addDocument('tickets', ticketData); // Consider where to add tickets, likely under a sector
    export const updateTicket = async (sectorId: string, ticketId: string, ticketData: any) => {
      try {
        const ticketDocRef = doc(db, sectorId, ticketId);
        await updateDoc(ticketDocRef, ticketData);
      } catch (error) {
        console.error("Error updating ticket:", error);
        throw error;
      }
    };
    export const deleteTicket = async (ticketId: string) => deleteDocument('tickets', ticketId); // Consider if this is still relevant

    export const fetchTicketsBySectorService = async (secteur: string) => {
      try {
        return await fetchTicketsBySector(secteur);
      } catch (error) {
        console.error("Error fetching tickets by sector:", error);
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
          const doc = querySnapshot.docs[0];
          return doc.data() as { latitude: number, longitude: number };
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
      console.log(`Storing geocode for address: ${address} with coordinates: ${latitude}, ${longitude}`); // Log start of storeGeocode
      try {
        const geocodesCollection = collection(db, 'geocodes');
        await addDoc(geocodesCollection, {
          address: address,
          latitude: latitude,
          longitude: longitude,
          timestamp: new Date() // Optional: Add timestamp for cache invalidation
        });
        console.log(`Geocode successfully stored for address: ${address}`); // Log success
      } catch (error) {
        console.error("Error storing geocode in Firestore:", error); // Log error if any
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

    // Function to fetch the total count of 'envois'
    export const fetchEnvoisCount = async () => {
      try {
        const q = collection(db, 'envois');
        const snapshot = await getCountFromServer(q);
        return snapshot.data().count;
      } catch (error) {
        console.error("Error fetching envois count:", error);
        throw error;
      }
    };
