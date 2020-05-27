import firebase from "firebase/app";
import "firebase/auth";
import "firebase/database";
import "firebase/storage";

var firebaseConfig = {
  apiKey: "AIzaSyAew5IUMrW5_roq8NASAfz1iWLwi8FVP80",
  authDomain: "react-slack-clone-69745.firebaseapp.com",
  databaseURL: "https://react-slack-clone-69745.firebaseio.com",
  projectId: "react-slack-clone-69745",
  storageBucket: "react-slack-clone-69745.appspot.com",
  messagingSenderId: "864349402618",
  appId: "1:864349402618:web:25d6e52878dee05d262043",
  measurementId: "G-55R6X06J4C",
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

export default firebase;
