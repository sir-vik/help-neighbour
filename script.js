// 1. Initialize Leaflet Map
var map = L.map('map').setView([6.3350, 5.6037], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap'
}).addTo(map);

// 2. Request Help Modal Logic
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

// 3. Dark Mode Toggle Logic
const darkModeBtn = document.querySelector('button:has-text("Dark Mode")') || document.getElementById('darkModeBtn');
// (If your dark mode button has a specific ID like id="darkModeBtn", make sure to use it, otherwise this toggles body dark class)
const darkModeToggle = document.querySelector('button:contains("Dark Mode")');

// General handler for Dark Mode button
const darkBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Dark Mode'));
if (darkBtn) {
  darkBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
  });
}

// 4. Log Out Logic
const logoutBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Log Out'));
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    window.location.href = 'index.html'; // Or wherever your login page redirects
  });
}
