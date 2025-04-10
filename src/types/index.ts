export interface Ticket {
  id: string;
  date: string; // Keep as string if that's how it's stored
  dateCreation?: string; // Optional ISO string from auto-generation
  demandeur: string;
  client: string;
  description: string;
  statut: string; // e.g., 'Nouveau', 'En cours', 'Résolu', 'Demande de RMA'
  secteur: string; // e.g., 'CHR', 'HACCP', 'Kezia', 'Tabac'
  demandeSAP?: string; // Optional field for SAP specific requests
  // Add other relevant fields as needed
}

export interface Envoi {
  id: string;
  date: string; // Assuming date is stored as a string like "jeudi 18 juillet 2024"
  client: string;
  codeClient: string;
  ville: string;
  statut: string; // e.g., 'A traiter', 'Traité', 'Annulé'
  // Add other relevant fields as needed
}

export interface User {
  id: string; // Corresponds to Firebase Auth UID
  uid?: string; // Can be redundant if id is always UID
  nom: string;
  email: string;
  role: 'Admin' | 'Utilisateur' | 'Lecteur'; // Example roles
  secteurs?: string[]; // Sectors the user might be associated with
  dateCreation?: string; // ISO date string
  source?: string; // For debugging merge issues ('Firestore (users)', 'Firestore (auth_users)')
  authProvider?: string; // e.g., 'email', 'google.com'
}

export interface Geocode {
  latitude: number;
  longitude: number;
}

export interface Article {
  id: string; // Firestore document ID
  collectionSource: 'caisse' | 'hygiene' | 'securite' | 'tabac' | 'unknown'; // The original category/collection
  Code: string; // Article code (e.g., "10536") - Keep original case for display
  Désignation: string; // Article description (e.g., "MACARONS LUMINEUX POUR TOTEM") - Keep original case for display
  // designation_lowercase?: string; // REMOVED - Not needed with uppercase conversion approach
  Type?: string; // e.g., "ARTICLES"
  // Include other potential fields from Firestore if needed for display
  [key: string]: any; // Allow other potential fields
}
