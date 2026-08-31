// 1. Initialize Leaflet Map
var map = L.map('map').setView([6.3350, 5.6037], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap'
}).addTo(map);

// 2. Global functions matching all possible HTML onclick attributes
window.openModal = function() {
  const modal = document.getElementById('requestModal');
  if (modal) modal.style.display = 'flex';
};

window.closeModal = function() {
  const modal = document.getElementById('requestModal');
  if (modal) modal.style.display = 'none';
};

window.toggleDarkMode = function() {
  document.body.classList.toggle('dark-mode');
};

// Cover both camelCase and lowercase variations for logout
window.logoutUser = function() {
  window.location.href = 'index.html';
};

window.logoutuser = function() {
  window.location.href = 'index.html';
};
