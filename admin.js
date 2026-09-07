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
// DASHBOARD STATS
// ------------------------------------------------------

function loadDashboardStats() {

  var totalUsersElement =
    document.getElementById("totalUsers");

  var totalRequestsElement =
    document.getElementById("totalRequests");

  var openRequestsElement =
    document.getElementById("openRequests");


  // USERS

  db.collection("users")
    .get()
    .then(function(snapshot) {

      if (totalUsersElement) {
        totalUsersElement.textContent = snapshot.size;
      }

    })
    .catch(function(error) {

      console.error("Users stats error:", error);

      if (totalUsersElement) {
        totalUsersElement.textContent = "—";
      }

    });


  // REQUESTS

  db.collection("requests")
    .get()
    .then(function(snapshot) {

      if (totalRequestsElement) {
        totalRequestsElement.textContent = snapshot.size;
      }

      var openCount = 0;

      snapshot.forEach(function(doc) {

        var data = doc.data() || {};

        if (String(data.status || "").toLowerCase() === "open") {
          openCount++;
        }

      });

      if (openRequestsElement) {
        openRequestsElement.textContent = openCount;
      }

    })
    .catch(function(error) {

      console.error("Request stats error:", error);

      if (totalRequestsElement) {
        totalRequestsElement.textContent = "—";
      }

      if (openRequestsElement) {
        openRequestsElement.textContent = "—";
      }

    });

}


// ------------------------------------------------------
// LOAD USERS
// ------------------------------------------------------

function loadUsers() {

  var usersList = document.getElementById("usersList");

  if (!usersList) return;

  usersList.innerHTML =
    '<div class="loading-state">Loading users...</div>';


  db.collection("users")
    .get()
    .then(function(snapshot) {

      allUsers = [];

      snapshot.forEach(function(doc) {

        var data = doc.data() || {};

        allUsers.push({
          id: doc.id,
          name: data.name || data.fullName || "Unnamed user",
          email: data.email || "No email",
          role: data.role || "user",
          skill: data.skill || data.skills || "No skill added",
          createdAt: data.createdAt || null
        });

      });


      // Newest users first
      allUsers.sort(function(a, b) {

        var dateA = getTimestamp(a.createdAt);
        var dateB = getTimestamp(b.createdAt);

        return dateB - dateA;

      });


      renderUsers(allUsers);

    })
    .catch(function(error) {

      console.error("Error loading users:", error);

      usersList.innerHTML =
        '<div class="empty-state">' +
        'Unable to load users right now.' +
        '</div>';

    });

}


// ------------------------------------------------------
// RENDER USERS
// ------------------------------------------------------

function renderUsers(users) {

  var usersList = document.getElementById("usersList");

  if (!usersList) return;


  if (!users.length) {

    usersList.innerHTML =
      '<div class="empty-state">' +
      'No users found.' +
      '</div>';

    return;

  }


  var html = "";


  users.forEach(function(user) {

    var role = String(user.role || "user");

    html +=
      '<div class="admin-list-item">' +

        '<div class="item-main">' +

          '<div class="item-title">' +
            escapeHTML(user.name) +
          '</div>' +

          '<div class="item-meta">' +
            escapeHTML(user.email) +
            '<br>' +
            'Skill: ' +
            escapeHTML(String(user.skill)) +
          '</div>' +

        '</div>' +

        '<div class="item-actions">' +

          '<span class="badge badge-accepted">' +
            escapeHTML(role) +
          '</span>' +

        '</div>' +

      '</div>';

  });


  usersList.innerHTML = html;

}


// ------------------------------------------------------
// USER SEARCH
// ------------------------------------------------------

function filterUsers() {

  var searchInput =
    document.getElementById("userSearch");

  if (!searchInput) return;


  var search =
    searchInput.value
      .toLowerCase()
      .trim();


  if (!search) {

    renderUsers(allUsers);
    return;

  }


  var filteredUsers =
    allUsers.filter(function(user) {

      var text =
        (
          user.name +
          " " +
          user.email +
          " " +
          user.role +
          " " +
          user.skill
        ).toLowerCase();

      return text.includes(search);

    });


  renderUsers(filteredUsers);

}


// ------------------------------------------------------
// LOAD REQUESTS
// ------------------------------------------------------

function loadRequests() {

  var requestsList =
    document.getElementById("requestsList");

  if (!requestsList) return;


  requestsList.innerHTML =
    '<div class="loading-state">Loading requests...</div>';


  db.collection("requests")
    .get()
    .then(function(snapshot) {

      allRequests = [];


      snapshot.forEach(function(doc) {

        var data = doc.data() || {};

        allRequests.push({

          id: doc.id,

          title:
            data.title ||
            data.helpTitle ||
            "Untitled request",

          description:
            data.description ||
            data.details ||
            "No description",

          category:
            data.category ||
            "General",

          skill:
            data.skill ||
            "Not specified",

          status:
            data.status ||
            "unknown",

          requesterName:
            data.requesterName ||
            data.userName ||
            "Unknown user",

          createdAt:
            data.createdAt ||
            null

        });

      });


      // Newest first
      allRequests.sort(function(a, b) {

        var dateA = getTimestamp(a.createdAt);
        var dateB = getTimestamp(b.createdAt);

        return dateB - dateA;

      });


      renderRequests(allRequests);

    })
    .catch(function(error) {

      console.error("Error loading requests:", error);

      requestsList.innerHTML =
        '<div class="empty-state">' +
        'Unable to load requests right now.' +
        '</div>';

    });

}


// ------------------------------------------------------
// RENDER REQUESTS
// ------------------------------------------------------

function renderRequests(requests) {

  var requestsList =
    document.getElementById("requestsList");

  if (!requestsList) return;


  if (!requests.length) {

    requestsList.innerHTML =
      '<div class="empty-state">' +
      'No requests found.' +
      '</div>';

    return;

  }


  var html = "";


  requests.forEach(function(request) {

    var status =
      String(request.status || "unknown").toLowerCase();


    var badgeClass =
      "badge-completed";


    if (status === "open") {
      badgeClass = "badge-open";
    }

    if (status === "accepted") {
      badgeClass = "badge-accepted";
    }


    html +=

      '<div class="admin-list-item">' +

        '<div class="item-main">' +

          '<div class="item-title">' +
            escapeHTML(request.title) +
          '</div>' +

          '<div class="item-meta">' +

            escapeHTML(request.description) +

            '<br><br>' +

            '<strong>Category:</strong> ' +
            escapeHTML(request.category) +

            ' &nbsp; | &nbsp; ' +

            '<strong>Skill:</strong> ' +
            escapeHTML(request.skill) +

            '<br>' +

            '<strong>Requester:</strong> ' +
            escapeHTML(request.requesterName) +

          '</div>' +

        '</div>' +

        '<div class="item-actions">' +

          '<span class="badge ' +
          badgeClass +
          '">' +

            escapeHTML(status) +

          '</span>' +

        '</div>' +

      '</div>';

  });


  requestsList.innerHTML = html;

}


// ------------------------------------------------------
// REQUEST SEARCH
// ------------------------------------------------------

function filterRequests() {

  var searchInput =
    document.getElementById("requestSearch");

  if (!searchInput) return;


  var search =
    searchInput.value
      .toLowerCase()
      .trim();


  if (!search) {

    renderRequests(allRequests);
    return;

  }


  var filteredRequests =
    allRequests.filter(function(request) {

      var text =
        (
          request.title +
          " " +
          request.description +
          " " +
          request.category +
          " " +
          request.skill +
          " " +
          request.status +
          " " +
          request.requesterName
        ).toLowerCase();

      return text.includes(search);

    });


  renderRequests(filteredRequests);

}


// ------------------------------------------------------
// DASHBOARD NAVIGATION
// ------------------------------------------------------

function showSection(section) {

  var title =
    document.getElementById("adminPageTitle");


  var usersSection =
    document.getElementById("users");

  var requestsSection =
    document.getElementById("requests");

  var dashboardSection =
    document.getElementById("dashboardSection");


  if (section === "dashboard") {

    if (dashboardSection) {
      dashboardSection.scrollIntoView({
        behavior: "smooth"
      });
    }

    if (title) {
      title.textContent = "Dashboard";
    }

  }


  if (section === "users") {

    if (usersSection) {
      usersSection.scrollIntoView({
        behavior: "smooth"
      });
    }

    if (title) {
      title.textContent = "Users";
    }

  }


  if (section === "requests") {

    if (requestsSection) {
      requestsSection.scrollIntoView({
        behavior: "smooth"
      });
    }

    if (title) {
      title.textContent = "Requests";
    }

  }


  // Update active navigation button

  var buttons =
    document.querySelectorAll(".admin-nav button");


  buttons.forEach(function(button) {
    button.classList.remove("active");
  });


  if (section === "dashboard" && buttons[0]) {
    buttons[0].classList.add("active");
  }

  if (section === "users" && buttons[1]) {
    buttons[1].classList.add("active");
  }

  if (section === "requests" && buttons[2]) {
    buttons[2].classList.add("active");
  }

}


// ------------------------------------------------------
// REFRESH
// ------------------------------------------------------

function refreshDashboard() {

  loadDashboardStats();
  loadUsers();
  loadRequests();

}


// ------------------------------------------------------
// ADMIN LOGOUT
// ------------------------------------------------------

function adminLogout() {

  var confirmed =
    confirm("Are you sure you want to logout?");


  if (!confirmed) return;


  localStorage.removeItem("isAdminLoggedIn");
  localStorage.removeItem("adminEmail");


  auth.signOut()
    .then(function() {

      window.location.href = "login.html";

    })
    .catch(function(error) {

      console.error("Logout error:", error);

      window.location.href = "login.html";

    });

}


// ------------------------------------------------------
// SAFE HTML
// ------------------------------------------------------

function escapeHTML(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


// ------------------------------------------------------
// FIRESTORE TIMESTAMP HELPER
// ------------------------------------------------------

function getTimestamp(value) {

  if (!value) return 0;


  if (value.toDate) {
    return value.toDate().getTime();
  }


  if (value.seconds) {
    return value.seconds * 1000;
  }


  var date =
    new Date(value).getTime();


  return isNaN(date) ? 0 : date;

}


// ------------------------------------------------------
// STARTUP
// ------------------------------------------------------

document.addEventListener("DOMContentLoaded", function() {

  // Dashboard starts hidden until Firebase
  // confirms administrator access.

});
