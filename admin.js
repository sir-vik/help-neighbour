// ==========================================
// HELP-NEIGHBOUR ADMIN DASHBOARD
// ==========================================

// ==========================================
// FIREBASE CONFIGURATION
// ==========================================

var firebaseConfig = {
  apiKey: "AIzaSyAWWS_hRRX3XrbSHQgUqd6YYnVAtfbO3w",
  authDomain: "help-neighbour-a468b.firebaseapp.com",
  databaseURL: "https://help-neighbour-a468b-default-rtdb.firebaseio.com",
  projectId: "help-neighbour-a468b",
  storageBucket: "help-neighbour-a468b.firebasestorage.app",
  messagingSenderId: "94455126492",
  appId: "1:94455126492:web:4c412e743ae823915ad719",
  measurementId: "G-XJ3XQ7N616"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

var db = firebase.firestore();
var auth = firebase.auth();


// ==========================================
// ADMIN DATA
// ==========================================

var allUsers = [];
var allRequests = [];


// ==========================================
// AUTHENTICATION
// ==========================================

auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .catch(function(error) {
    console.error("Admin auth persistence error:", error);
  });

var authCheckTimeout = null;

auth.onAuthStateChanged(function(user) {
  console.log("Firebase auth state changed:", user);

  // Clear any pending redirect timer if auth state updates
  if (authCheckTimeout) {
    clearTimeout(authCheckTimeout);
  }

  if (!user) {
    // Wait 800ms for Firebase to finish loading the persisted session from storage
    authCheckTimeout = setTimeout(function() {
      if (!auth.currentUser) {
        console.log("No admin session found.");
        window.location.href = "login.html";
      }
    }, 800);
    return;
  }

  console.log("Logged-in user:", user.email);

  // Only the registered admin email can access this dashboard.
  if (user.email !== "samuelchosen57@gmail.com") {
    console.log("Unauthorized account.");
    alert("You are not authorized to access the admin dashboard.");
    auth.signOut();
    return;
  }

  console.log("ADMIN VERIFIED!");

  // Reveal the dashboard page now that authentication is verified
  document.body.style.display = "block";

  loadDashboardStats();
  loadUsers();
  loadRequests();

});

// ==========================================
// DASHBOARD STATISTICS
// ==========================================

function loadDashboardStats() {

  console.log("Loading dashboard statistics...");

  // ----------------------------------------
  // TOTAL USERS
  // ----------------------------------------

  db.collection("users").get()

    .then(function(snapshot) {

      console.log("Users loaded:", snapshot.size);

      var totalUsers =
        document.getElementById("totalUsers");

      if (totalUsers) {
        totalUsers.innerText = snapshot.size;
      }

    })

    .catch(function(error) {

      console.error("Users statistics error:", error);

      var totalUsers =
        document.getElementById("totalUsers");

      if (totalUsers) {
        totalUsers.innerText = "0";
      }

    });


  // ----------------------------------------
  // REQUEST STATISTICS
  // ----------------------------------------

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

        if (
          data.status &&
          String(data.status).toLowerCase() === "open"
        ) {
          openCount++;
        }

      });


      if (openRequests) {
        openRequests.innerText = openCount;
      }

    })

    .catch(function(error) {

      console.error("Requests statistics error:", error);

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


// ==========================================
// LOAD USERS
// ==========================================

function loadUsers() {

  var usersList =
    document.getElementById("usersList");

  if (!usersList) {
    return;
  }

  usersList.innerHTML =
    '<div class="empty-message">Loading users...</div>';


  db.collection("users").get()

    .then(function(snapshot) {

      allUsers = [];

      snapshot.forEach(function(doc) {

        var user = doc.data();

        user.id = doc.id;

        allUsers.push(user);

      });


      console.log("Registered users:", allUsers.length);

      renderUsers(allUsers);

    })

    .catch(function(error) {

      console.error("Unable to load users:", error);

      usersList.innerHTML =
        '<div class="empty-message">' +
        'Unable to load users.' +
        '</div>';

    });

}


// ==========================================
// RENDER USERS
// ==========================================

function renderUsers(users) {

  var usersList =
    document.getElementById("usersList");

  if (!usersList) {
    return;
  }


  usersList.innerHTML = "";


  if (users.length === 0) {

    usersList.innerHTML =
      '<div class="empty-message">' +
      'No registered users found.' +
      '</div>';

    return;

  }


  users.forEach(function(user) {

    var card =
      document.createElement("div");

    card.className = "card";


    var photoHTML = "";

    if (user.profilePhoto) {

      photoHTML =
        '<img src="' +
        escapeHTML(user.profilePhoto) +
        '" class="profile-img" alt="Profile photo">';

    } else {

      photoHTML =
        '<div class="profile-img"></div>';

    }


    card.innerHTML =

      '<div class="user-card">' +

        photoHTML +

        '<div class="user-info">' +

          '<div class="user-name">' +
            escapeHTML(
              user.fullName || "Neighbour"
            ) +
          '</div>' +

          '<div class="user-email">' +
            escapeHTML(
              user.email || "No email"
            ) +
          '</div>' +

          '<div class="user-meta">' +
            '<strong>Skill:</strong> ' +
            escapeHTML(
              user.skill || "Not specified"
            ) +
            ' &nbsp; • &nbsp; ' +
            '<strong>Role:</strong> ' +
            escapeHTML(
              user.role || "Not specified"
            ) +
          '</div>' +

        '</div>' +

      '</div>';


    usersList.appendChild(card);

  });

}


// ==========================================
// USER SEARCH
// ==========================================

function filterUsers() {

  var searchInput =
    document.getElementById("userSearch");

  if (!searchInput) {
    return;
  }


  var searchTerm =
    searchInput.value
      .toLowerCase()
      .trim();


  if (searchTerm === "") {

    renderUsers(allUsers);
    return;

  }


  var filteredUsers =
    allUsers.filter(function(user) {

      var name =
        String(user.fullName || "")
          .toLowerCase();

      var email =
        String(user.email || "")
          .toLowerCase();

      var skill =
        String(user.skill || "")
          .toLowerCase();

      return (
        name.includes(searchTerm) ||
        email.includes(searchTerm) ||
        skill.includes(searchTerm)
      );

    });


  renderUsers(filteredUsers);

}


// ==========================================
// LOAD REQUESTS
// ==========================================

function loadRequests() {

  var requestsList =
    document.getElementById("requestsList");

  if (!requestsList) {
    return;
  }


  requestsList.innerHTML =
    '<div class="empty-message">Loading requests...</div>';


  db.collection("requests").get()

    .then(function(snapshot) {

      allRequests = [];

      snapshot.forEach(function(doc) {

        var request = doc.data();

        request.id = doc.id;

        allRequests.push(request);

      });


      console.log(
        "Help requests:",
        allRequests.length
      );


      renderRequests(allRequests);

    })

    .catch(function(error) {

      console.error(
        "Unable to load requests:",
        error
      );

      requestsList.innerHTML =
        '<div class="empty-message">' +
        'Unable to load requests.' +
        '</div>';

    });

}


// ==========================================
// RENDER REQUESTS
// ==========================================

function renderRequests(requests) {

  var requestsList =
    document.getElementById("requestsList");

  if (!requestsList) {
    return;
  }


  requestsList.innerHTML = "";


  if (requests.length === 0) {

    requestsList.innerHTML =
      '<div class="empty-message">' +
      'No help requests found.' +
      '</div>';

    return;

  }


  requests.forEach(function(request) {

    var card =
      document.createElement("div");

    card.className = "card";


    var status =
      String(
        request.status || "unknown"
      ).toLowerCase();


    var statusClass =
      status === "open"
        ? "open"
        : "";


    card.innerHTML =

      '<div class="request-title">' +
        escapeHTML(
          request.title || "Help Request"
        ) +
      '</div>' +

      '<div class="request-description">' +
        escapeHTML(
          request.description ||
          "No description provided."
        ) +
      '</div>' +

      '<div class="request-meta">' +
        '<strong>Requested by:</strong> ' +
        escapeHTML(
          request.userName || "Unknown user"
        ) +
      '</div>' +

      '<div class="request-meta">' +
        '<strong>Skill needed:</strong> ' +
        escapeHTML(
          request.skillNeeded || "Not specified"
        ) +
      '</div>' +

      '<span class="request-status ' +
      statusClass +
      '">' +
        escapeHTML(
          request.status || "Unknown"
        ) +
      '</span>';


    requestsList.appendChild(card);

  });

}


// ==========================================
// REQUEST SEARCH
// ==========================================

function filterRequests() {

  var searchInput =
    document.getElementById("requestSearch");

  if (!searchInput) {
    return;
  }


  var searchTerm =
    searchInput.value
      .toLowerCase()
      .trim();


  if (searchTerm === "") {

    renderRequests(allRequests);
    return;

  }


  var filteredRequests =
    allRequests.filter(function(request) {

      var title =
        String(request.title || "")
          .toLowerCase();

      var description =
        String(request.description || "")
          .toLowerCase();

      var userName =
        String(request.userName || "")
          .toLowerCase();

      var skill =
        String(request.skillNeeded || "")
          .toLowerCase();

      var status =
        String(request.status || "")
          .toLowerCase();


      return (
        title.includes(searchTerm) ||
        description.includes(searchTerm) ||
        userName.includes(searchTerm) ||
        skill.includes(searchTerm) ||
        status.includes(searchTerm)
      );

    });


  renderRequests(filteredRequests);

}


// ==========================================
// REFRESH DASHBOARD
// ==========================================

function refreshDashboard() {

  console.log("Refreshing admin dashboard...");


  var refreshButton =
    document.querySelector(".refresh-btn");


  if (refreshButton) {

    refreshButton.innerText =
      "↻ Refreshing...";

    refreshButton.disabled = true;

  }


  loadDashboardStats();
  loadUsers();
  loadRequests();


  setTimeout(function() {

    if (refreshButton) {

      refreshButton.innerText =
        "↻ Refresh";

      refreshButton.disabled = false;

    }

  }, 1000);

}


// ==========================================
// HTML SAFETY
// ==========================================

function escapeHTML(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


// ==========================================
// ADMIN LOGOUT
// ==========================================

function adminLogout() {

  auth.signOut()

    .then(function() {

      console.log("Admin logged out.");

      window.location.href =
        "login.html";

    })

    .catch(function(error) {

      console.error(
        "Logout error:",
        error
      );

    });

}
