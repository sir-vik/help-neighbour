// ======================================================
// NEIGHBOURLY — PROFESSIONAL ADMIN DASHBOARD
// ======================================================

// ------------------------------------------------------
// FIREBASE CONFIGURATION
// ------------------------------------------------------

var firebaseConfig = {
  apiKey: "AIzaSyAWWS_hRRX3XrbSHQgUqd6YYnVtAtfbO3w",
  authDomain: "help-neighbour-a468b.firebaseapp.com",
  databaseURL: "https://help-neighbour-a468b-default-rtdb.firebaseio.com",
  projectId: "help-neighbour-a468b",
  storageBucket: "help-neighbour-a468b.firebasestorage.app",
  messagingSenderId: "94455126492",
  appId: "1:94455126492:web:406cff5288ad7cff5ad719"
};

// ------------------------------------------------------
// FIREBASE INITIALIZATION
// ------------------------------------------------------

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

var db = firebase.firestore();
var auth = firebase.auth();


// ------------------------------------------------------
// GLOBAL DATA
// ------------------------------------------------------

var allUsers = [];
var allRequests = [];


// ------------------------------------------------------
// SECURITY
// ------------------------------------------------------

auth.onAuthStateChanged(function(user) {

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  checkAdminAccess(user);

});


function checkAdminAccess(user) {

  var email = (user.email || "").toLowerCase();

  // Main admin account
  var isMainAdmin = email === "samuelchosen57@gmail.com";

  if (isMainAdmin) {
    showAdminDashboard();
    return;
  }

  // Check Firestore role
  db.collection("users")
    .doc(user.uid)
    .get()
    .then(function(doc) {

      if (!doc.exists) {
        denyAdminAccess();
        return;
      }

      var data = doc.data() || {};
      var role = String(data.role || "").toLowerCase();

      if (role === "admin") {
        showAdminDashboard();
      } else {
        denyAdminAccess();
      }

    })
    .catch(function(error) {

      console.error("Admin verification error:", error);

      denyAdminAccess();

    });

}


function showAdminDashboard() {

  document.body.style.display = "block";

  loadDashboardStats();
  loadUsers();
  loadRequests();

}


function denyAdminAccess() {

  alert("Access denied. Administrator privileges are required.");

  auth.signOut().finally(function() {
    window.location.href = "login.html";
  });

}


// ------------------------------------------------------
// DASHBOARD
