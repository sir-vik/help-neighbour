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

// 3. Robust Button Finders (Ignores emojis and spaces)
const allButtons = document.querySelectorAll('button');

allButtons.forEach(btn => {
  const text = btn.textContent || btn.innerText;

  // Request Help Button fallback if ID is missing
  if (text.includes('Request Help')) {
    btn.addEventListener('click', () => {
      if (modal) modal.style.display = 'flex';
    });
  }

  // Dark Mode Button
  if (text.includes('Dark Mode')) {
    btn.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
    });
  }

  // Log Out Button
  if (text.includes('Log Out')) {
    btn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }
});
