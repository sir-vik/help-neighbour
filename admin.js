// ================================
// HELP-NEIGHBOUR ADMIN DASHBOARD
// ================================

// Firebase configuration
var firebaseConfig = {
  apiKey: "AIzaSyAWWS_hRRX3XrbSHQgUqd6YYnVAtfbO3w",
  authDomain: "help-neighbour-a468b.firebaseapp.com",
  databaseURL: "https://help-neighbour-a468b-default-rtdb.firebaseio.com",
  projectId: "help-neighbour-a468b",
  storageBucket: "help-neighbour-a468b.firebasestorage.app",
  messagingSenderId: "94455126492",
  appId: "1:94455126492:web:406cff5288ad7cff5ad719"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

var db = firebase.firestore();
var auth = firebase.auth();


// ================================
// ADMIN AUTHENTICATION
// ================================

auth.onAuthStateChanged(function(user) {

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // Check the user's role in Firestore
  db.collection("users").doc(user.uid).get()
    .then(function(doc) {

      if (!doc.exists) {
        alert("Access denied.");
        auth.signOut();
        return;
      }

      var userData = doc.data();

      if (userData.role !== "admin") {
        alert("Access denied. Admins only.");
        auth.signOut();
        return;
      }

      console.log("Admin verified:", user.email);

      loadDashboardStats();
      loadUsers();
      loadRequests();

    })
    .catch(function(error) {

      console.error("Admin verification error:", error);
      alert("Unable to verify admin access.");
      auth.signOut();

    });

});


// ================================
// DASHBOARD STATISTICS
// ================================

function loadDashboardStats() {

  // Total users
  db.collection("users").get()
    .then(function(snapshot) {
      document.getElementById("totalUsers").innerText = snapshot.size;
    })
    .catch(function(error) {
      console.error("Error loading users:", error);
      document.getElementById("totalUsers").innerText = "0";
    });


  // Total requests
  db.collection("requests").get()
    .then(function(snapshot) {

      document.getElementById("totalRequests").innerText =
        snapshot.size;

      var openCount = 0;

      snapshot.forEach(function(doc) {

        var data = doc.data();

        if (data.status === "open") {
          openCount++;
        }

      });

      document.getElementById("openRequests").innerText =
        openCount;

    })
    .catch(function(error) {
      console.error("Error loading requests:", error);

      document.getElementById("totalRequests").innerText = "0";
      document.getElementById("openRequests").innerText = "0";
    });
}


// ================================
// LOAD REGISTERED USERS
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

        var photo = user.profilePhoto || "";

        card.innerHTML = `
          <div style="display:flex; align-items:center; gap:12px;">

            ${
              photo
              ? <img src="${photo}" class="profile-img">
              : <div class="profile-img"></div>
            }

            <div>
              <strong>${user.fullName || "Neighbour"}</strong>

              <div style="font-size:13px; color:#64748b;">
                ${user.email || "No email"}
              </div>

              <div style="font-size:13px; margin-top:3px;">
                Skill: ${user.skill || "Not specified"}
              </div>

              <div style="font-size:13px;">
                Role: ${user.role || "Not specified"}
              </div>
            </div>

          </div>
        `;

        usersList.appendChild(card);

      });

    })
    .catch(function(error) {

      console.error("Error loading users:", error);

      usersList.innerHTML =
        "<p>Unable to load users.</p>";

    });
}


// ================================
// LOAD HELP REQUESTS
// ================================

function loadRequests() {

  var requestsList = document.getElementById("requestsList");

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

        var card = document.createElement("div");
        card.className = "card";

        card.innerHTML = `
          <strong>
            ${request.title || "Help Request"}
          </strong>

          <div style="margin-top:6px;">
            ${request.description || "No description"}
          </div>

          <div style="font-size:13px; margin-top:8px;">
            Requested by:
            ${request.userName || "Unknown user"}
          </div>

          <div style="font-size:13px;">
            Skill:
            ${request.skillNeeded || "Not specified"}
          </div>

          <div style="font-size:13px;">
            Status:
            <strong>${request.status || "Unknown"}</strong>
          </div>
        `;

        requestsList.appendChild(card);

      });

    })
    .catch(function(error) {

      console.error("Error loading requests:", error);

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
