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

  if (isDashboard && !user) {
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

var defaultLatitude = 6.4531;
var defaultLongitude = 3.4331;

var profileCache = {};


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

    })
    .catch(function (error) {

      console.error(
        "Error loading profile:",
        error
      );

    });
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

        var latitude =
          defaultLatitude;

        var longitude =
          defaultLongitude;

        if (
          userMarker &&
          userMarker.getLatLng
        ) {

          var position =
            userMarker.getLatLng();

          latitude =
            position.lat;

          longitude =
            position.lng;
        }

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

        await db.collection("requests")
          .add(requestData);

        requestForm.reset();

        closeModal();

        showNotification(
          "Your help request has been posted successfully."
        );

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

  var mapElement =
    document.getElementById("map");

  if (!mapElement) {
    return;
  }

  if (typeof L === "undefined") {

    console.warn(
      "Leaflet is not loaded."
    );

    return;
  }

  if (map) {
    return;
  }

  map =
    L.map("map").setView(
      [
        defaultLatitude,
        defaultLongitude
      ],
      13
    );

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution:
        "&copy; OpenStreetMap contributors"
    }
  ).addTo(map);

  if (!navigator.geolocation) {
    return;
  }

  navigator.geolocation.getCurrentPosition(

    function (position) {

      var lat =
        position.coords.latitude;

      var lng =
        position.coords.longitude;

      defaultLatitude = lat;
      defaultLongitude = lng;

      map.setView(
        [lat, lng],
        14
      );

      if (userMarker) {
        map.removeLayer(userMarker);
      }

      userMarker =
        L.marker([lat, lng])
          .addTo(map)
          .bindPopup(
            "<strong>You are here</strong>"
          );

      filterRequests();

    },

    function () {

      console.log(
        "Location permission not granted."
      );

    },

    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000
    }

  );
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

    var result =
      await db.runTransaction(
        async function (transaction) {

          var requestDoc =
            await transaction.get(
              requestRef
            );

          if (!requestDoc.exists) {

            throw new Error(
              "Request does not exist."
            );

          }

          var request =
            requestDoc.data();

          if (request.status !== "open") {

            throw new Error(
              "This request has already been accepted."
            );

          }

          if (
            request.userId ===
            currentUser.uid
          ) {

            throw new Error(
              "You cannot accept your own request."
            );

          }

          var helperRef =
            db.collection("users")
              .doc(currentUser.uid);

          var helperDoc =
            await transaction.get(
              helperRef
            );

          if (!helperDoc.exists) {

            throw new Error(
              "Helper profile not found."
            );

          }

          var helperData =
            helperDoc.data();

          var helperSkill =
            helperData.skill ||
            helperData.skills ||
            "";

          helperSkill =
            String(helperSkill).trim();

          var requestedSkill =
            String(
              request.skillNeeded || ""
            ).trim();

          if (
            requestedSkill &&
            helperSkill.toLowerCase() !==
              requestedSkill.toLowerCase()
          ) {

            throw new Error(
              "Your skill does not match this request."
            );

          }

          transaction.update(
            requestRef,
            {
              status: "accepted",

              acceptedBy:
                currentUser.uid,

              acceptedByName:
                helperData.fullName ||
                currentUser.displayName ||
                "Helper",

              acceptedAt:
                firebase.firestore.FieldValue
                  .serverTimestamp()
            }
          );

          return {

            request: request,

            helperName:
              helperData.fullName ||
              currentUser.displayName ||
              "Helper"

          };

        }
      );

    await db.collection("users")
      .doc(result.request.userId)
      .collection("notifications")
      .add({

        message:
          result.helperName +
          " accepted your help request.",

        requestId:
          requestId,

        type:
          "accepted",

        read:
          false,

        createdAt:
          firebase.firestore.FieldValue
            .serverTimestamp()

      });

    showNotification(
      "Request accepted successfully!"
    );

  } catch (error) {

    console.error(
      "Accept request error:",
      error
    );

    showNotification(
      error.message ||
      "Unable to accept request.",
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

async function markJobDone(
  requestId,
  requesterId
) {

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

    var requestDoc =
      await requestRef.get();

    if (!requestDoc.exists) {

      throw new Error(
        "Request does not exist."
      );

    }

    var request =
      requestDoc.data();

    if (
      request.acceptedBy !==
      currentUser.uid
    ) {

      throw new Error(
        "You are not authorized to complete this job."
      );

    }

    if (request.status !== "accepted") {

      throw new Error(
        "This job is no longer active."
      );

    }

    await requestRef.update({

      status:
        "completed",

      completedAt:
        firebase.firestore.FieldValue
          .serverTimestamp(),

      completedBy:
        currentUser.uid

    });

    await db.collection("users")
      .doc(requesterId)
      .collection("notifications")
      .add({

        message:
          "Your help request has been completed. Please rate your helper.",

        requestId:
          requestId,

        type:
          "rating",

        read:
          false,

        createdAt:
          firebase.firestore.FieldValue
            .serverTimestamp()

      });

    showNotification(
      "Job marked as completed successfully!"
    );

  } catch (error) {

    console.error(
      "Mark job done error:",
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
