import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyADAy8ySvJsUP5diMyR9eIUgtPFimpydcA",
  authDomain: "sap-jdc.firebaseapp.com",
  projectId: "sap-jdc",
  storageBucket: "sap-jdc.firebasestorage.app",
  messagingSenderId: "1079234336489",
  appId: "1:1079234336489:web:2428621b62a393068ec278",
  measurementId: "G-PRWSK0TEFZ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
