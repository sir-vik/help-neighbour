// 1. Firebase Configuration
var firebaseConfig = {
  apiKey: "AIzaSyAWWS_hRRX3XrbSHQgUqd6YYnVtAtfbO3w",
  authDomain: "help-neighbour-a468b.firebaseapp.com",
  databaseURL: "https://help-neighbour-a468b-default-rtdb.firebaseio.com",
  projectId: "help-neighbour-a468b",
  storageBucket: "help-neighbour-a468b.firebasestorage.app",
  messagingSenderId: "94455126492",
  appId: "1:94455126492:web:406cff5288ad7cff5ad719",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

var db = firebase.firestore();
var auth = firebase.auth();

// Global App Variables
var currentUser = null;
var map, userMarker;
var requestMarkers = {};
var allOpenRequests = [];
var ratingTargetRequestId = null;
window.userLat = 6.4531;
window.userLng = 3.4331;
var currentChatRequestId = null;
var chatUnsubscribe = null;

// Helper: Calculate Distance in Kilometers (Haversine Formula)
function getDistanceInKm(lat1, lon1, lat2, lon2) {
  var R = 6371; 
  var dLat = (lat2 - lat1) * (Math.PI / 180);
  var dLon = (lon2 - lon1) * (Math.PI / 180);
  var a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c;
}

// Helper: Toast Notifications
function showNotification(message) {
  var toast = document.createElement('div');
  toast.innerText = message;
  toast.style.cssText = 'position:fixed; bottom:20px; right:20px; background:#0f766e; color:white; padding:12px 18px; border-radius:8px; font-size:13px; font-weight:bold; box-shadow:0 4px 6px rgba(0,0,0,0.1); z-index:10000; transition:all 0.3s;';
  document.body.appendChild(toast);
  setTimeout(function() { toast.remove(); }, 4000);
}
// ==========================================
// LOAD USER PROFILE
// ==========================================

function loadUserProfile() {

  if (!currentUser) {
    return;
  }

  var userName = document.getElementById("userName");
  var userEmail = document.getElementById("userEmail");
  var userSkill = document.getElementById("userSkill");
  var userRole = document.getElementById("userRole");
  var userInitial = document.getElementById("userInitial");

  if (!userName) {
    return;
  }

  // Get name and email from Firebase Authentication
  var name = currentUser.displayName || "Neighbour";

  userName.innerText = name;
  userEmail.innerText = currentUser.email || "";
  userInitial.innerText = name.charAt(0).toUpperCase();


  // Get skill and role from Firestore
  db.collection("users")
    .doc(currentUser.uid)
    .get()
    .then(function(doc) {

      if (doc.exists) {

        var data = doc.data();

        userName.innerText = data.fullName || name;
        userSkill.innerText = data.skill || "Not specified";

        if (data.role === "helper") {

          userRole.innerText = "Helper";

        } else if (data.role === "requester") {

          userRole.innerText = "Requester";

        } else {

          userRole.innerText = "Helper & Requester";

        }

      } else {

        userSkill.innerText = "Not specified";
        userRole.innerText = "Helper & Requester";

      }

    })
    .catch(function(error) {

      console.error("Profile loading error:", error);

      userSkill.innerText = "Unavailable";
      userRole.innerText = "Unavailable";

    });
}
// ==========================================
// FIREBASE NOTIFICATION LISTENER
// ==========================================

function listenToNotifications() {
  if (!currentUser) return;

  db.collection("users")
    .doc(currentUser.uid)
    .collection("notifications")
    .orderBy("createdAt", "desc")
    .limit(20)
    .onSnapshot(function(snapshot) {

      var list = document.getElementById("notificationsList");
      var badge = document.getElementById("notificationBadge");

      if (!list || !badge) return;

      list.innerHTML = "";

      var unreadCount = 0;

      if (snapshot.empty) {
        list.innerHTML =
          '<p style="font-size:12px; color:#94a3b8; text-align:center;">No notifications yet.</p>';
        badge.style.display = "none";
        return;
      }

      snapshot.forEach(function(doc) {

        var data = doc.data();

        if (data.read === false) {
          unreadCount++;
        }

        var item = document.createElement("div");

        item.style.cssText =
          "padding:10px; margin-bottom:8px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;";

        item.innerHTML =
          '<div style="font-size:12px; font-weight:bold; color:#0f172a;">' +
          (data.message || "New notification") +
          '</div>' +
          '<div style="font-size:10px; color:#94a3b8; margin-top:4px;">' +
          (data.createdAt
            ? data.createdAt.toDate().toLocaleString()
            : "Just now") +
          '</div>';

        list.appendChild(item);
      });

      if (unreadCount > 0) {
        badge.innerText = unreadCount;
        badge.style.display = "inline-block";
      } else {
        badge.style.display = "none";
      }

    }, function(error) {

      console.error("Notification listener error:", error);

    });
}

// 2. Auth State Listener
auth.onAuthStateChanged(function(user) {

  if (user) {

    currentUser = user;

    console.log("Logged in as:", user.email);

    // Load user's profile
loadUserProfile();

// Load active jobs
listenToActiveJobs();

// Load notifications
listenToNotifications();

  } else {

    window.location.href = "login.html";

  }

});

// 3. Global Controls
function openModal() {
  var modal = document.getElementById('requestModal');
  if (modal) modal.style.display = 'flex';
}

function closeModal() {
  var modal = document.getElementById('requestModal');
  if (modal) modal.style.display = 'none';
}

function logoutUser() {
  auth.signOut().then(function() {
    window.location.href = "login.html";
  });
}

// 4. Main App Logic on DOM Load
document.addEventListener('DOMContentLoaded', function() {
  var mapContainer = document.getElementById('map');
  
  if (mapContainer) {
    map = L.map('map').setView([window.userLat, window.userLng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    userMarker = L.marker([window.userLat, window.userLng])
      .addTo(map)
      .bindPopup('You are here')
      .openPopup();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function(position) {
          window.userLat = position.coords.latitude;
          window.userLng = position.coords.longitude;

          map.setView([window.userLat, window.userLng], 14);
          userMarker.setLatLng([window.userLat, window.userLng])
                    .bindPopup('📍 Your Actual Live Location')
                    .openPopup();
          filterRequests();
        },
        function(error) {
          console.warn("Geolocation fallback active.");
        },
        { enableHighAccuracy: true }
      );
    }
  }

  // Dispatch Request Form Submission
 var reqForm = document.getElementById('createRequestForm');
if (reqForm) {
  reqForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!currentUser) return alert("You must be logged in!");

    var title = document.getElementById('reqTitle').value.trim();
var category = document.getElementById('reqCategory').value;
var skillNeeded = document.getElementById('reqSkill').value.trim();
var description = document.getElementById('reqDescription').value.trim();
    var imageFile = document.getElementById('reqImage').files[0];
    var imageBase64 = null;

    if (imageFile) {
      imageBase64 = await getBase64(imageFile);
    }

    try {
      await db.collection('requests').add({
  title: title,
  category: category,
  skillNeeded: skillNeeded,
  description: description,
        imageUrl: imageBase64,
        location: new firebase.firestore.GeoPoint(window.userLat, window.userLng),
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email.split('@')[0],
        status: "open",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      showNotification("🎉 Help Request Posted with Photo!");
      closeModal();
      reqForm.reset();
    } catch (error) {
      alert("Error: " + error.message);
    }
  });
}

  // Real-time Firestore Listener: Open Requests
  db.collection('requests').where('status', '==', 'open')
    .onSnapshot(function(snapshot) {
      allOpenRequests = [];
      snapshot.forEach(function(doc) {
        var data = doc.data();
        data.id = doc.id;
        allOpenRequests.push(data);
      });
      filterRequests();
    }, function(error) {
      console.error("Firestore listen error:", error);
    });

  // Chat Form Submission
  var chatForm = document.getElementById('chatForm');
  if (chatForm) {
    chatForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      var input = document.getElementById('chatInput');
      var text = input.value.trim();

      if (!text || !currentChatRequestId || !currentUser) return;

      try {
        await db.collection('requests').doc(currentChatRequestId).collection('messages').add({
          text: text,
          senderId: currentUser.uid,
          senderName: currentUser.displayName || currentUser.email.split('@')[0],
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        input.value = '';
      } catch (error) {
        alert("Message failed: " + error.message);
      }
    });
  }
});
// Category and Distance Filter Logic
function filterRequests() {
  var categoryVal = document.getElementById('categoryFilter') ? document.getElementById('categoryFilter').value : 'All';
  var distanceVal = document.getElementById('distanceFilter') ? parseFloat(document.getElementById('distanceFilter').value) : 100;

  var listContainer = document.getElementById('request-list');
  if (!listContainer) return;

  listContainer.innerHTML = '';

  Object.values(requestMarkers).forEach(function(marker) {
    if (map) map.removeLayer(marker);
  });
  requestMarkers = {};

  allOpenRequests.forEach(function(data) {
    var categoryMatch = (categoryVal === 'All' || data.category === categoryVal);
    var helperSkill = document.getElementById('userSkill') ? document.getElementById('userSkill').innerText.trim().toLowerCase() : '';

var skillMatch = !helperSkill || helperSkill === 'not specified' || 
  !data.skillNeeded || data.skillNeeded.toLowerCase() === helperSkill;
    var dist = 0;
    if (data.location) {
      dist = getDistanceInKm(window.userLat, window.userLng, data.location.latitude, data.location.longitude);
    }
    var distanceMatch = dist <= distanceVal;

    if (categoryMatch && skillMatch && distanceMatch) {
      var card = document.createElement('div');
      card.style.background = '#f8fafc';
      card.style.border = '1px solid #e2e8f0';
      card.style.padding = '12px';
      card.style.borderRadius = '8px';
      card.style.marginBottom = '10px';
      
      // Image html check
      var imgHtml = data.imageUrl ? '<img src="' + data.imageUrl + '" style="width:100%; height:120px; object-fit:cover; border-radius:6px; margin: 6px 0;">' : '';

      card.innerHTML = 
        '<div style="display:flex; justify-content:space-between;"><span style="font-size:11px; color:#0d9488; font-weight:bold;">' + (data.category || 'General') + '</span><span style="font-size:10px; color:#64748b;">' + dist.toFixed(1) + ' km away</span></div>' +
        '<h4 style="margin: 4px 0;">' + data.title + '</h4>' +
        '<p style="font-size: 12px; color: #0f766e; font-weight: bold; margin-bottom: 4px;">Skill Needed: ' + (data.skillNeeded || 'Not specified') + '</p>' +
        '<p style="font-size: 12px; color: #475569; margin-bottom: 4px;">' + data.description + '</p>' +
        imgHtml +
        '<button onclick="acceptRequest(\'' + data.id + '\')" style="width: 100%; background: #0f766e; color: white; border: none; padding: 6px; border-radius: 4px; font-weight: bold; cursor: pointer; margin-top: 4px;">Accept Request</button>';
      
      listContainer.appendChild(card);

      if (data.location && map) {
        var mapImgHtml = data.imageUrl ? '<img src="' + data.imageUrl + '" style="width:100%; height:80px; object-fit:cover; border-radius:4px; margin:4px 0;">' : '';
        var requestPin = L.marker([data.location.latitude, data.location.longitude])
          .addTo(map)
          .bindPopup(
            '<b style="color: #0f766e;">' + data.title + '</b><br>' +
            '<span style="font-size: 12px;">' + data.description + '</span><br>' +
            mapImgHtml + '<br>' +
            '<button onclick="acceptRequest(\'' + data.id + '\')" style="background: #0f766e; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-weight: bold; cursor: pointer;">Accept</button>'
          );
        
        requestMarkers[data.id] = requestPin;
      }
    }
  });
}

// 5. Accept Request Logic
async function acceptRequest(requestId) {
  if (!currentUser) return alert("You must be logged in!");

  try {

    // Get the request first
    var requestDoc = await db.collection("requests").doc(requestId).get();

    if (!requestDoc.exists) {
      alert("Request not found.");
      return;
    }

    var requestData = requestDoc.data();
    var helperDoc = await db.collection("users").doc(currentUser.uid).get();
var helperData = helperDoc.data();
var helperSkill = (helperData.skill || "").trim().toLowerCase();
var requiredSkill = (requestData.skillNeeded || "").trim().toLowerCase();

    // Don't allow someone to accept their own request
    if (requestData.userId === currentUser.uid) {
      alert("You cannot accept your own request.");
      return;
    }
   if (requiredSkill && helperSkill !== requiredSkill) {
  alert("You cannot accept this request because it requires a different skill.");
  return;
} 

    // Accept the request
    await db.collection("requests").doc(requestId).update({
      status: "accepted",
      acceptedBy: currentUser.uid,
      acceptedByName: currentUser.displayName || currentUser.email,
      acceptedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Create notification for the person who posted the request
    await db.collection("users")
      .doc(requestData.userId)
      .collection("notifications")
      .add({
        message:
          "🤝 " +
          (currentUser.displayName || "A neighbour") +
          " accepted your request: " +
          requestData.title,

        type: "request_accepted",

        requestId: requestId,

        read: false,

        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

    showNotification("🤝 Request Accepted successfully!");

  } catch (error) {

    console.error("Accept request error:", error);

    alert("Error accepting request: " + error.message);
  }
}

// 6. Real-time Active Jobs Listener
function listenToActiveJobs() {
  if (!currentUser) return;

  db.collection('requests')
    .where('status', 'in', ['open', 'accepted'])
    .onSnapshot(function(snapshot) {
      var activeContainer = document.getElementById('active-jobs-list');
      if (!activeContainer) return;

      activeContainer.innerHTML = '';
      var activeCount = 0;

      snapshot.forEach(function(doc) {
        var data = doc.data();
        var isMyPost = data.userId === currentUser.uid;
        var isMyAccept = data.acceptedBy === currentUser.uid;

        if (isMyPost || isMyAccept) {
          activeCount++;
          var card = document.createElement('div');
          var isAccepted = (data.status === 'accepted');

          card.style.background = isAccepted ? '#f0fdf4' : '#fff7ed';
          card.style.border = isAccepted ? '1px solid #bbf7d0' : '1px solid #ffedd5';
          card.style.padding = '12px';
          card.style.borderRadius = '8px';
          card.style.marginBottom = '10px';

          var badgeText = isMyPost ? 'POSTED BY YOU' : 'YOU ACCEPTED';
          var badgeBg = isMyPost ? '#3b82f6' : '#8b5cf6';
          var statusText = isAccepted ? '● In Progress' : '○ Searching Helper';
          var statusColor = isAccepted ? '#16a34a' : '#ea580c';

          var actionButtons = '';
          if (isAccepted) {
            actionButtons = 
              '<div style="display: flex; gap: 6px;">' +
                '<button onclick="openChat(\'' + doc.id + '\', \'' + data.title + '\')" style="flex: 1; background: #0284c7; color: white; border: none; padding: 6px; border-radius: 4px; font-weight: bold; cursor: pointer;">💬 Chat</button>' +
                '<button onclick="openRatingModal(\'' + doc.id + '\')" style="flex: 1; background: #16a34a; color: white; border: none; padding: 6px; border-radius: 4px; font-weight: bold; cursor: pointer;">Done ✔️</button>' +
              '</div>';
          }

          card.innerHTML = 
            '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">' +
              '<span style="font-size: 10px; font-weight: bold; background: ' + badgeBg + '; color: white; padding: 2px 6px; border-radius: 4px;">' + badgeText + '</span>' +
              '<span style="font-size: 11px; font-weight: bold; color: ' + statusColor + ';">' + statusText + '</span>' +
            '</div>' +
            '<h4 style="margin: 4px 0;">' + data.title + '</h4>' +
            '<p style="font-size: 12px; color: #475569; margin-bottom: 8px;">' + data.description + '</p>' +
            actionButtons;

          activeContainer.appendChild(card);
        }
      });

      if (activeCount === 0) {
        activeContainer.innerHTML = '<p style="font-size: 12px; color: #94a3b8;">No active jobs currently.</p>';
      }
    });
}

// 7. Ratings and Complete Job Logic
function openRatingModal(requestId) {
  ratingTargetRequestId = requestId;
  var modal = document.getElementById('ratingModal');
  if (modal) modal.style.display = 'flex';
}

function closeRatingModal() {
  var modal = document.getElementById('ratingModal');
  if (modal) modal.style.display = 'none';
  ratingTargetRequestId = null;
}

async function submitRating() {
  if (!ratingTargetRequestId) return;

  var score = document.getElementById('ratingScore').value;
  var comment = document.getElementById('ratingComment').value.trim();

  try {
    await db.collection('requests').doc(ratingTargetRequestId).update({
      status: "completed",
      ratingScore: score,
      ratingComment: comment,
      completedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    showNotification("⭐ Thank you for rating!");
    closeRatingModal();
  } catch (error) {
    alert("Error saving rating: " + error.message);
  }
}

// 8. Real-Time Chat Functions
function openChat(requestId, title) {
  currentChatRequestId = requestId;
  document.getElementById('chatTitle').innerText = 'Chat: ' + title;
  document.getElementById('chatModal').style.display = 'flex';

  var chatContainer = document.getElementById('chatMessages');
  chatContainer.innerHTML = '';

  if (chatUnsubscribe) chatUnsubscribe();

  chatUnsubscribe = db.collection('requests').doc(requestId).collection('messages')
    .orderBy('createdAt', 'asc')
    .onSnapshot(function(snapshot) {
      chatContainer.innerHTML = '';

      if (snapshot.empty) {
        chatContainer.innerHTML = '<p style="font-size: 12px; color: #94a3b8; text-align: center;">No messages yet. Say hi!</p>';
        return;
      }

      snapshot.forEach(function(doc) {
        var msg = doc.data();
        var isMe = currentUser && (msg.senderId === currentUser.uid);

        var msgBubble = document.createElement('div');
        msgBubble.style.maxWidth = '75%';
        msgBubble.style.padding = '10px 14px';
        msgBubble.style.borderRadius = '12px';
        msgBubble.style.fontSize = '13px';
        msgBubble.style.lineHeight = '1.4';
        msgBubble.style.alignSelf = isMe ? 'flex-end' : 'flex-start';
        msgBubble.style.background = isMe ? '#0d9488' : '#e2e8f0';
        msgBubble.style.color = isMe ? 'white' : '#0f172a';

        msgBubble.innerHTML = 
          '<div style="font-size: 10px; font-weight: bold; opacity: 0.85; margin-bottom: 3px; color: ' + (isMe ? '#e6fffa' : '#475569') + ';">' + msg.senderName + '</div>' +
          '<div style="word-break: break-word;">' + msg.text + '</div>';

        chatContainer.appendChild(msgBubble);
      });

      chatContainer.scrollTop = chatContainer.scrollHeight;
    });
}

function closeChatModal() {
  document.getElementById('chatModal').style.display = 'none';
  if (chatUnsubscribe) chatUnsubscribe();
  currentChatRequestId = null;
}
// 1. Dark Mode Toggle
function toggleDarkMode() {
  var isDark = document.body.classList.toggle('dark-theme');
  document.getElementById('themeToggle').innerText = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';

  // Grab sidebar and request cards
  var sidebar = document.querySelector('.sidebar');
  var boxes = document.querySelectorAll('.sidebar > div');

  if (isDark) {
    if (sidebar) sidebar.style.backgroundColor = '#1e293b';
    boxes.forEach(function(box) {
      box.style.backgroundColor = '#334155';
      box.style.color = '#ffffff';
    });
  } else {
    if (sidebar) sidebar.style.backgroundColor = '#ffffff';
    boxes.forEach(function(box) {
      box.style.backgroundColor = '#e6f4f1';
      box.style.color = '#334155';
    });
  }
}

// 2. Base64 Image Helper for Photo Uploads
function getBase64(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function() { resolve(reader.result); };
    reader.onerror = function(error) { reject(error); };
  });
}

// 3. View Helper Profile & Average Rating
async function viewUserProfile(userId, userName) {
  var profileModal = document.getElementById('profileModal');
  document.getElementById('profileName').innerText = userName || "User Profile";
  var reviewsContainer = document.getElementById('profileReviews');
  reviewsContainer.innerHTML = 'Loading reviews...';
  
  if (profileModal) profileModal.style.display = 'flex';

  try {
    var snapshot = await db.collection('requests')
      .where('acceptedBy', '==', userId)
      .where('status', '==', 'completed')
      .get();

    var totalScore = 0;
    var count = 0;
    reviewsContainer.innerHTML = '';

    snapshot.forEach(function(doc) {
      var data = doc.data();
      if (data.ratingScore) {
        count++;
        totalScore += parseInt(data.ratingScore);
        
        var rev = document.createElement('div');
        rev.style.cssText = 'border-bottom: 1px solid #e2e8f0; padding: 6px 0;';
        rev.innerHTML = '<b>' + '⭐'.repeat(data.ratingScore) + '</b><br><span>' + (data.ratingComment || 'No comment provided.') + '</span>';
        reviewsContainer.appendChild(rev);
      }
    });

    var avg = count > 0 ? (totalScore / count).toFixed(1) : "No ratings yet";
    document.getElementById('profileRating').innerText = count > 0 ? '⭐ ' + avg + ' / 5.0' : 'No ratings yet';
    document.getElementById('profileJobsCount').innerText = 'Completed Jobs: ' + count;

    if (count === 0) {
      reviewsContainer.innerHTML = '<p style="color:#94a3b8; text-align:center;">No completed job reviews yet.</p>';
    }
  } catch (err) {
    console.error(err);
  }
}

function closeProfileModal() {
  var profileModal = document.getElementById('profileModal');
  if (profileModal) profileModal.style.display = 'none';
}
// Connect the button to the request modal
const modal = document.getElementById('requestModal');
const requestBtn = document.getElementById('requestHelpBtn');
const cancelBtn = document.getElementById('cancelModalBtn');

if (requestBtn && modal) {
  requestBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
  });
}

if (cancelBtn && modal) {
  cancelBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });
}
// Quick listener for your register form
document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.querySelector("form.auth-form"); // Adjust selector if needed
    
    if (registerForm) {
        registerForm.addEventListener("submit", (e) => {
            // This grabs the skill the user typed in your new HTML field
            const helperSkills = document.getElementById("helperSkills") ? document.getElementById("helperSkills").value : "";
            
            console.log("Helper skills captured for registration:", helperSkills);
            // Your existing Firebase auth code will handle the rest, 
            // just make sure to include skills: helperSkills when saving to Firestore!
        });
    }
});
function openEditProfile() {
  document.getElementById("editName").value =
    document.getElementById("userName").innerText;

  document.getElementById("editSkill").value =
    document.getElementById("userSkill").innerText;

  document.getElementById("editRole").value =
    document.getElementById("userRole").innerText;

  document.getElementById("editProfileModal").style.display = "flex";
}

function closeEditProfile() {
  document.getElementById("editProfileModal").style.display = "none";
}
async function saveProfileChanges() {
  if (!currentUser) {
    alert("You must be logged in!");
    return;
  }

  var newName = document.getElementById("editName").value.trim();
  var newSkill = document.getElementById("editSkill").value.trim();
  var newRole = document.getElementById("editRole").value.trim();

  if (!newName || !newSkill || !newRole) {
    alert("Please fill all the fields.");
    return;
  }

  try {
    await db.collection("users").doc(currentUser.uid).update({
      fullName: newName,
      skill: newSkill,
      role: newRole.toLowerCase()
    });

    await currentUser.updateProfile({
      displayName: newName
    });

    document.getElementById("userName").innerText = newName;
    document.getElementById("userSkill").innerText = newSkill;

    if (newRole.toLowerCase() === "helper") {
      document.getElementById("userRole").innerText = "Helper";
    } else if (newRole.toLowerCase() === "requester") {
      document.getElementById("userRole").innerText = "Requester";
    } else {
      document.getElementById("userRole").innerText = "Helper & Requester";
    }

    document.getElementById("userInitial").innerText =
      newName.charAt(0).toUpperCase();

    closeEditProfile();

    showNotification("✅ Profile updated successfully!");

  } catch (error) {
    console.error("Profile update error:", error);
    alert("Could not update profile: " + error.message);
  }
}
// ==========================================
// NOTIFICATIONS
// ==========================================

var notifications = [];

function addNotification(message) {
  notifications.unshift({
    message: message,
    time: new Date().toLocaleTimeString()
  });

  updateNotificationUI();
}

function updateNotificationUI() {
  var badge = document.getElementById("notificationBadge");
  var list = document.getElementById("notificationsList");

  if (!badge || !list) return;

  if (notifications.length > 0) {
    badge.innerText = notifications.length;
    badge.style.display = "inline-block";
  } else {
    badge.style.display = "none";
  }

  list.innerHTML = "";

  notifications.forEach(function(notification) {
    var item = document.createElement("div");

    item.style.cssText =
      "padding:10px; margin-bottom:8px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0;";

    item.innerHTML =
      "<strong style='font-size:12px;'>🔔 " +
      notification.message +
      "</strong>" +
      "<div style='font-size:10px; color:#94a3b8; margin-top:4px;'>" +
      notification.time +
      "</div>";

    list.appendChild(item);
  });
}

function openNotifications() {
  var modal = document.getElementById("notificationsModal");

  if (modal) {
    modal.style.display = "flex";
  }

  var badge = document.getElementById("notificationBadge");

  if (badge) {
    badge.style.display = "none";
  }
}

function closeNotifications() {
  var modal = document.getElementById("notificationsModal");

  if (modal) {
    modal.style.display = "none";
  }
}
