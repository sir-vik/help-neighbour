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

      var profileCard =
        document.getElementById("userProfileCard");

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

      if (initialElement) {
        initialElement.textContent =
          name.charAt(0).toUpperCase();
      }

      if (profileCard && photo) {

        if (profileCard.tagName === "IMG") {
          profileCard.src = photo;
        } else {

          var image =
            profileCard.querySelector("img");

          if (image) {
            image.src = photo;
          }
        }
      }

      var editPhoto =
        document.getElementById(
          "editProfilePhoto"
        );

      if (editPhoto) {
        editPhoto.value = "";
      }

    })
    .catch(function (error) {

      console.error(
        "Error loading profile:",
        error
      );

    });
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
    .where(
      "status",
      "in",
      [
        "open",
        "accepted"
      ]
    )
    .onSnapshot(
      function (snapshot) {

        var list =
          document.getElementById(
            "active-jobs-list"
          );

        if (!list) {
          return;
        }

        list.innerHTML = "";

        var foundJobs = false;

        snapshot.forEach(
          function (doc) {

            var data =
              doc.data();

            var isOwner =
              data.userId ===
              currentUser.uid;

            var isHelper =
              data.acceptedBy ===
              currentUser.uid;

            if (!isOwner && !isHelper) {
              return;
            }

            foundJobs = true;

            var card =
              document.createElement("div");

            card.className =
              "active-job-card";

            var statusText =
              data.status === "accepted"
                ? "Accepted"
                : "Open";

            card.innerHTML =

              "<h4>" +
              escapeHTML(
                data.title
              ) +
              "</h4>" +

              "<p>Status: " +
              escapeHTML(
                statusText
              ) +
              "</p>";

            if (
              data.status ===
              "accepted"
            ) {

              var chatButton =
                document.createElement(
                  "button"
                );

              chatButton.className =
                "btn btn-secondary";

              chatButton.textContent =
                "Chat";

              chatButton.style.marginTop =
                "10px";

              chatButton.addEventListener(
                "click",
                function () {

                  openChat(
                    doc.id,
                    data.title
                  );

                }
              );

              card.appendChild(
                chatButton
              );


              // =========================================
              // ONLY THE HELPER CAN MARK THE JOB DONE
              // =========================================

              if (isHelper) {

                var doneButton =
                  document.createElement(
                    "button"
                  );

                doneButton.className =
                  "btn btn-primary";

                doneButton.textContent =
                  "Mark Done";

                doneButton.style.marginTop =
                  "10px";

                doneButton.style.marginLeft =
                  "8px";

                doneButton.addEventListener(
                  "click",
                  function () {

                    markJobDone(
                      doc.id,
                      data.userId
                    );

                  }
                );

                card.appendChild(
                  doneButton
                );
              }
            }

            list.appendChild(card);

          }
        );

        if (!foundJobs) {

          list.innerHTML =
            '<div class="active-job-card">' +
            "<p>No active jobs at the moment.</p>" +
            "</div>";

        }

      },
      function (error) {

        console.error(
          "Active jobs error:",
          error
        );

      }
    );
}


// =========================================================
// MARK JOB AS COMPLETED
// =========================================================

async function markJobDone(
  requestId,
  requesterId
) {

  if (!currentUser) {
    return;
  }

  var confirmed =
    confirm(
      "Are you sure you have completed this help request?"
    );

  if (!confirmed) {
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
        "This request no longer exists."
      );
    }

    var request =
      requestDoc.data();

    if (
      request.acceptedBy !==
      currentUser.uid
    ) {

      throw new Error(
        "Only the assigned helper can complete this job."
      );
    }

    if (
      request.userId !==
      requesterId
    ) {

      throw new Error(
        "Invalid requester."
      );
    }

    if (
      request.status !==
      "accepted"
    ) {

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
      "Job marked as completed successfully."
    );

  } catch (error) {

    console.error(
      "Mark job done error:",
      error
    );

    showNotification(
      error.message ||
      "Unable to complete this job. Please try again.",
      "error"
    );

  }
}


// =========================================================
// NOTIFICATIONS
// =========================================================

function listenToNotifications() {

  if (!currentUser) {
    return;
  }

  var badge =
    document.getElementById(
      "notificationBadge"
    );

  var list =
    document.getElementById(
      "notificationsList"
    );

  db.collection("users")
    .doc(currentUser.uid)
    .collection("notifications")
    .orderBy(
      "createdAt",
      "desc"
    )
    .limit(20)
    .onSnapshot(
      function (snapshot) {

        if (list) {
          list.innerHTML = "";
        }

        var unreadCount = 0;

        snapshot.forEach(
          function (doc) {

            var data =
              doc.data();

            if (!data.read) {
              unreadCount++;
            }

            if (!list) {
              return;
            }

            var item =
              document.createElement("div");

            item.className =
              "notification-item";

            if (!data.read) {

              item.classList.add(
                "notification-unread"
              );
            }

            item.innerHTML =

              "<strong>" +
              escapeHTML(
                data.message ||
                "New notification"
              ) +
              "</strong>" +

              "<br>" +

              "<small>" +
              escapeHTML(
                formatDate(
                  data.createdAt
                )
              ) +
              "</small>";

            // Rating notifications are clickable
            if (
              data.type === "rating" &&
              data.requestId
            ) {

              item.style.cursor =
                "pointer";

              item.addEventListener(
                "click",
                function () {

                  closeNotifications();

                  openRatingModal(
                    data.requestId
                  );

                }
              );

            }

            list.appendChild(item);

          }
        );

        if (badge) {

          if (unreadCount > 0) {

            badge.textContent =
              unreadCount > 9
                ? "9+"
                : unreadCount;

            badge.style.display =
              "inline-flex";

          } else {

            badge.style.display =
              "none";

          }
        }

      },
      function (error) {

        console.error(
          "Notifications error:",
          error
        );

      }
    );
}


// =========================================================
// NOTIFICATION MODAL
// =========================================================

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

  markNotificationsRead();
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


function markNotificationsRead() {

  if (!currentUser) {
    return;
  }

  db.collection("users")
    .doc(currentUser.uid)
    .collection("notifications")
    .where(
      "read",
      "==",
      false
    )
    .get()
    .then(function (snapshot) {

      if (snapshot.empty) {
        return;
      }

      var batch =
        db.batch();

      snapshot.forEach(
        function (doc) {

          batch.update(
            doc.ref,
            {
              read: true
            }
          );

        }
      );

      return batch.commit();

    })
    .catch(function (error) {

      console.error(
        "Mark notifications error:",
        error
      );

    });
}


// =========================================================
// CHAT
// =========================================================

function openChat(
  requestId,
  title
) {

  if (!currentUser) {
    return;
  }

  var modal =
    document.getElementById(
      "chatModal"
    );

  var titleElement =
    document.getElementById(
      "chatTitle"
    );

  if (!modal) {
    return;
  }

  currentChatRequestId =
    requestId;

  if (titleElement) {

    titleElement.textContent =
      "Chat — " +
      (
        title ||
        "Help Request"
      );

  }

  modal.classList.add("active");
  modal.classList.add("show");

  document.body.style.overflow =
    "hidden";

  listenToChatMessages(
    requestId
  );
}


function closeChatModal() {

  var modal =
    document.getElementById(
      "chatModal"
    );

  if (chatUnsubscribe) {

    chatUnsubscribe();
    chatUnsubscribe = null;

  }

  currentChatRequestId =
    null;

  if (modal) {

    modal.classList.remove("active");
    modal.classList.remove("show");

  }

  document.body.style.overflow =
    "";
}


function listenToChatMessages(
  requestId
) {

  var messages =
    document.getElementById(
      "chatMessages"
    );

  if (!messages) {
    return;
  }

  messages.innerHTML = "";

  if (chatUnsubscribe) {
    chatUnsubscribe();
    chatUnsubscribe = null;
  }

  chatUnsubscribe =
    db.collection("requests")
      .doc(requestId)
      .collection("messages")
      .orderBy(
        "createdAt",
        "asc"
      )
      .onSnapshot(
        function (snapshot) {

          messages.innerHTML = "";

          snapshot.forEach(
            function (doc) {

              var data =
                doc.data();

              var message =
                document.createElement(
                  "div"
                );

              var mine =
                data.senderId ===
                currentUser.uid;

              message.className =
                mine
                  ? "chat-message mine"
                  : "chat-message theirs";

              message.innerHTML =

                "<strong>" +
                escapeHTML(
                  data.senderName ||
                  "Neighbour"
                ) +
                "</strong><br>" +

                escapeHTML(
                  data.text || ""
                ) +

                "<br>" +

                "<small>" +
                escapeHTML(
                  formatDate(
                    data.createdAt
                  )
                ) +
                "</small>";

              messages.appendChild(
                message
              );

            }
          );

          messages.scrollTop =
            messages.scrollHeight;

        },
        function (error) {

          console.error(
            "Chat listener error:",
            error
          );

          showNotification(
            "Unable to load chat messages.",
            "error"
          );

        }
      );
}


// =========================================================
// SEND CHAT MESSAGE
// =========================================================

function setupChatForm() {

  var chatForm =
    document.getElementById(
      "chatForm"
    );

  if (!chatForm) {
    return;
  }

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
        sendButton.disabled = true;
      }

      try {

        var userName =
          currentUser.displayName ||
          "Neighbour";

        await db.collection("requests")
          .doc(currentChatRequestId)
          .collection("messages")
          .add({

            senderId:
              currentUser.uid,

            senderName:
              userName,

            text:
              text,

            createdAt:
              firebase.firestore.FieldValue
                .serverTimestamp()

          });

        input.value = "";

      } catch (error) {

        console.error(
          "Chat error:",
          error
        );

        showNotification(
          "Message could not be sent.",
          "error"
        );

      } finally {

        if (sendButton) {
          sendButton.disabled = false;
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

  var modal =
    document.getElementById(
      "ratingModal"
    );

  if (!modal) {
    return;
  }

  // Verify that the current user is actually
  // the requester before opening the rating screen.
  db.collection("requests")
    .doc(requestId)
    .get()
    .then(function (doc) {

      if (!doc.exists) {

        showNotification(
          "This request no longer exists.",
          "error"
        );

        return;
      }

      var request =
        doc.data();

      if (
        request.userId !==
        currentUser.uid
      ) {

        showNotification(
          "Only the requester can rate this helper.",
          "error"
        );

        return;
      }

      if (
        request.status !==
        "completed"
      ) {

        showNotification(
          "This job has not been completed yet.",
          "warning"
        );

        return;
      }

      if (request.rating) {

        showNotification(
          "You have already rated this job.",
          "info"
        );

        return;
      }

      ratingTargetRequestId =
        requestId;

      currentRating = 0;

      var score =
        document.getElementById(
          "ratingScore"
        );

      var comment =
        document.getElementById(
          "ratingComment"
        );

      if (score) {
        score.value = "";
      }

      if (comment) {
        comment.value = "";
      }

      updateRatingStars();

      modal.classList.add("active");
      modal.classList.add("show");

      document.body.style.overflow =
        "hidden";

    })
    .catch(function (error) {

      console.error(
        "Open rating error:",
        error
      );

      showNotification(
        "Unable to open rating.",
        "error"
      );

    });
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

  currentRating = 0;

  updateRatingStars();
}


function setRating(score) {

  score =
    Number(score);

  if (
    score < 1 ||
    score > 5
  ) {
    return;
  }

  currentRating =
    score;

  var ratingScore =
    document.getElementById(
      "ratingScore"
    );

  if (ratingScore) {
    ratingScore.value =
      currentRating;
  }

  updateRatingStars();
}


function updateRatingStars() {

  var buttons =
    document.querySelectorAll(
      ".rating-stars button"
    );

  buttons.forEach(
    function (button, index) {

      var score =
        index + 1;

      button.style.opacity =
        score <= currentRating
          ? "1"
          : "0.35";

      button.style.transform =
        score <= currentRating
          ? "scale(1.1)"
          : "scale(1)";

    }
  );
}


// =========================================================
// SUBMIT RATING
// =========================================================

async function submitRating() {

  if (
    !currentUser ||
    !ratingTargetRequestId
  ) {
    return;
  }

  if (
    currentRating < 1 ||
    currentRating > 5
  ) {

    showNotification(
      "Please select a rating from 1 to 5 stars.",
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

  if (comment.length > 500) {

    showNotification(
      "Your review is too long. Please keep it under 500 characters.",
      "warning"
    );

    return;
  }

  try {

    var requestRef =
      db.collection("requests")
        .doc(ratingTargetRequestId);

    var requestDoc =
      await requestRef.get();

    if (!requestDoc.exists) {

      throw new Error(
        "This request no longer exists."
      );
    }

    var request =
      requestDoc.data();

    // =========================================
    // ONLY REQUESTER CAN RATE
    // =========================================

    if (
      request.userId !==
      currentUser.uid
    ) {

      throw new Error(
        "Only the requester can rate the helper."
      );
    }

    if (
      request.status !==
      "completed"
    ) {

      throw new Error(
        "This job has not been completed yet."
      );
    }

    if (request.rating) {

      throw new Error(
        "This job has already been rated."
      );
    }

    if (!request.acceptedBy) {

      throw new Error(
        "No helper is assigned to this request."
      );
    }

    // =========================================
    // SAVE RATING
    // =========================================

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

    // =========================================
    // MARK RATING NOTIFICATION AS READ
    // =========================================

    var notificationSnapshot =
      await db.collection("users")
        .doc(currentUser.uid)
        .collection("notifications")
        .where(
          "requestId",
          "==",
          ratingTargetRequestId
        )
        .where(
          "type",
          "==",
          "rating"
        )
        .where(
          "read",
          "==",
          false
        )
        .get();

    if (!notificationSnapshot.empty) {

      var batch =
        db.batch();

      notificationSnapshot.forEach(
        function (doc) {

          batch.update(
            doc.ref,
            {
              read: true
            }
          );

        }
      );

      await batch.commit();
    }

    // =========================================
    // NOTIFY HELPER
    // =========================================

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
      "Thank you! Your rating has been submitted successfully."
    );

  } catch (error) {

    console.error(
      "Rating error:",
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

function viewUserProfile(
  userId,
  userName
) {

  if (!userId) {
    return;
  }

  var modal =
    document.getElementById(
      "profileModal"
    );

  if (!modal) {
    return;
  }

  var nameElement =
    document.getElementById(
      "profileName"
    );

  var ratingElement =
    document.getElementById(
      "profileRating"
    );

  var jobsElement =
    document.getElementById(
      "profileJobsCount"
    );

  var reviewsElement =
    document.getElementById(
      "profileReviews"
    );

  if (nameElement) {
    nameElement.textContent =
      userName ||
      "Neighbour";
  }

  if (ratingElement) {
    ratingElement.textContent =
      "Loading...";
  }

  if (jobsElement) {
    jobsElement.textContent =
      "0";
  }

  if (reviewsElement) {
    reviewsElement.textContent =
      "0";
  }

  modal.classList.add("active");
  modal.classList.add("show");

  document.body.style.overflow =
    "hidden";

  db.collection("requests")
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
    .get()
    .then(function (snapshot) {

      var totalJobs =
        snapshot.size;

      var totalRating = 0;
      var reviewCount = 0;

      snapshot.forEach(
        function (doc) {

          var data =
            doc.data();

          var rating =
            Number(data.rating);

          if (
            !isNaN(rating) &&
            rating >= 1 &&
            rating <= 5
          ) {

            totalRating +=
              rating;

            reviewCount++;
          }

        }
      );

      var average =
        reviewCount > 0
          ? (
              totalRating /
              reviewCount
            ).toFixed(1)
          : "New";

      if (ratingElement) {
        ratingElement.textContent =
          average;
      }

      if (jobsElement) {
        jobsElement.textContent =
          totalJobs;
      }

      if (reviewsElement) {
        reviewsElement.textContent =
          reviewCount;
      }

    })
    .catch(function (error) {

      console.error(
        "Profile error:",
        error
      );

      if (ratingElement) {
        ratingElement.textContent =
          "New";
      }

    });

  // Load profile photo and details
  db.collection("users")
    .doc(userId)
    .get()
    .then(function (doc) {

      if (!doc.exists) {
        return;
      }

      var data =
        doc.data();

      var profilePhoto =
        data.profilePhoto ||
        "";

      var profileAvatar =
        document.getElementById(
          "profileAvatar"
        );

      if (
        profileAvatar &&
        profilePhoto
      ) {

        if (
          profileAvatar.tagName ===
          "IMG"
        ) {

          profileAvatar.src =
            profilePhoto;

        } else {

          var image =
            profileAvatar.querySelector(
              "img"
            );

          if (image) {
            image.src =
              profilePhoto;
          }
        }
      }

    })
    .catch(function (error) {

      console.error(
        "Profile details error:",
        error
      );

    });
}


function closeProfileModal() {

  var modal =
    document.getElementById(
      "profileModal"
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

  db.collection("users")
    .doc(currentUser.uid)
    .get()
    .then(function (doc) {

      var data =
        doc.exists
          ? doc.data()
          : {};

      var name =
        document.getElementById(
          "editName"
        );

      var skill =
        document.getElementById(
          "editSkill"
        );

      var role =
        document.getElementById(
          "editRole"
        );

      if (name) {

        name.value =
          data.fullName ||
          currentUser.displayName ||
          "";

      }

      if (skill) {

        skill.value =
          data.skill ||
          data.skills ||
          "";

      }

      if (role) {

        role.value =
          data.role ||
          "requester";

      }

      modal.classList.add("active");
      modal.classList.add("show");

      document.body.style.overflow =
        "hidden";

    })
    .catch(function (error) {

      console.error(
        "Open edit profile error:",
        error
      );

      showNotification(
        "Unable to load your profile.",
        "error"
      );

    });
}


function closeEditProfile() {

  var modal =
    document.getElementById(
      "editProfileModal"
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
// SAVE PROFILE CHANGES
// =========================================================

async function saveProfileChanges() {

  if (!currentUser) {
    return;
  }

  var name =
    document.getElementById(
      "editName"
    );

  var skill =
    document.getElementById(
      "editSkill"
    );

  var role =
    document.getElementById(
      "editRole"
    );

  var photo =
    document.getElementById(
      "editProfilePhoto"
    );

  var fullName =
    name
      ? name.value.trim()
      : "";

  var newSkill =
    skill
      ? skill.value.trim()
      : "";

  var newRole =
    role
      ? role.value
      : "requester";

  if (!fullName) {

    showNotification(
      "Please enter your name.",
      "error"
    );

    return;
  }

  if (fullName.length < 2) {

    showNotification(
      "Name must contain at least 2 characters.",
      "warning"
    );

    return;
  }

  try {

    var updates = {

      fullName:
        fullName,

      skill:
        newSkill,

      role:
        newRole

    };

    if (
      photo &&
      photo.files &&
      photo.files.length > 0
    ) {

      var selectedFile =
        photo.files[0];

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

      updates.profilePhoto =
        await getBase64(
          selectedFile
        );
    }

    await db.collection("users")
      .doc(currentUser.uid)
      .update(updates);

    var authProfileUpdates = {

      displayName:
        fullName

    };

    if (
      updates.profilePhoto
    ) {

      authProfileUpdates.photoURL =
        updates.profilePhoto;

    }

    await currentUser.updateProfile(
      authProfileUpdates
    );

    closeEditProfile();

    loadUserProfile();

    showNotification(
      "Profile updated successfully."
    );

  } catch (error) {

    console.error(
      "Profile update error:",
      error
    );

    showNotification(
      error.message ||
      "Unable to update your profile.",
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

  var isDark =
    document.body.classList.contains(
      "dark-theme"
    );

  localStorage.setItem(
    "neighbourlyDarkMode",
    isDark
      ? "true"
      : "false"
  );
}


function loadSavedTheme() {

  var saved =
    localStorage.getItem(
      "neighbourlyDarkMode"
    );

  if (saved === "true") {

    document.body.classList.add(
      "dark-theme"
    );

  }
}


// =========================================================
// LOGOUT
// =========================================================

function logout() {

  auth.signOut()
    .then(function () {

      localStorage.removeItem(
        "isAdminLoggedIn"
      );

      localStorage.removeItem(
        "adminEmail"
      );

      window.location.href =
        "login.html";

    })
    .catch(function (error) {

      console.error(
        "Logout error:",
        error
      );

      showNotification(
        "Unable to logout. Please try again.",
        "error"
      );

    });
}


// =========================================================
// MODAL BACKDROP HANDLING
// =========================================================

function setupModalBackdropHandling() {

  document.addEventListener(
    "click",
    function (event) {

      var requestModal =
        document.getElementById(
          "requestModal"
        );

      if (
        requestModal &&
        event.target ===
          requestModal
      ) {
        closeModal();
      }

      var chatModal =
        document.getElementById(
          "chatModal"
        );

      if (
        chatModal &&
        event.target ===
          chatModal
      ) {
        closeChatModal();
      }

      var ratingModal =
        document.getElementById(
          "ratingModal"
        );

      if (
        ratingModal &&
        event.target ===
          ratingModal
      ) {
        closeRatingModal();
      }

      var profileModal =
        document.getElementById(
          "profileModal"
        );

      if (
        profileModal &&
        event.target ===
          profileModal
      ) {
        closeProfileModal();
      }

      var editModal =
        document.getElementById(
          "editProfileModal"
        );

      if (
        editModal &&
        event.target ===
          editModal
      ) {
        closeEditProfile();
      }

      var notificationsModal =
        document.getElementById(
          "notificationsModal"
        );

      if (
        notificationsModal &&
        event.target ===
          notificationsModal
      ) {
        closeNotifications();
      }

    }
  );
}


// =========================================================
// BUTTON SETUP
// =========================================================

function setupDashboardButtons() {

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


  var editButton =
    document.getElementById(
      "editProfileBtn"
    );

  if (editButton) {

    editButton.addEventListener(
      "click",
      openEditProfile
    );

  }


  var notificationButton =
    document.getElementById(
      "notificationBtn"
    );

  if (notificationButton) {

    notificationButton.addEventListener(
      "click",
      openNotifications
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


  var cancelRequestButton =
    document.getElementById(
      "cancelModalBtn"
    );

  if (cancelRequestButton) {

    cancelRequestButton.addEventListener(
      "click",
      closeModal
    );

  }


  var closeChatButton =
    document.getElementById(
      "closeChatBtn"
    );

  if (closeChatButton) {

    closeChatButton.addEventListener(
      "click",
      closeChatModal
    );

  }


  var closeRatingButton =
    document.getElementById(
      "closeRatingBtn"
    );

  if (closeRatingButton) {

    closeRatingButton.addEventListener(
      "click",
      closeRatingModal
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


  var closeProfileButton =
    document.getElementById(
      "closeProfileBtn"
    );

  if (closeProfileButton) {

    closeProfileButton.addEventListener(
      "click",
      closeProfileModal
    );

  }


  var closeEditButton =
    document.getElementById(
      "closeEditProfileBtn"
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


  var closeNotificationsButton =
    document.getElementById(
      "closeNotificationsBtn"
    );

  if (closeNotificationsButton) {

    closeNotificationsButton.addEventListener(
      "click",
      closeNotifications
    );

  }


  var adminButton =
    document.getElementById(
      "adminDashboardBtn"
    );

  if (adminButton) {

    adminButton.addEventListener(
      "click",
      function () {

        window.location.href =
          "admin.html";

      }
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

}


// =========================================================
// RATING STAR BUTTONS
// =========================================================

function setupRatingButtons() {

  var buttons =
    document.querySelectorAll(
      ".rating-stars button"
    );

  buttons.forEach(
    function (button, index) {

      button.addEventListener(
        "click",
        function () {

          setRating(
            index + 1
          );

        }
      );

    }
  );
}


// =========================================================
// FILTER SETUP
// =========================================================

function setupFilters() {

  var categoryFilter =
    document.getElementById(
      "categoryFilter"
    );

  if (categoryFilter) {

    categoryFilter.addEventListener(
      "change",
      filterRequests
    );

  }

  var distanceFilter =
    document.getElementById(
      "distanceFilter"
    );

  if (distanceFilter) {

    distanceFilter.addEventListener(
      "change",
      filterRequests
    );

  }
}


// =========================================================
// ESC KEY — CLOSE MODALS
// =========================================================

function setupEscapeKey() {

  document.addEventListener(
    "keydown",
    function (event) {

      if (
        event.key !==
        "Escape"
      ) {
        return;
      }

      closeModal();
      closeChatModal();
      closeRatingModal();
      closeProfileModal();
      closeEditProfile();
      closeNotifications();

    }
  );
}


// =========================================================
// INITIALIZATION
// =========================================================

document.addEventListener(
  "DOMContentLoaded",
  function () {

    loadSavedTheme();

    initializeMap();

    setupRequestForm();

    setupChatForm();

    setupDashboardButtons();

    setupRatingButtons();

    setupFilters();

    setupModalBackdropHandling();

    setupEscapeKey();

  }
);


// =========================================================
// END OF NEIGHBOURLY MAIN SCRIPT
// =========================================================
