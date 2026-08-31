// Initialize Leaflet Map
var map = L.map('map').setView([6.3350, 5.6037], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap'
}).addTo(map);

// Request Help Modal Logic
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
