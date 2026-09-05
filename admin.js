// ================================
// HELP-NEIGHBOUR ADMIN DASHBOARD
// ================================

var firebaseConfig = {
  apiKey: "AIzaSyAWWS_hRRX3XrbSHQgUqd6YYnVAtfbO3w",
  authDomain: "help-neighbour-a468b.firebaseapp.com",
  databaseURL: "https://help-neighbour-a468b-default-rtdb.firebaseio.com",
  projectId: "help-neighbour-a468b",
  storageBucket: "help-neighbour-a468b.firebasestorage.app",
  messagingSenderId: "94455126492",
  appId: "1:94455126492:web:406cff5288ad7cff5ad719"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

var db = firebase.firestore();
var auth = firebase.auth();


// ================================
// ADMIN AUTHENTICATION
// ================================

// ================================
// ADMIN AUTHENTICATION
// ================================

// ================================
// ADMIN AUTHENTICATION
// ================================

auth.onAuthStateChanged(function(user) {

  if (user) {

    console.log("Logged-in user:", user.email);

    db.collection("users").doc(user.uid).get()
      .then(function(doc) {

        if (!doc.exists) {
          alert("Admin account not found.");
          return;
        }

        var userData = doc.data();

        if (userData.role !== "admin") {
          alert("Admins only.");
          auth.signOut();
          return;
        }

        console.log("Admin verified:", user.email);

        // Now load the dashboard
        loadDashboardStats();
        loadUsers();
        loadRequests();

      })
      .catch(function(error) {

        console.error("Admin verification error:", error);

      });

  } else {

    console.log("Waiting for Firebase authentication...");

  }

});


// ================================
// DASHBOARD STATS
// ================================

function loadDashboardStats() {

  console.log("Loading dashboard stats...");

  // TOTAL USERS
  db.collection("users").get()
    .then(function(snapshot) {

      console.log("Users loaded:", snapshot.size);

      var totalUsers = document.getElementById("totalUsers");

      if (totalUsers) {
        totalUsers.innerText = snapshot.size;
      }

    })
    .catch(function(error) {

      console.error("Users error:", error);

      var totalUsers = document.getElementById("totalUsers");

      if (totalUsers) {
        totalUsers.innerText = "0";
      }

    });


  // TOTAL + OPEN REQUESTS
  db.collection("requests").get()
    .then(function(snapshot) {

      console.log("Requests loaded:", snapshot.size);

      var totalRequests =
        document.getElementById("totalRequests");

      var openRequests =
        document.getElementById("openRequests");

      if (totalRequests) {
        totalRequests.innerText = snapshot.size;
      }

      var openCount = 0;

      snapshot.forEach(function(doc) {

        var data = doc.data();

        if (data.status === "open") {
          openCount++;
        }

      });

      if (openRequests) {
        openRequests.innerText = openCount;
      }

    })
    .catch(function(error) {

      console.error("Requests error:", error);

      var totalRequests =
        document.getElementById("totalRequests");

      var openRequests =
        document.getElementById("openRequests");

      if (totalRequests) {
        totalRequests.innerText = "0";
      }

      if (openRequests) {
        openRequests.innerText = "0";
      }

    });

}

// ================================
// LOAD USERS
// ================================

function loadUsers() {

  var usersList = document.getElementById("usersList");

  db.collection("users").get()
    .then(function(snapshot) {

      usersList.innerHTML = "";

      if (snapshot.empty) {
        usersList.innerHTML = "<p>No registered users found.</p>";
        return;
      }

      snapshot.forEach(function(doc) {

        var user = doc.data();

        var card = document.createElement("div");

        card.className = "card";

        var photoHTML = "";

        if (user.profilePhoto) {

          photoHTML =
            '<img src="' +
            user.profilePhoto +
            '" class="profile-img">';

        } else {

          photoHTML =
            '<div class="profile-img"></div>';

        }

        card.innerHTML =

          '<div style="display:flex; align-items:center; gap:12px;">' +

            photoHTML +

            '<div>' +

              '<strong>' +
              (user.fullName || "Neighbour") +
              '</strong>' +

              '<div style="font-size:13px; color:#64748b;">' +
              (user.email || "No email") +
              '</div>' +

              '<div style="font-size:13px; margin-top:3px;">' +
              'Skill: ' +
              (user.skill || "Not specified") +
              '</div>' +

              '<div style="font-size:13px;">' +
              'Role: ' +
              (user.role || "Not specified") +
              '</div>' +

            '</div>' +

          '</div>';

        usersList.appendChild(card);

      });

    })
    .catch(function(error) {

      console.error(error);

      usersList.innerHTML =
        "<p>Unable to load users.</p>";

    });

}


// ================================
// LOAD REQUESTS
// ================================

function loadRequests() {

  var requestsList =
    document.getElementById("requestsList");

  db.collection("requests").get()
    .then(function(snapshot) {

      requestsList.innerHTML = "";

      if (snapshot.empty) {

        requestsList.innerHTML =
          "<p>No help requests found.</p>";

        return;
      }

      snapshot.forEach(function(doc) {

        var request = doc.data();

        var card =
          document.createElement("div");

        card.className = "card";

        card.innerHTML =

          '<strong>' +
          (request.title || "Help Request") +
          '</strong>' +

          '<div style="margin-top:6px;">' +
          (request.description || "No description") +
          '</div>' +

          '<div style="font-size:13px; margin-top:8px;">' +
          'Requested by: ' +
          (request.userName || "Unknown user") +
          '</div>' +

          '<div style="font-size:13px;">' +
          'Skill: ' +
          (request.skillNeeded || "Not specified") +
          '</div>' +

          '<div style="font-size:13px;">' +
          'Status: ' +
          '<strong>' +
          (request.status || "Unknown") +
          '</strong>' +
          '</div>';

        requestsList.appendChild(card);

      });

    })
    .catch(function(error) {

      console.error(error);

      requestsList.innerHTML =
        "<p>Unable to load requests.</p>";

    });

}


// ================================
// LOGOUT
// ================================

function adminLogout() {

  auth.signOut()
    .then(function() {
      window.location.href = "login.html";
    })
    .catch(function(error) {
      console.error("Logout error:", error);
    });

}
