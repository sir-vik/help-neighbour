// Initialize Leaflet Map
var map = L.map('map').setView([6.3350, 5.6037], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap'
}).addTo(map);

// Global modal and logout functions
window.openModal = function() { document.getElementById('requestModal').style.display = 'flex'; };
window.closeModal = function() { document.getElementById('requestModal').style.display = 'none'; };
window.logoutUser = function() { window.location.href = 'index.html'; };
window.logoutuser = function() { window.location.href = 'index.html'; };

// Log EVERY click anywhere on the whole page to the console
document.addEventListener('click', (e) => {
  console.log("YOU CLICKED THIS:", e.target);
});
