import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getDatabase } from "firebase/database";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Optionally import the services that you want to use
// import {...} from "firebase/database";
// import {...} from "firebase/firestore";
// import {...} from "firebase/functions";

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBas7sLCX0X3B8J6E2IsSyZ-kf2abHV5y4",
  authDomain: "locallyfe-22f70.firebaseapp.com",
  projectId: "locallyfe-22f70",
  storageBucket: "locallyfe-22f70.appspot.com",
  messagingSenderId: "66214326037",
  appId: "1:66214326037:web:02b80914869a270d8bc31c",
  measurementId: "G-JPMV31WEYS",
  databaseURL: "https://locallyfe-22f70-default-rtdb.firebaseio.com",
};

export const FIREBASE_APP = initializeApp(firebaseConfig);
export const FIREBASE_AUTH = initializeAuth(FIREBASE_APP, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
export const FIREBASE_DB = getDatabase(FIREBASE_APP)

// IOS Client ID: 66214326037-4lj7utvvnk4v5oq604nq61mvf4hp39bd.apps.googleusercontent.com