// =========================================================
// NEIGHBOURLY — MAIN APPLICATION SCRIPT
// =========================================================

// =========================================================
// FIREBASE CONFIGURATION
// =========================================================

var firebaseConfig = {
  apiKey: "AIzaSyAWWS_hRRX3XrbSHQgUqd6YYnVtAtfbO3w",
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
// =========================================================
// WELCOME PAGE REDIRECT
// =========================================================

auth.onAuthStateChanged(function(user) {
  var path = window.location.pathname;

  var isDashboard =
    path.endsWith("/index.html") ||
    path.endsWith("/help-neighbour/") ||
    path.endsWith("/help-neighbour");
    
  var isLogin = path.endsWith("/login.html");

  // If the user is NOT logged in and is trying to view the dashboard OR the login page, 
  // send them to the welcome page instead!
  if (!user && (isDashboard || isLogin)) {
    window.location.href = "welcome.html";
  }
});


// =========================================================
// GLOBAL VARIABLES
// =========================================================

var currentUser = null;

var map = null;
var userMarker = null;
var requestMarkers = [];
var allOpenRequests = [];

var ratingTargetRequestId = null;
var currentRating = 0;

var currentChatRequestId = null;
var chatUnsubscribe = null;

var defaultLatitude = null;
var defaultLongitude = null;
var locationReady = false;
var locationWatchId = null;

function setUserLocation(latitude, longitude) {
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number"
  ) {
    return false;
  }

  defaultLatitude = latitude;
  defaultLongitude = longitude;
  locationReady = true;

  if (map) {
    map.setView([latitude, longitude], 14);

    if (userMarker) {
      map.removeLayer(userMarker);
    }

    userMarker = L.marker([latitude, longitude])
      .addTo(map)
      .bindPopup("<strong>You are here</strong>");
  }

  filterRequests();

  return true;
}


function getCurrentUserLocation() {
  return new Promise(function(resolve, reject) {

    if (!navigator.geolocation) {
      reject(
        new Error("Location is not supported on this device.")
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(

      function(position) {

        var latitude = position.coords.latitude;
        var longitude = position.coords.longitude;

        setUserLocation(latitude, longitude);

        resolve({
          latitude: latitude,
          longitude: longitude
        });
      },

      function(error) {

        var message = "Unable to get your location.";

        if (error && error.code === 1) {
          message =
            "Location permission was denied. Please allow location access for Neighbourly.";
        }

        else if (error && error.code === 2) {
          message =
            "Your location is currently unavailable.";
        }

        else if (error && error.code === 3) {
          message =
            "Location request timed out. Please try again.";
        }

        reject(new Error(message));
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  });
}

var profileCache = {};
var helperAvailable = false;


// =========================================================
// UTILITY FUNCTIONS
// =========================================================

function escapeHTML(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function formatDate(timestamp) {
  if (!timestamp) {
    return "Just now";
  }

  try {
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleString();
    }

    return new Date(timestamp).toLocaleString();
  } catch (error) {
    return "Recently";
  }
}


function showNotification(message, type) {
  type = type || "success";

  var oldToast =
    document.querySelector(".notification-toast");

  if (oldToast) {
    oldToast.remove();
  }

  var toast =
    document.createElement("div");

  toast.className =
    "notification-toast";

  if (type === "error") {
    toast.style.background = "#dc2626";
  } else if (type === "warning") {
    toast.style.background = "#d97706";
  } else if (type === "info") {
    toast.style.background = "#0284c7";
  } else {
    toast.style.background = "#0f766e";
  }

  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(function () {
    if (toast && toast.parentNode) {
      toast.style.opacity = "0";
      toast.style.transform =
        "translateY(10px)";

      setTimeout(function () {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 250);
    }
  }, 3500);
}


function getBase64(file) {
  return new Promise(function (resolve, reject) {

    if (!file) {
      reject(new Error("No file selected."));
      return;
    }

    var reader =
      new FileReader();

    reader.onload =
      function () {
        resolve(reader.result);
      };

    reader.onerror =
      function (error) {
        reject(error);
      };

    reader.readAsDataURL(file);
  });
}


function getRequestCoordinates(data) {
  var lat = data.latitude;
  var lng = data.longitude;

  if (
    (typeof lat !== "number" ||
      typeof lng !== "number") &&
    data.location
  ) {
    lat = data.location.latitude;
    lng = data.location.longitude;
  }

  if (
    typeof lat !== "number" ||
    typeof lng !== "number"
  ) {
    return null;
  }

  return {
    latitude: lat,
    longitude: lng
  };
}
function normalizeSkill(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}


function helperHasSkill(helperSkill, requestedSkill) {

  var wantedSkill =
    normalizeSkill(requestedSkill);

  // If requester did not specify a skill,
  // any available helper can be considered.
  if (!wantedSkill) {
    return true;
  }

  var skills = Array.isArray(helperSkill)
    ? helperSkill
    : String(helperSkill || "").split(",");

  return skills.some(function (skill) {

    return normalizeSkill(skill) === wantedSkill;

  });
}


function calculateDistance(
  lat1,
  lon1,
  lat2,
  lon2
) {
  var earthRadius = 6371;

  var dLat =
    (lat2 - lat1) *
    Math.PI / 180;

  var dLon =
    (lon2 - lon1) *
    Math.PI / 180;

  var a =
    Math.sin(dLat / 2) *
    Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  var c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return earthRadius * c;
}


function getDistanceLimit(value) {
  if (!value || value === "all") {
    return null;
  }

  var number =
    parseFloat(value);

  return isNaN(number)
    ? null
    : number;
}


// =========================================================
// PROFILE AVATAR HELPERS
// =========================================================

function getUserInitial(name) {

  var value =
    String(name || "N").trim();

  if (!value) {
    return "N";
  }

  var initial =
    value.charAt(0).toUpperCase();

  if (!/[A-Z0-9]/.test(initial)) {
    return "N";
  }

  return initial;
}


function createInitialAvatar(name) {

  var initial =
    getUserInitial(name);

  var svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">' +
    '<rect width="200" height="200" rx="100" fill="#ccfbf1"/>' +
    '<text x="100" y="125" text-anchor="middle" ' +
    'font-size="90" font-family="Arial,sans-serif" ' +
    'font-weight="700" fill="#0f766e">' +
    initial +
    '</text>' +
    '</svg>';

  return "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(svg);
}


function setupProfileImageElement(
  imageElement,
  photo,
  name
) {

  if (!imageElement) {
    return;
  }

  imageElement.style.width = "85px";
  imageElement.style.height = "85px";
  imageElement.style.borderRadius = "50%";
  imageElement.style.objectFit = "cover";
  imageElement.style.display = "block";
  imageElement.style.background = "#ccfbf1";

  imageElement.alt =
    (name || "Neighbour") +
    " profile photo";

  var fallback =
    createInitialAvatar(name);

  imageElement.onerror =
    function () {

      imageElement.onerror = null;
      imageElement.src = fallback;

    };

  imageElement.src =
    photo || fallback;
}


function setupProfileAvatarContainer(
  container,
  photo,
  name
) {

  if (!container) {
    return;
  }

  container.innerHTML = "";

  container.style.width = "85px";
  container.style.height = "85px";
  container.style.borderRadius = "50%";
  container.style.overflow = "hidden";
  container.style.margin = "0 auto 15px";
  container.style.background = "#ccfbf1";
  container.style.display = "flex";
  container.style.alignItems = "center";
  container.style.justifyContent = "center";

  if (photo) {

    var image =
      document.createElement("img");

    image.src = photo;

    image.alt =
      (name || "Neighbour") +
      " profile photo";

    image.style.width = "100%";
    image.style.height = "100%";
    image.style.objectFit = "cover";
    image.style.borderRadius = "50%";
    image.style.display = "block";

    image.onerror =
      function () {

        container.innerHTML = "";

        var fallback =
          document.createElement("img");

        fallback.src =
          createInitialAvatar(name);

        fallback.alt =
          "Profile avatar";

        fallback.style.width = "100%";
        fallback.style.height = "100%";
        fallback.style.objectFit = "cover";
        fallback.style.borderRadius = "50%";

        container.appendChild(
          fallback
        );
      };

    container.appendChild(
      image
    );

  } else {

    var fallbackImage =
      document.createElement("img");

    fallbackImage.src =
      createInitialAvatar(name);

    fallbackImage.alt =
      "Profile avatar";

    fallbackImage.style.width = "100%";
    fallbackImage.style.height = "100%";
    fallbackImage.style.objectFit = "cover";
    fallbackImage.style.borderRadius = "50%";

    container.appendChild(
      fallbackImage
    );
  }
}


// =========================================================
// AUTHENTICATION
// =========================================================

auth.onAuthStateChanged(function (user) {

  if (!user) {
    currentUser = null;
    window.location.href = "login.html";
    return;
  }

  currentUser = user;

  loadUserProfile();
  listenToOpenRequests();
  listenToActiveJobs();
  listenToNotifications();
  checkAdminAccess();

});


// =========================================================
// USER PROFILE
// =========================================================

function loadUserProfile() {

  if (!currentUser) {
    return;
  }

  db.collection("users")
    .doc(currentUser.uid)
    .get()
    .then(function (doc) {

      if (!doc.exists) {
        console.warn("User profile not found.");
        return;
      }

      var data = doc.data();

      profileCache[currentUser.uid] = data;

      var name =
        data.fullName ||
        currentUser.displayName ||
        "Neighbour";

      var email =
        data.email ||
        currentUser.email ||
        "";

      var photo =
        data.profilePhoto ||
        currentUser.photoURL ||
        "";

      var skill =
        data.skill ||
        data.skills ||
        "No skill added";

      var role =
        data.role ||
        "requester";
      helperAvailable =
  data.available === true;

      var nameElement =
        document.getElementById("userName");

      var emailElement =
        document.getElementById("userEmail");

      var initialElement =
        document.getElementById("userInitial");

      var skillElement =
        document.getElementById("userSkill");

      var roleElement =
        document.getElementById("userRole");

      var statusElement =
        document.getElementById("userStatus");

      if (nameElement) {
        nameElement.textContent = name;
      }

      if (emailElement) {
        emailElement.textContent = email;
      }

      if (skillElement) {
        skillElement.textContent =
          "Skill: " + skill;
      }

      if (roleElement) {
        roleElement.textContent =
          "Role: " + role;
      }

      if (statusElement) {
        statusElement.textContent =
          "● Online";
      }
     // Setup helper availability controls
setupHelperAvailability(); 


      // =========================================
      // SAVE CURRENT PROFILE DATA
      // =========================================

      profileCache[currentUser.uid] = {

        ...data,

        fullName: name,
        email: email,
        skill: skill,
        role: role

      };


      // =========================================
      // FIXED PROFILE PHOTO
      // =========================================

      if (initialElement) {

        setupProfileImageElement(
          initialElement,
          photo,
          name
        );

      }

      var editPhoto =
        document.getElementById(
          "editProfilePhoto"
        );

      if (editPhoto) {
        editPhoto.value = "";
      }

      setupProfilePhotoPreview();


      // =========================================
      // HELPER LOCATION + AVAILABILITY
      // =========================================

      if (
        role === "helper" ||
        role === "both"
      ) {

        updateHelperLocation();

      }

    })
    .catch(function (error) {

      console.error(
        "Error loading profile:",
        error
      );

    });
}

function updateHelperLocation() {

  if (!currentUser) {
    return;
  }

  if (!navigator.geolocation) {
    console.warn(
      "Geolocation is not supported on this device."
    );
    return;
  }

  // Stop any previous location watcher
  if (locationWatchId !== null) {

    navigator.geolocation.clearWatch(
      locationWatchId
    );

    locationWatchId = null;
  }

  // Watch the helper's location continuously
  locationWatchId =
    navigator.geolocation.watchPosition(

      function(position) {

        var latitude =
          position.coords.latitude;

        var longitude =
          position.coords.longitude;

        console.log(
          "Helper location updated:",
          latitude,
          longitude
        );

        // Update the user's own map location
        setUserLocation(
          latitude,
          longitude
        );

        // Save the latest helper location
        db.collection("users")
          .doc(currentUser.uid)
          .update({

            latitude:
              latitude,

            longitude:
              longitude,

            locationUpdatedAt:
              firebase.firestore
                .FieldValue
                .serverTimestamp(),

            online:
              true

          })
          .catch(function(error) {

            console.error(
              "Unable to update helper location:",
              error
            );

          });

      },

      function(error) {

        console.warn(
          "Helper location error:",
          error
        );

      },

      {

        enableHighAccuracy:
          true,

        timeout:
          15000,

        maximumAge:
          10000

      }
    );
}

// =========================================================
// PROFILE PHOTO PREVIEW
// =========================================================

function setupProfilePhotoPreview() {

  var input =
    document.getElementById(
      "editProfilePhoto"
    );

  if (!input) {
    return;
  }

  if (input.dataset.previewReady === "true") {
    return;
  }

  input.dataset.previewReady = "true";

  var preview =
    document.getElementById(
      "profilePhotoPreview"
    );

  if (!preview) {

    preview =
      document.createElement("img");

    preview.id =
      "profilePhotoPreview";

    preview.alt =
      "Selected profile photo";

    preview.style.width =
      "80px";

    preview.style.height =
      "80px";

    preview.style.borderRadius =
      "50%";

    preview.style.objectFit =
      "cover";

    preview.style.display =
      "none";

    preview.style.margin =
      "10px auto";

    preview.style.border =
      "3px solid #ccfbf1";

    input.parentNode.appendChild(
      preview
    );
  }

  input.addEventListener(
    "change",
    function () {

      var file =
        input.files &&
        input.files.length
          ? input.files[0]
          : null;

      if (!file) {

        preview.style.display =
          "none";

        preview.removeAttribute(
          "src"
        );

        return;
      }

      if (
        file.size >
        2 * 1024 * 1024
      ) {

        showNotification(
          "Profile photo must be smaller than 2MB.",
          "warning"
        );

        input.value = "";

        preview.style.display =
          "none";

        return;
      }

      if (
        !file.type ||
        file.type.indexOf("image/") !== 0
      ) {

        showNotification(
          "Please select a valid image file.",
          "warning"
        );

        input.value = "";

        preview.style.display =
          "none";

        return;
      }

      var reader =
        new FileReader();

      reader.onload =
        function (event) {

          preview.src =
            event.target.result;

          preview.style.display =
            "block";

        };

      reader.readAsDataURL(file);

    }
  );
}


// =========================================================
// ADMIN ACCESS
// =========================================================

function checkAdminAccess() {

  if (!currentUser) {
    return;
  }

  var adminButton =
    document.getElementById(
      "adminDashboardBtn"
    );

  if (adminButton) {
    adminButton.style.display = "none";
  }

  db.collection("users")
    .doc(currentUser.uid)
    .get()
    .then(function (doc) {

      if (!doc.exists) {
        return;
      }

      var data = doc.data();

      if (
        data.role === "admin" ||
        currentUser.email ===
          "samuelchosen57@gmail.com"
      ) {

        if (adminButton) {
          adminButton.style.display = "block";
        }

      }

    })
    .catch(function (error) {

      console.error(
        "Admin check error:",
        error
      );

    });
}


// =========================================================
// REQUEST MODAL
// =========================================================

function openModal() {

  var modal =
    document.getElementById(
      "requestModal"
    );

  if (!modal) {
    return;
  }

  modal.classList.add("active");
  modal.classList.add("show");

  document.body.style.overflow =
    "hidden";
}


function closeModal() {

  var modal =
    document.getElementById(
      "requestModal"
    );

  if (!modal) {
    return;
  }

  modal.classList.remove("active");
  modal.classList.remove("show");

  document.body.style.overflow =
    "";
}


// =========================================================
// REQUEST HELP
// =========================================================

function setupRequestForm() {

  var requestForm =
    document.getElementById(
      "createRequestForm"
    );

  if (!requestForm) {
    return;
  }

  requestForm.addEventListener(
    "submit",
    async function (event) {

      event.preventDefault();

      if (!currentUser) {

        showNotification(
          "Please login first.",
          "error"
        );

        return;
      }

      var titleElement =
        document.getElementById("reqTitle");

      var categoryElement =
        document.getElementById("reqCategory");

      var skillElement =
        document.getElementById("reqSkill");

      var descriptionElement =
        document.getElementById("reqDescription");

      var imageInput =
        document.getElementById("reqImage");

      var title =
        titleElement
          ? titleElement.value.trim()
          : "";

      var category =
        categoryElement
          ? categoryElement.value
          : "";

      var skillNeeded =
        skillElement
          ? skillElement.value.trim()
          : "";

      var description =
        descriptionElement
          ? descriptionElement.value.trim()
          : "";

      if (!title || !category || !description) {

        showNotification(
          "Please complete all required fields.",
          "error"
        );

        return;
      }

      var submitButton =
        requestForm.querySelector(
          'button[type="submit"]'
        );

      var originalText =
        submitButton
          ? submitButton.textContent
          : "Post Request";

      if (submitButton) {

        submitButton.disabled = true;

        submitButton.textContent =
          "Posting...";

      }

      try {

        var userDoc =
          await db.collection("users")
            .doc(currentUser.uid)
            .get();

        var userData =
          userDoc.exists
            ? userDoc.data()
            : {};

      var location;

try {

  location =
    await getCurrentUserLocation();

} catch (locationError) {

  showNotification(
    locationError.message,
    "error"
  );

  return;
}

var latitude =
  location.latitude;

var longitude =
  location.longitude; 

        var imageBase64 = "";

        if (
          imageInput &&
          imageInput.files &&
          imageInput.files.length > 0
        ) {

          imageBase64 =
            await getBase64(
              imageInput.files[0]
            );
        }

        var requestData = {

          title: title,

          category: category,

          skillNeeded: skillNeeded,

          description: description,

          image: imageBase64,

          location:
            new firebase.firestore.GeoPoint(
              latitude,
              longitude
            ),

          latitude: latitude,

          longitude: longitude,

          userId:
            currentUser.uid,

          userName:
            userData.fullName ||
            currentUser.displayName ||
            "Neighbour",

          userEmail:
            currentUser.email || "",

          status: "open",

          createdAt:
            firebase.firestore.FieldValue
              .serverTimestamp()

        };

       var requestRef = await db.collection("requests")
  .add(requestData);

requestData.requestId = requestRef.id;

requestForm.reset();

closeModal();

showNotification(
  "Your help request has been posted successfully."
);

// Find suitable helpers for this request
findSuggestedHelpers(requestData);
      } catch (error) {

        console.error(
          "Request creation error:",
          error
        );

        showNotification(
          error.message ||
          "Unable to post request. Please try again.",
          "error"
        );

      } finally {

        if (submitButton) {

          submitButton.disabled = false;

          submitButton.textContent =
            originalText;

        }

      }

    }
  );
}


// =========================================================
// OPEN REQUESTS
// =========================================================

function listenToOpenRequests() {

  if (!currentUser) {
    return;
  }

  db.collection("requests")
    .where("status", "==", "open")
    .onSnapshot(
      function (snapshot) {

        allOpenRequests = [];

        snapshot.forEach(
          function (doc) {

            allOpenRequests.push({
              id: doc.id,
              data: doc.data()
            });

          }
        );

        filterRequests();

      },
      function (error) {

        console.error(
          "Requests listener error:",
          error
        );

        showNotification(
          "Unable to load help requests.",
          "error"
        );

      }
    );
}


// =========================================================
// REQUEST FILTERING
// =========================================================

function filterRequests() {

  var list =
    document.getElementById(
      "request-list"
    );

  if (!list) {
    return;
  }

  var categoryElement =
    document.getElementById(
      "categoryFilter"
    );

  var distanceElement =
    document.getElementById(
      "distanceFilter"
    );

  var category =
    categoryElement
      ? categoryElement.value
      : "all";

  var distance =
    distanceElement
      ? distanceElement.value
      : "all";

  var distanceLimit =
    getDistanceLimit(distance);

  list.innerHTML = "";

  var requests =
    allOpenRequests.filter(
      function (item) {

        var data = item.data;

        if (
          category !== "all" &&
          category &&
          data.category !== category
        ) {
          return false;
        }

        if (distanceLimit !== null) {

          var coordinates =
            getRequestCoordinates(data);

          if (!coordinates) {
            return false;
          }

          var requestDistance =
            calculateDistance(
              defaultLatitude,
              defaultLongitude,
              coordinates.latitude,
              coordinates.longitude
            );

          if (
            requestDistance >
            distanceLimit
          ) {
            return false;
          }

        }

        return true;

      }
    );

  if (requests.length === 0) {

    list.innerHTML =
      '<div class="request-card">' +
      "<h3>No requests found</h3>" +
      "<p>There are currently no matching help requests.</p>" +
      "</div>";

    clearRequestMarkers();

    return;
  }

  clearRequestMarkers();

  requests.forEach(
    function (item) {

      renderRequestCard(
        item.id,
        item.data
      );

      addRequestMarker(
        item.id,
        item.data
      );

    }
  );
}


// =========================================================
// REQUEST CARD
// =========================================================

function renderRequestCard(
  requestId,
  data
) {

  var list =
    document.getElementById(
      "request-list"
    );

  if (!list) {
    return;
  }

  var card =
    document.createElement("div");

  card.className =
    "request-card";

  var imageHTML = "";

  if (data.image) {

    imageHTML =
      '<img src="' +
      escapeHTML(data.image) +
      '" alt="Request image" loading="lazy">';

  }

  var skillText =
    data.skillNeeded ||
    "Any suitable helper";

  var distanceText = "";

  var coordinates =
    getRequestCoordinates(data);

  if (coordinates) {

    var distance =
      calculateDistance(
        defaultLatitude,
        defaultLongitude,
        coordinates.latitude,
        coordinates.longitude
      );

    distanceText =
      "<p><strong>Distance:</strong> " +
      distance.toFixed(1) +
      " km away</p>";
  }

  card.innerHTML =

    "<h3>" +
    escapeHTML(data.title) +
    "</h3>" +

    "<p><strong>Category:</strong> " +
    escapeHTML(
      data.category || "General"
    ) +
    "</p>" +

    "<p><strong>Skill needed:</strong> " +
    escapeHTML(skillText) +
    "</p>" +

    distanceText +

    "<p>" +
    escapeHTML(
      data.description || ""
    ) +
    "</p>" +

    imageHTML +

    "<p><small>Posted by " +
    escapeHTML(
      data.userName || "Neighbour"
    ) +
    "</small></p>" +

    '<button class="btn btn-primary accept-request-btn" ' +
    'data-id="' +
    escapeHTML(requestId) +
    '">' +
    "Accept Request" +
    "</button>";

  list.appendChild(card);

  var acceptButton =
    card.querySelector(
      ".accept-request-btn"
    );

  if (acceptButton) {

    acceptButton.addEventListener(
      "click",
      function () {

        acceptRequest(requestId);

      }
    );
  }
}


// =========================================================
// MAP INITIALIZATION
// =========================================================

function initializeMap() {

  var mapElement = document.getElementById("map");

  if (!mapElement) {
    return;
  }

  // Start with a neutral Nigeria-wide view.
  // This is NOT treated as the user's location.
  map = L.map("map").setView([9.0820, 8.6753], 6);

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution: "&copy; OpenStreetMap contributors"
    }
  ).addTo(map);

  // Get the user's real GPS location
  getCurrentUserLocation()
    .then(function(location) {

      console.log(
        "User location:",
        location.latitude,
        location.longitude
      );

    })
    .catch(function(error) {

      console.warn(
        "Could not get user's location:",
        error.message
      );

      if (typeof showNotification === "function") {
        showNotification(
          error.message,
          "error"
        );
      }
    });
}

// =========================================================
// MAP REQUEST MARKERS
// =========================================================

function addRequestMarker(
  requestId,
  data
) {

  if (!map) {
    return;
  }

  var coordinates =
    getRequestCoordinates(data);

  if (!coordinates) {
    return;
  }

  var marker =
    L.marker([
      coordinates.latitude,
      coordinates.longitude
    ]).addTo(map);

  var popupHTML =

    "<strong>" +
    escapeHTML(data.title) +
    "</strong><br>" +

    escapeHTML(
      data.description || ""
    ) +

    "<br><br>" +

    "<small>Posted by " +
    escapeHTML(
      data.userName || "Neighbour"
    ) +
    "</small><br><br>" +

    '<button class="map-accept-button" ' +
    'data-request-id="' +
    escapeHTML(requestId) +
    '">' +
    "Accept Request" +
    "</button>";

  marker.bindPopup(popupHTML);

  marker.on(
    "popupopen",
    function () {

      var popupElement =
        marker.getPopup().getElement();

      if (!popupElement) {
        return;
      }

      var button =
        popupElement.querySelector(
          ".map-accept-button"
        );

      if (button) {

        button.addEventListener(
          "click",
          function () {

            acceptRequest(requestId);

          }
        );

      }

    }
  );

  requestMarkers.push(marker);
}


function clearRequestMarkers() {

  requestMarkers.forEach(
    function (marker) {

      if (map) {
        map.removeLayer(marker);
      }

    }
  );

  requestMarkers = [];
}


// =========================================================
// ACCEPT REQUEST
// =========================================================
async function acceptRequest(requestId) {

  if (!currentUser) {
    showNotification(
      "Please login first.",
      "error"
    );
    return;
  }

  try {

    var requestRef =
      db.collection("requests")
        .doc(requestId);

    var helperRef =
      db.collection("users")
        .doc(currentUser.uid);

    await db.runTransaction(
      async function (transaction) {

        var requestDoc =
          await transaction.get(requestRef);

        var helperDoc =
          await transaction.get(helperRef);

        if (!requestDoc.exists) {
          throw new Error(
            "This help request no longer exists."
          );
        }

        if (!helperDoc.exists) {
          throw new Error(
            "Your helper profile could not be found."
          );
        }

        var requestData =
          requestDoc.data();

        var helperData =
          helperDoc.data();

        // Request must still be open
        if (
          requestData.status !== "open"
        ) {
          throw new Error(
            "This request has already been taken."
          );
        }

        // If Neighbourly automatically selected a helper,
        // only that helper can accept it.
        if (
          requestData.requestedHelperId &&
          requestData.requestedHelperId !== currentUser.uid
        ) {
          throw new Error(
            "This request has been assigned to another helper."
          );
        }

        // Helper must be available
        if (
          helperData.available !== true &&
          requestData.requestedHelperId !== currentUser.uid
        ) {
          throw new Error(
            "You are currently unavailable."
          );
        }

        var helperSkill =
          helperData.skill ||
          helperData.skills ||
          "";

        var requestedSkill =
          requestData.skillNeeded ||
          "";

        if (
          !helperHasSkill(
            helperSkill,
            requestedSkill
          )
        ) {
          throw new Error(
            "This request requires a different skill."
          );
        }

        // Accept the request
        transaction.update(
          requestRef,
          {

            status:
              "accepted",

            acceptedBy:
              currentUser.uid,

            acceptedByName:
              helperData.fullName ||
              currentUser.displayName ||
              "Helper",

            acceptedAt:
              firebase.firestore
                .FieldValue
                .serverTimestamp()

          }
        );

        // Keep helper busy while handling this job
        transaction.update(
          helperRef,
          {

            available:
              false,

            availability:
              "busy",

            busy:
              true,

            currentRequestId:
              requestId

          }
        );

      }
    );

    // Notify requester
    var requestSnapshot =
      await requestRef.get();

    if (requestSnapshot.exists) {

      var requestData =
        requestSnapshot.data();

      if (requestData.userId) {

        await db.collection("users")
          .doc(requestData.userId)
          .collection("notifications")
          .add({

            type:
              "accepted",

            title:
              "Helper Found",

            message:
              (
                currentUser.displayName ||
                "A nearby helper"
              ) +
              " has accepted your help request.",

            requestId:
              requestId,

            read:
              false,

            createdAt:
              firebase.firestore
                .FieldValue
                .serverTimestamp()

          });
      }
    }

    showNotification(
      "Help request accepted successfully."
    );

    listenToActiveJobs();

  } catch (error) {

    console.error(
      "Accept request error:",
      error
    );

    showNotification(
      error.message ||
      "Unable to accept this request.",
      "error"
    );
  }
}
// =========================================================
// ACTIVE JOBS
// =========================================================

function listenToActiveJobs() {

  if (!currentUser) {
    return;
  }

  db.collection("requests")
    .where("acceptedBy", "==", currentUser.uid)
    .onSnapshot(
      function (snapshot) {

        var activeJobsList =
          document.getElementById(
            "active-jobs-list"
          );

        if (!activeJobsList) {
          return;
        }

        activeJobsList.innerHTML = "";

        if (snapshot.empty) {

          activeJobsList.innerHTML =
            '<div class="request-card">' +
            "<h3>No active jobs</h3>" +
            "<p>You have no accepted help requests at the moment.</p>" +
            "</div>";

          return;
        }

        snapshot.forEach(
          function (doc) {

            var data = doc.data();

            var card =
              document.createElement("div");

            card.className =
              "request-card";

            var statusText =
              data.status === "completed"
                ? "Completed"
                : "Accepted";

            card.innerHTML =

              "<h3>" +
              escapeHTML(
                data.title || "Help Request"
              ) +
              "</h3>" +

              "<p><strong>Category:</strong> " +
              escapeHTML(
                data.category || "General"
              ) +
              "</p>" +

              "<p><strong>Description:</strong> " +
              escapeHTML(
                data.description || ""
              ) +
              "</p>" +

              "<p><strong>Requester:</strong> " +
              escapeHTML(
                data.userName || "Neighbour"
              ) +
              "</p>" +

              "<p><strong>Status:</strong> " +
              escapeHTML(statusText) +
              "</p>" +

              (
                data.status === "accepted"
                  ?

                    '<button class="btn btn-primary mark-done-btn" ' +
                    'data-request-id="' +
                    escapeHTML(doc.id) +
                    '">' +
                    "Mark Job Done" +
                    "</button>" +

                    ' <button class="btn btn-secondary open-chat-btn" ' +
                    'data-request-id="' +
                    escapeHTML(doc.id) +
                    '" ' +
                    'data-user-name="' +
                    escapeHTML(
                      data.userName || "Neighbour"
                    ) +
                    '">' +
                    "Open Chat" +
                    "</button>"

                  :

                    '<button class="btn btn-secondary open-chat-btn" ' +
                    'data-request-id="' +
                    escapeHTML(doc.id) +
                    '" ' +
                    'data-user-name="' +
                    escapeHTML(
                      data.userName || "Neighbour"
                    ) +
                    '">' +
                    "Open Chat" +
                    "</button>"
              );

            activeJobsList.appendChild(card);

            var doneButton =
              card.querySelector(
                ".mark-done-btn"
              );

            if (doneButton) {

              doneButton.addEventListener(
                "click",
                function () {

                  markJobDone(
                    doc.id,
                    data.userId
                  );

                }
              );
            }

            var chatButton =
              card.querySelector(
                ".open-chat-btn"
              );

            if (chatButton) {

              chatButton.addEventListener(
                "click",
                function () {

                  openChat(
                    doc.id,
                    data.userName || "Neighbour"
                  );

                }
              );
            }

          }
        );

      },
      function (error) {

        console.error(
          "Active jobs listener error:",
          error
        );

      }
    );
}


// =========================================================
// MARK JOB DONE
// =========================================================

async function markJobDone(requestId) {

  if (!currentUser) {
    showNotification(
      "Please login first.",
      "error"
    );
    return;
  }

  try {

    var requestRef =
      db.collection("requests")
        .doc(requestId);

    var helperRef =
      db.collection("users")
        .doc(currentUser.uid);

    await db.runTransaction(
      async function (transaction) {

        var requestDoc =
          await transaction.get(requestRef);

        var helperDoc =
          await transaction.get(helperRef);

        if (!requestDoc.exists) {
          throw new Error(
            "This job could not be found."
          );
        }

        var requestData =
          requestDoc.data();

        if (
          requestData.acceptedBy !==
          currentUser.uid
        ) {
          throw new Error(
            "You are not assigned to this job."
          );
        }

        if (
          requestData.status ===
          "completed"
        ) {
          throw new Error(
            "This job is already completed."
          );
        }

        // Complete the request
        transaction.update(
          requestRef,
          {

            status:
              "completed",

            completedAt:
              firebase.firestore
                .FieldValue
                .serverTimestamp(),

            completedBy:
              currentUser.uid

          }
        );

        // Make helper available again
        transaction.update(
          helperRef,
          {

            available:
              true,

            availability:
              "available",

            busy:
              false,

            currentRequestId:
              null,

            availabilityUpdatedAt:
              firebase.firestore
                .FieldValue
                .serverTimestamp()

          }
        );

      }
    );

    // Notify requester
    var completedRequest =
      await requestRef.get();

    if (completedRequest.exists) {

      var requestData =
        completedRequest.data();

      if (requestData.userId) {

        await db.collection("users")
          .doc(requestData.userId)
          .collection("notifications")
          .add({

            type:
              "rating",

            title:
              "Job Completed",

            message:
              "Your help request has been completed. Please rate your helper.",

            requestId:
              requestId,

            read:
              false,

            createdAt:
              firebase.firestore
                .FieldValue
                .serverTimestamp()

          });
      }
    }

    showNotification(
      "Job marked as completed. You are now available for another request."
    );

    listenToActiveJobs();

  } catch (error) {

    console.error(
      "Complete job error:",
      error
    );

    showNotification(
      error.message ||
      "Unable to complete this job.",
      "error"
    );
  }
}

// =========================================================
// NOTIFICATIONS
// =========================================================

var notifications = [];


function listenToNotifications() {

  if (!currentUser) {
    return;
  }

  db.collection("users")
    .doc(currentUser.uid)
    .collection("notifications")
    .orderBy("createdAt", "desc")
    .limit(30)
    .onSnapshot(
      function (snapshot) {

        notifications = [];

        snapshot.forEach(
          function (doc) {

            notifications.push({

              id:
                doc.id,

              ...doc.data()

            });

          }
        );

        updateNotificationUI();

      },
      function (error) {

        console.error(
          "Notifications listener error:",
          error
        );

      }
    );
}


function updateNotificationUI() {

  var badge =
    document.getElementById(
      "notificationBadge"
    );

  var list =
    document.getElementById(
      "notificationsList"
    );

  if (!badge || !list) {
    return;
  }

  var unreadCount =
    notifications.filter(
      function (notification) {
        return notification.read !== true;
      }
    ).length;

  badge.textContent =
    unreadCount;

  badge.style.display =
    unreadCount > 0
      ? "inline-flex"
      : "none";

  if (notifications.length === 0) {

    list.innerHTML =
      '<div class="notification-item">' +
      "<p>No notifications yet.</p>" +
      "</div>";

    return;
  }

  list.innerHTML = "";

  notifications.forEach(
    function (notification) {

      var item =
        document.createElement("div");

      item.className =
        "notification-item";

      if (!notification.read) {
        item.classList.add("unread");
      }

      item.innerHTML =

        "<p>" +
        escapeHTML(
          notification.message ||
          "New notification"
        ) +
        "</p>" +

        "<small>" +
        escapeHTML(
          formatDate(
            notification.createdAt
          )
        ) +
        "</small>";

      item.addEventListener(
        "click",
        function () {

          markNotificationRead(
            notification.id
          );

          if (
            notification.type === "rating" &&
            notification.requestId
          ) {

            openRatingModal(
              notification.requestId
            );

          }

          if (
            notification.type === "accepted" &&
            notification.requestId
          ) {

            openChat(
              notification.requestId,
              "Neighbour"
            );

          }

        }
      );

      list.appendChild(item);

    }
  );
}


async function markNotificationRead(
  notificationId
) {

  if (!currentUser || !notificationId) {
    return;
  }

  try {

    await db.collection("users")
      .doc(currentUser.uid)
      .collection("notifications")
      .doc(notificationId)
      .update({

        read:
          true

      });

  } catch (error) {

    console.error(
      "Notification update error:",
      error
    );

  }
}


function openNotifications() {

  var modal =
    document.getElementById(
      "notificationsModal"
    );

  if (!modal) {
    return;
  }

  modal.classList.add("active");
  modal.classList.add("show");

  document.body.style.overflow =
    "hidden";

}


function closeNotifications() {

  var modal =
    document.getElementById(
      "notificationsModal"
    );

  if (!modal) {
    return;
  }

  modal.classList.remove("active");
  modal.classList.remove("show");

  document.body.style.overflow =
    "";

}


// =========================================================
// CHAT
// =========================================================

function openChat(
  requestId,
  userName
) {

  if (!currentUser) {
    return;
  }

  currentChatRequestId =
    requestId;

  var modal =
    document.getElementById(
      "chatModal"
    );

  var title =
    document.getElementById(
      "chatTitle"
    );

  if (title) {

    title.textContent =
      "Chat with " +
      (userName || "Neighbour");

  }

  if (modal) {

    modal.classList.add("active");
    modal.classList.add("show");

  }

  document.body.style.overflow =
    "hidden";

  loadChatMessages(requestId);

}


function closeChat() {

  var modal =
    document.getElementById(
      "chatModal"
    );

  if (modal) {

    modal.classList.remove("active");
    modal.classList.remove("show");

  }

  document.body.style.overflow =
    "";

  currentChatRequestId =
    null;

  if (chatUnsubscribe) {

    chatUnsubscribe();

    chatUnsubscribe =
      null;

  }

}


function loadChatMessages(
  requestId
) {

  if (!currentUser || !requestId) {
    return;
  }

  if (chatUnsubscribe) {

    chatUnsubscribe();

    chatUnsubscribe =
      null;

  }

  var messagesContainer =
    document.getElementById(
      "chatMessages"
    );

  if (!messagesContainer) {
    return;
  }

  messagesContainer.innerHTML =
    '<p class="chat-empty">Loading messages...</p>';

  chatUnsubscribe =
    db.collection("requests")
      .doc(requestId)
      .collection("messages")
      .orderBy("createdAt", "asc")
      .onSnapshot(
        function (snapshot) {

          messagesContainer.innerHTML =
            "";

          if (snapshot.empty) {

            messagesContainer.innerHTML =
              '<p class="chat-empty">No messages yet. Start the conversation.</p>';

            return;
          }

          snapshot.forEach(
            function (doc) {

              var data =
                doc.data();

              var message =
                document.createElement("div");

              message.className =
                "chat-message";

              if (
                data.senderId ===
                currentUser.uid
              ) {

                message.classList.add(
                  "sent"
                );

              } else {

                message.classList.add(
                  "received"
                );

              }

              message.innerHTML =

                "<p>" +
                escapeHTML(
                  data.text || ""
                ) +
                "</p>" +

                "<small>" +
                escapeHTML(
                  formatDate(
                    data.createdAt
                  )
                ) +
                "</small>";

              messagesContainer.appendChild(
                message
              );

            }
          );

          messagesContainer.scrollTop =
            messagesContainer.scrollHeight;

        },
        function (error) {

          console.error(
            "Chat listener error:",
            error
          );

          messagesContainer.innerHTML =
            "<p>Unable to load messages.</p>";

        }
      );
}


function setupChatForm() {

  var chatForm =
    document.getElementById(
      "chatForm"
    );

  if (!chatForm) {
    return;
  }

  if (chatForm.dataset.ready === "true") {
    return;
  }

  chatForm.dataset.ready =
    "true";

  chatForm.addEventListener(
    "submit",
    async function (event) {

      event.preventDefault();

      if (
        !currentUser ||
        !currentChatRequestId
      ) {

        return;

      }

      var input =
        document.getElementById(
          "chatInput"
        );

      if (!input) {
        return;
      }

      var text =
        input.value.trim();

      if (!text) {
        return;
      }

      var sendButton =
        chatForm.querySelector(
          'button[type="submit"]'
        );

      if (sendButton) {
        sendButton.disabled =
          true;
      }

      try {

        await db.collection("requests")
          .doc(currentChatRequestId)
          .collection("messages")
          .add({

            text:
              text,

            senderId:
              currentUser.uid,

            createdAt:
              firebase.firestore.FieldValue
                .serverTimestamp()

          });

        input.value =
          "";

      } catch (error) {

        console.error(
          "Send message error:",
          error
        );

        showNotification(
          error.message ||
          "Unable to send message.",
          "error"
        );

      } finally {

        if (sendButton) {
          sendButton.disabled =
            false;
        }

      }

    }
  );
}


// =========================================================
// RATING
// =========================================================

function openRatingModal(
  requestId
) {

  if (!currentUser) {
    return;
  }

  ratingTargetRequestId =
    requestId;

  currentRating =
    0;

  var modal =
    document.getElementById(
      "ratingModal"
    );

  var score =
    document.getElementById(
      "ratingScore"
    );

  var comment =
    document.getElementById(
      "ratingComment"
    );

  if (score) {
    score.textContent =
      "Select a rating";
  }

  if (comment) {
    comment.value =
      "";
  }

  resetRatingStars();

  if (modal) {

    modal.classList.add("active");
    modal.classList.add("show");

  }

  document.body.style.overflow =
    "hidden";

}


function closeRatingModal() {

  var modal =
    document.getElementById(
      "ratingModal"
    );

  if (modal) {

    modal.classList.remove("active");
    modal.classList.remove("show");

  }

  document.body.style.overflow =
    "";

  ratingTargetRequestId =
    null;

  currentRating =
    0;

}


function resetRatingStars() {

  var stars =
    document.querySelectorAll(
      ".rating-star"
    );

  stars.forEach(
    function (star) {

      star.classList.remove(
        "selected"
      );

      star.style.color =
        "#cbd5e1";

    }
  );

}


function setupRatingStars() {

  var stars =
    document.querySelectorAll(
      ".rating-star"
    );

  if (!stars.length) {
    return;
  }

  stars.forEach(
    function (star) {

      star.addEventListener(
        "click",
        function () {

          currentRating =
            parseInt(
              star.dataset.rating ||
              "0",
              10
            );

          stars.forEach(
            function (item) {

              var value =
                parseInt(
                  item.dataset.rating ||
                  "0",
                  10
                );

              if (
                value <=
                currentRating
              ) {

                item.classList.add(
                  "selected"
                );

                item.style.color =
                  "#f59e0b";

              } else {

                item.classList.remove(
                  "selected"
                );

                item.style.color =
                  "#cbd5e1";

              }

            }
          );

          var score =
            document.getElementById(
              "ratingScore"
            );

          if (score) {

            score.textContent =
              currentRating +
              " / 5";

          }

        }
      );

    }
  );
}


async function submitRating() {

  if (
    !currentUser ||
    !ratingTargetRequestId
  ) {

    showNotification(
      "Rating information is missing.",
      "error"
    );

    return;

  }

  if (
    currentRating <
    1
  ) {

    showNotification(
      "Please select a rating first.",
      "warning"
    );

    return;

  }

  var commentElement =
    document.getElementById(
      "ratingComment"
    );

  var comment =
    commentElement
      ? commentElement.value.trim()
      : "";

  try {

    var requestRef =
      db.collection("requests")
        .doc(ratingTargetRequestId);

    var requestDoc =
      await requestRef.get();

    if (!requestDoc.exists) {

      throw new Error(
        "Request not found."
      );

    }

    var request =
      requestDoc.data();

    if (
      request.userId !==
      currentUser.uid
    ) {

      throw new Error(
        "Only the requester can rate this helper."
      );

    }

    if (
      request.status !==
      "completed"
    ) {

      throw new Error(
        "This request has not been completed yet."
      );

    }

    if (!request.acceptedBy) {

      throw new Error(
        "No helper is assigned to this request."
      );

    }

    if (request.rating) {

      throw new Error(
        "You have already rated this job."
      );

    }

    await requestRef.update({

      rating:
        currentRating,

      ratingComment:
        comment,

      ratedBy:
        currentUser.uid,

      ratedAt:
        firebase.firestore.FieldValue
          .serverTimestamp()

    });

    await db.collection("users")
      .doc(request.acceptedBy)
      .collection("notifications")
      .add({

        message:
          "Your completed help request received a " +
          currentRating +
          "-star rating.",

        requestId:
          ratingTargetRequestId,

        type:
          "review",

        read:
          false,

        createdAt:
          firebase.firestore.FieldValue
            .serverTimestamp()

      });

    closeRatingModal();

    showNotification(
      "Thank you for your rating!"
    );

  } catch (error) {

    console.error(
      "Submit rating error:",
      error
    );

    showNotification(
      error.message ||
      "Unable to submit rating.",
      "error"
    );

  }
}


// =========================================================
// VIEW USER PROFILE
// =========================================================

async function viewUserProfile(
  userId
) {

  if (!userId) {
    return;
  }

  var modal =
    document.getElementById(
      "userProfileModal"
    );

  var profileAvatar =
    document.getElementById(
      "profileAvatar"
    );

  var profileName =
    document.getElementById(
      "profileName"
    );

  var profileRating =
    document.getElementById(
      "profileRating"
    );

  var profileJobsCount =
    document.getElementById(
      "profileJobsCount"
    );

  var profileReviews =
    document.getElementById(
      "profileReviews"
    );

  setupProfileAvatarContainer(
    profileAvatar,
    "",
    "Neighbour"
  );

  if (profileName) {
    profileName.textContent =
      "Loading...";
  }

  if (profileRating) {
    profileRating.textContent =
      "Rating: —";
  }

  if (profileJobsCount) {
    profileJobsCount.textContent =
      "Completed jobs: —";
  }

  if (profileReviews) {
    profileReviews.innerHTML =
      "";
  }

  if (modal) {

    modal.classList.add("active");
    modal.classList.add("show");

  }

  document.body.style.overflow =
    "hidden";

  try {

    var doc =
      await db.collection("users")
        .doc(userId)
        .get();

    if (!doc.exists) {

      throw new Error(
        "User profile not found."
      );

    }

    var data =
      doc.data();

    var name =
      data.fullName ||
      "Neighbour";

    var profilePhoto =
      data.profilePhoto ||
      "";

    setupProfileAvatarContainer(
      profileAvatar,
      profilePhoto,
      name
    );

    if (profileName) {
      profileName.textContent =
        name;
    }

    var ratingSum = 0;
    var ratingCount = 0;

    var jobsSnapshot =
      await db.collection("requests")
        .where(
          "acceptedBy",
          "==",
          userId
        )
        .where(
          "status",
          "==",
          "completed"
        )
        .get();

    jobsSnapshot.forEach(
      function (jobDoc) {

        var job =
          jobDoc.data();

        if (
          typeof job.rating ===
          "number"
        ) {

          ratingSum +=
            job.rating;

          ratingCount++;

        }

      }
    );

    var averageRating =
      ratingCount > 0
        ? (
            ratingSum /
            ratingCount
          ).toFixed(1)
        : "—";

    if (profileRating) {

      profileRating.textContent =
        "Rating: " +
        averageRating +
        (
          ratingCount > 0
            ? " / 5"
            : ""
        );

    }

    if (profileJobsCount) {

      profileJobsCount.textContent =
        "Completed jobs: " +
        jobsSnapshot.size;

    }

    if (profileReviews) {

      var ratedJobs =
        [];

      jobsSnapshot.forEach(
        function (jobDoc) {

          var job =
            jobDoc.data();

          if (
            job.rating &&
            job.ratingComment
          ) {

            ratedJobs.push(job);

          }

        }
      );

      if (ratedJobs.length === 0) {

        profileReviews.innerHTML =
          "<p>No reviews yet.</p>";

      } else {

        ratedJobs.forEach(
          function (review) {

            var reviewElement =
              document.createElement("div");

            reviewElement.className =
              "profile-review";

            reviewElement.innerHTML =

              "<strong>" +
              escapeHTML(
                "★".repeat(
                  review.rating
                )
              ) +
              "</strong>" +

              "<p>" +
              escapeHTML(
                review.ratingComment
              ) +
              "</p>";

            profileReviews.appendChild(
              reviewElement
            );

          }
        );

      }

    }

  } catch (error) {

    console.error(
      "View profile error:",
      error
    );

    showNotification(
      error.message ||
      "Unable to load profile.",
      "error"
    );

  }
}


function closeUserProfile() {

  var modal =
    document.getElementById(
      "userProfileModal"
    );

  if (modal) {

    modal.classList.remove("active");
    modal.classList.remove("show");

  }

  document.body.style.overflow =
    "";

}


// =========================================================
// EDIT PROFILE
// =========================================================

function openEditProfile() {

  if (!currentUser) {
    return;
  }

  var modal =
    document.getElementById(
      "editProfileModal"
    );

  if (!modal) {
    return;
  }

  var nameInput =
    document.getElementById(
      "editName"
    );

  var skillInput =
    document.getElementById(
      "editSkill"
    );

  var roleInput =
    document.getElementById(
      "editRole"
    );

  var cachedProfile =
    profileCache[currentUser.uid] ||
    {};

  if (nameInput) {

    nameInput.value =
      cachedProfile.fullName ||
      currentUser.displayName ||
      "";

  }

  if (skillInput) {

    skillInput.value =
      cachedProfile.skill ||
      cachedProfile.skills ||
      "";

  }

  if (roleInput) {

    roleInput.value =
      cachedProfile.role ||
      "requester";

  }

  setupProfilePhotoPreview();

  modal.classList.add("active");
  modal.classList.add("show");

  document.body.style.overflow =
    "hidden";

}


function closeEditProfile() {

  var modal =
    document.getElementById(
      "editProfileModal"
    );

  if (modal) {

    modal.classList.remove("active");
    modal.classList.remove("show");

  }

  document.body.style.overflow =
    "";

}


async function saveProfileChanges() {

  if (!currentUser) {
    return;
  }

  var nameInput =
    document.getElementById(
      "editName"
    );

  var skillInput =
    document.getElementById(
      "editSkill"
    );

  var roleInput =
    document.getElementById(
      "editRole"
    );

  var photoInput =
    document.getElementById(
      "editProfilePhoto"
    );

  var fullName =
    nameInput
      ? nameInput.value.trim()
      : "";

  var skill =
    skillInput
      ? skillInput.value.trim()
      : "";

  var role =
    roleInput
      ? roleInput.value
      : "requester";

  if (!fullName) {

    showNotification(
      "Please enter your full name.",
      "warning"
    );

    return;
  }

  var updates = {

    fullName:
      fullName,

    skill:
      skill,

    role:
      role

  };

  try {

    if (
      photoInput &&
      photoInput.files &&
      photoInput.files.length > 0
    ) {

      var selectedFile =
        photoInput.files[0];

      if (
        selectedFile.size >
        2 * 1024 * 1024
      ) {

        showNotification(
          "Profile photo must be smaller than 2MB.",
          "warning"
        );

        return;

      }

      if (
        !selectedFile.type ||
        selectedFile.type.indexOf("image/") !== 0
      ) {

        showNotification(
          "Please select a valid image file.",
          "warning"
        );

        return;

      }

      updates.profilePhoto =
        await getBase64(
          selectedFile
        );

    }

    await db.collection("users")
      .doc(currentUser.uid)
      .update(updates);

    try {

      await currentUser.updateProfile({

        displayName:
          fullName,

        photoURL:
          updates.profilePhoto ||
          currentUser.photoURL ||
          ""

      });

    } catch (authError) {

      console.warn(
        "Firebase Auth profile update failed:",
        authError
      );

    }

    profileCache[currentUser.uid] = {

      ...(profileCache[currentUser.uid] || {}),

      ...updates

    };

    var dashboardImage =
      document.getElementById(
        "userInitial"
      );

    if (dashboardImage) {

      setupProfileImageElement(
        dashboardImage,

        updates.profilePhoto ||
        currentUser.photoURL ||
        "",

        fullName
      );

    }

    var dashboardName =
      document.getElementById(
        "userName"
      );

    if (dashboardName) {
      dashboardName.textContent =
        fullName;
    }

    var dashboardSkill =
      document.getElementById(
        "userSkill"
      );

    if (dashboardSkill) {

      dashboardSkill.textContent =
        "Skill: " +
        (skill || "No skill added");

    }

    var dashboardRole =
      document.getElementById(
        "userRole"
      );

    if (dashboardRole) {

      dashboardRole.textContent =
        "Role: " +
        role;

    }

    closeEditProfile();

    showNotification(
      "Profile updated successfully!"
    );

  } catch (error) {

    console.error(
      "Save profile error:",
      error
    );

    showNotification(
      error.message ||
      "Unable to update profile.",
      "error"
    );

  }
}


// =========================================================
// DARK MODE
// =========================================================

function toggleDarkMode() {

  document.body.classList.toggle(
    "dark-theme"
  );

  var enabled =
    document.body.classList.contains(
      "dark-theme"
    );

  localStorage.setItem(
    "neighbourlyDarkMode",
    enabled
      ? "true"
      : "false"
  );

}


function loadDarkMode() {

  var enabled =
    localStorage.getItem(
      "neighbourlyDarkMode"
    ) === "true";

  if (enabled) {

    document.body.classList.add(
      "dark-theme"
    );

  }

}


// =========================================================
// LOGOUT
// =========================================================

function logout() {

  firebase.auth()
    .signOut()
    .then(
      function () {

        window.location.href =
          "login.html";

      }
    )
    .catch(
      function (error) {

        console.error(
          "Logout error:",
          error
        );

        showNotification(
          "Unable to logout.",
          "error"
        );

      }
    );
}


// =========================================================
// MODAL BACKDROP
// =========================================================

function setupModalBackdrop() {

  var modals =
    document.querySelectorAll(
      ".modal"
    );

  modals.forEach(
    function (modal) {

      modal.addEventListener(
        "click",
        function (event) {

          if (
            event.target ===
            modal
          ) {

            modal.classList.remove(
              "active"
            );

            modal.classList.remove(
              "show"
            );

            document.body.style.overflow =
              "";

          }

        }
      );

    }
  );
}


// =========================================================
// BUTTON SETUP
// =========================================================

function setupButtons() {

  var requestButton =
    document.getElementById(
      "requestHelpBtn"
    );

  if (requestButton) {

    requestButton.addEventListener(
      "click",
      openModal
    );

  }

  var closeRequestButton =
    document.getElementById(
      "closeRequestModal"
    );

  if (closeRequestButton) {

    closeRequestButton.addEventListener(
      "click",
      closeModal
    );

  }

  var notificationsButton =
    document.getElementById(
      "notificationBtn"
    );

  if (notificationsButton) {

    notificationsButton.addEventListener(
      "click",
      openNotifications
    );

  }

  var closeNotificationsButton =
    document.getElementById(
      "closeNotificationsModal"
    );

  if (closeNotificationsButton) {

    closeNotificationsButton.addEventListener(
      "click",
      closeNotifications
    );

  }

  var closeChatButton =
    document.getElementById(
      "closeChatModal"
    );

  if (closeChatButton) {

    closeChatButton.addEventListener(
      "click",
      closeChat
    );

  }

  var closeRatingButton =
    document.getElementById(
      "closeRatingModal"
    );

  if (closeRatingButton) {

    closeRatingButton.addEventListener(
      "click",
      closeRatingModal
    );

  }

  var closeProfileButton =
    document.getElementById(
      "closeUserProfileModal"
    );

  if (closeProfileButton) {

    closeProfileButton.addEventListener(
      "click",
      closeUserProfile
    );

  }

  var editProfileButton =
    document.getElementById(
      "editProfileBtn"
    );

  if (editProfileButton) {

    editProfileButton.addEventListener(
      "click",
      openEditProfile
    );

  }

  var closeEditButton =
    document.getElementById(
      "closeEditProfileModal"
    );

  if (closeEditButton) {

    closeEditButton.addEventListener(
      "click",
      closeEditProfile
    );

  }

  var saveProfileButton =
    document.getElementById(
      "saveProfileBtn"
    );

  if (saveProfileButton) {

    saveProfileButton.addEventListener(
      "click",
      saveProfileChanges
    );

  }

  var logoutButton =
    document.getElementById(
      "logoutBtn"
    );

  if (logoutButton) {

    logoutButton.addEventListener(
      "click",
      logout
    );

  }

  var darkModeButton =
    document.getElementById(
      "darkModeBtn"
    );

  if (darkModeButton) {

    darkModeButton.addEventListener(
      "click",
      toggleDarkMode
    );

  }

  var submitRatingButton =
    document.getElementById(
      "submitRatingBtn"
    );

  if (submitRatingButton) {

    submitRatingButton.addEventListener(
      "click",
      submitRating
    );

  }

  setupChatForm();

}


// =========================================================
// FILTER SETUP
// =========================================================

function setupFilters() {

  var categoryFilter =
    document.getElementById(
      "categoryFilter"
    );

  var distanceFilter =
    document.getElementById(
      "distanceFilter"
    );

  if (categoryFilter) {

    categoryFilter.addEventListener(
      "change",
      filterRequests
    );

  }

  if (distanceFilter) {

    distanceFilter.addEventListener(
      "change",
      filterRequests
    );

  }

}


// =========================================================
// KEYBOARD SHORTCUTS
// =========================================================

function setupKeyboardShortcuts() {

  document.addEventListener(
    "keydown",
    function (event) {

      if (
        event.key ===
        "Escape"
      ) {

        closeModal();
        closeNotifications();
        closeChat();
        closeRatingModal();
        closeUserProfile();
        closeEditProfile();

      }

    }
  );

}


// =========================================================
// INITIALIZATION
// =========================================================

document.addEventListener(
  "DOMContentLoaded",
  function () {

    loadDarkMode();

    setupRequestForm();

    setupButtons();

    setupFilters();

    setupRatingStars();

    setupModalBackdrop();

    setupKeyboardShortcuts();

    initializeMap();

  }
);


// =========================================================
// END OF NEIGHBOURLY SCRIPT
// =========================================================
// =========================================================
// NEIGHBOURLY — MOBILE SIDEBAR MENU
// =========================================================

function toggleMobileMenu() {

  const sidebar =
    document.querySelector(".sidebar");

  const backdrop =
    document.querySelector(".mobile-menu-backdrop");

  if (!sidebar) {
    return;
  }

  sidebar.classList.toggle(
    "mobile-menu-open"
  );

  if (backdrop) {
    backdrop.classList.toggle(
      "active"
    );
  }

}


// =========================================================
// NEIGHBOURLY — MOBILE NAVIGATION
// =========================================================

function setMobileNavActive(index) {

  const buttons =
    document.querySelectorAll(
      ".mobile-bottom-nav button"
    );

  buttons.forEach(function(button, i) {

    if (i === index) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }

  });

}


function mobileShowMap() {

  setMobileNavActive(0);

  const mapArea =
    document.querySelector(".map-area");

  const sidebar =
    document.querySelector(".sidebar");

  const backdrop =
    document.querySelector(".mobile-menu-backdrop");

  if (mapArea) {
    mapArea.style.display = "block";
  }

  if (sidebar) {
    sidebar.classList.remove(
      "mobile-menu-open"
    );
  }

  if (backdrop) {
    backdrop.classList.remove(
      "active"
    );
  }

}


function mobileShowRequests() {

  setMobileNavActive(1);

  const sidebar =
    document.querySelector(".sidebar");

  const requests =
    document.querySelector(".nearby-section");

  const backdrop =
    document.querySelector(".mobile-menu-backdrop");

  if (!sidebar || !requests) {
    return;
  }

  sidebar.classList.add(
    "mobile-menu-open"
  );

  if (backdrop) {
    backdrop.classList.add("active");
  }

  setTimeout(function() {

    requests.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  }, 300);

}


function mobileShowChat() {

  setMobileNavActive(2);

  const sidebar =
    document.querySelector(".sidebar");

  const backdrop =
    document.querySelector(".mobile-menu-backdrop");

  if (sidebar) {
    sidebar.classList.add(
      "mobile-menu-open"
    );
  }

  if (backdrop) {
    backdrop.classList.add("active");
  }

  alert(
    "Open an active job to start a chat."
  );

}


function mobileShowProfile() {

  setMobileNavActive(3);

  const sidebar =
    document.querySelector(".sidebar");

  const profile =
    document.querySelector(
      "#userProfileCard"
    );

  const backdrop =
    document.querySelector(
      ".mobile-menu-backdrop"
    );

  if (!sidebar || !profile) {
    return;
  }

  sidebar.classList.add(
    "mobile-menu-open"
  );

  if (backdrop) {
    backdrop.classList.add("active");
  }

  setTimeout(function() {

    profile.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  }, 300);

}
function setupHelperAvailability() {

  var control =
    document.getElementById(
      "helperAvailabilityControl"
    );

  var button =
    document.getElementById(
      "availabilityButton"
    );

  if (!control || !button || !currentUser) {
    return;
  }

  var profile =
    profileCache[currentUser.uid];

  if (!profile) {
    return;
  }

  var role =
    profile.role || "";

  // Only helpers and both-users need availability
  if (
    role !== "helper" &&
    role !== "both"
  ) {

    control.style.display = "none";

    return;
  }

  control.style.display = "block";

  helperAvailable =
    profile.available === true;


  function updateButton() {

    var currentProfile =
      profileCache[currentUser.uid] || {};

    var isBusy =
      currentProfile.availability === "busy" ||
      currentProfile.busy === true;

    if (isBusy) {

      button.textContent =
        "🔴 Busy — Handling a Request";

      button.style.background =
        "#fef2f2";

      button.style.color =
        "#b91c1c";

      button.disabled = true;

      return;
    }

    if (helperAvailable) {

      button.textContent =
        "🟢 Available for Requests";

      button.style.background =
        "#ecfdf5";

      button.style.color =
        "#047857";

    } else {

      button.textContent =
        "⚪ Not Available for Requests";

      button.style.background =
        "#f1f5f9";

      button.style.color =
        "#64748b";

    }

    button.disabled = false;

  }


  updateButton();


  button.onclick =
    async function() {

      if (!currentUser) {

        showNotification(
          "Please login first.",
          "error"
        );

        return;
      }

      var currentProfile =
        profileCache[currentUser.uid] || {};

      if (
        currentProfile.availability === "busy" ||
        currentProfile.busy === true
      ) {

        showNotification(
          "You are currently handling a request.",
          "error"
        );

        return;
      }

      var newAvailability =
        !helperAvailable;

      button.disabled = true;

      button.textContent =
        "Updating...";


      try {

        await db
          .collection("users")
          .doc(currentUser.uid)
          .update({

            available:
              newAvailability,

            availability:
              newAvailability
                ? "available"
                : "offline",

            busy:
              false,

            online:
              true,

            availabilityUpdatedAt:
              firebase.firestore
                .FieldValue
                .serverTimestamp()

          });


        // Update local values only after
        // Firebase successfully saves.
        helperAvailable =
          newAvailability;

        profileCache[currentUser.uid].available =
          newAvailability;

        profileCache[currentUser.uid].availability =
          newAvailability
            ? "available"
            : "offline";

        profileCache[currentUser.uid].busy =
          false;


        updateButton();


        showNotification(
          newAvailability
            ? "You are now available for requests."
            : "You are now unavailable for requests."
        );


      } catch (error) {

        console.error(
          "Availability update error:",
          error
        );

        showNotification(
          error.message ||
          "Unable to update availability.",
          "error"
        );

        updateButton();

      } finally {

        var latestProfile =
          profileCache[currentUser.uid] || {};

        if (
          latestProfile.availability !==
            "busy" &&
          latestProfile.busy !== true
        ) {

          button.disabled = false;

        }

      }

    };

}
// =========================================
// NEIGHBOURLY — HELPER MATCHING
// =========================================

async function findSuggestedHelpers(requestData) {

  if (!requestData) {
    return;
  }

  var requestId =
    requestData.requestId;

  var requesterLatitude =
    Number(requestData.latitude);

  var requesterLongitude =
    Number(requestData.longitude);

  if (
    !requestId ||
    !Number.isFinite(requesterLatitude) ||
    !Number.isFinite(requesterLongitude)
  ) {

    console.warn(
      "Cannot automatically find helper: invalid request location."
    );

    return;
  }

  try {

    var usersSnapshot =
      await db.collection("users").get();

    var candidates = [];

    usersSnapshot.forEach(function (doc) {

      var helper =
        doc.data();

      var helperId =
        doc.id;

      // Never match the requester with themselves
      if (
        currentUser &&
        helperId === currentUser.uid
      ) {
        return;
      }

      // Only helpers or users who are both
      if (
        helper.role !== "helper" &&
        helper.role !== "both"
      ) {
        return;
      }

      // Helper must be available
      if (helper.available !== true) {
        return;
      }

      // Do not match a busy helper
      if (
        helper.availability === "busy" ||
        helper.busy === true
      ) {
        return;
      }

      // Helper must have a location
      var helperLatitude =
        Number(helper.latitude);

      var helperLongitude =
        Number(helper.longitude);

      if (
        !Number.isFinite(helperLatitude) ||
        !Number.isFinite(helperLongitude)
      ) {
        return;
      }

      // Skill must match
      var helperSkill =
        helper.skill ||
        helper.skills ||
        "";

      if (
        !helperHasSkill(
          helperSkill,
          requestData.skillNeeded
        )
      ) {
        return;
      }

      var distance =
        calculateDistance(
          requesterLatitude,
          requesterLongitude,
          helperLatitude,
          helperLongitude
        );

      candidates.push({

        id: helperId,

        name:
          helper.fullName ||
          "Neighbour",

        skill:
          helperSkill,

        latitude:
          helperLatitude,

        longitude:
          helperLongitude,

        distance:
          distance

      });

    });

    // Closest helper first
    candidates.sort(function (a, b) {

      return a.distance - b.distance;

    });

    console.log(
      "Available matching helpers:",
      candidates
    );

    if (candidates.length === 0) {

      showNotification(
        "No available helper with this skill was found nearby.",
        "error"
      );

      return;
    }

    // The closest available helper
    var nearestHelper =
      candidates[0];

    console.log(
      "Nearest helper selected:",
      nearestHelper
    );

    await assignRequestToHelper(
      requestId,
      nearestHelper
    );

  } catch (error) {

    console.error(
      "Automatic helper matching error:",
      error
    );

    showNotification(
      "Unable to find a nearby helper right now.",
      "error"
    );
  }
}
async function assignRequestToHelper(
  requestId,
  helper
) {

  try {

    var requestRef =
      db.collection("requests")
        .doc(requestId);

    var helperRef =
      db.collection("users")
        .doc(helper.id);

    await db.runTransaction(
      async function (transaction) {

        var requestDoc =
          await transaction.get(requestRef);

        var helperDoc =
          await transaction.get(helperRef);

        if (!requestDoc.exists) {
          throw new Error(
            "Help request no longer exists."
          );
        }

        if (!helperDoc.exists) {
          throw new Error(
            "Helper no longer exists."
          );
        }

        var requestData =
          requestDoc.data();

        var helperData =
          helperDoc.data();

        // Request must still be open
        if (
          requestData.status !== "open"
        ) {
          throw new Error(
            "This request is no longer available."
          );
        }

        // Helper must still be available
        if (
          helperData.available !== true ||
          helperData.availability === "busy" ||
          helperData.busy === true
        ) {
          throw new Error(
            "This helper is no longer available."
          );
        }

        transaction.update(
          requestRef,
          {

            requestedHelperId:
              helper.id,

            requestedHelperName:
              helper.name,

            dispatchStatus:
              "offered",

            dispatchDistance:
              helper.distance,

            requestedAt:
              firebase.firestore
                .FieldValue
                .serverTimestamp()

          }
        );

        transaction.update(
          helperRef,
          {

            availability:
              "busy",

            busy:
              true,

            currentRequestId:
              requestId

          }
        );

      }
    );

    // Notify the selected helper
    await db.collection("users")
      .doc(helper.id)
      .collection("notifications")
      .add({

        type:
          "help_request",

        title:
          "New Help Request",

        message:
          "Someone nearby needs your help with " +
          (helper.skill || "a task") +
          ". You are the closest available helper.",

        requestId:
          requestId,

        distance:
          helper.distance,

        read:
          false,

        createdAt:
          firebase.firestore
            .FieldValue
            .serverTimestamp()

      });

    showNotification(
      "The nearest available helper has been contacted."
    );

  } catch (error) {

    console.error(
      "Helper assignment error:",
      error
    );

    showNotification(
      error.message ||
      "Unable to contact the nearest helper.",
      "error"
    );
  }
}
// =========================================================
// REQUEST SUGGESTED HELPER
// =========================================================

async function requestSuggestedHelper(
  helperId,
  requestId
) {

  if (!currentUser) {
    showNotification(
      "Please login first.",
      "error"
    );
    return;
  }

  if (!helperId) {
    showNotification(
      "Helper information is missing.",
      "error"
    );
    return;
  }

  try {

    // Find the helper
    var helperDoc =
      await db.collection("users")
        .doc(helperId)
        .get();

    if (!helperDoc.exists) {
      showNotification(
        "This helper could not be found.",
        "error"
      );
      return;
    }

    var helperData =
      helperDoc.data();

    // Make sure helper is still available
    if (helperData.available !== true) {
      showNotification(
        "This helper is currently unavailable.",
        "error"
      );
      return;
    }

    // Find the requester's latest open request
    var requestsSnapshot =
      await db.collection("requests")
        .where(
          "userId",
          "==",
          currentUser.uid
        )
        .where(
          "status",
          "==",
          "open"
        )
        .orderBy(
          "createdAt",
          "desc"
        )
        .limit(1)
        .get();

    if (requestsSnapshot.empty) {
      showNotification(
        "No open help request was found.",
        "error"
      );
      return;
    }

    var requestDoc =
      requestsSnapshot.docs[0];

    var requestId =
      requestDoc.id;

    // Mark this helper as the selected helper
    await db.collection("requests")
      .doc(requestId)
      .update({

        requestedHelperId:
          helperId,

        requestedHelperName:
          helperData.fullName ||
          "Neighbour",

        requestedAt:
          firebase.firestore.FieldValue
            .serverTimestamp()

      });

    // Notify the selected helper
    await db.collection("users")
      .doc(helperId)
      .collection("notifications")
      .add({

        type: "help_request",

        requestId:
          requestId,

        requesterId:
          currentUser.uid,

        requesterName:
          currentUser.displayName ||
          "A neighbour",

        title:
          "New Help Request",

        message:
          "Someone nearby has selected you to help with a request.",

        read: false,

        createdAt:
          firebase.firestore.FieldValue
            .serverTimestamp()

      });

    showNotification(
      "Request sent to " +
      (helperData.fullName || "the helper") +
      "."
    );

  } catch (error) {

    console.error(
      "Request suggested helper error:",
      error
    );

    showNotification(
      error.message ||
      "Unable to send the request to this helper.",
      "error"
    );

  }
}
