// 1. Initialize Leaflet Map
var map = L.map('map').setView([6.3350, 5.6037], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap'
}).addTo(map);

// 2. Global functions
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
  document.body.classList.toggle('dark');
  
  // Visual fallback so you immediately see the change
  if (document.body.style.backgroundColor === 'rgb(18, 18, 18)') {
    document.body.style.backgroundColor = '';
    document.body.style.color = '';
  } else {
    document.body.style.backgroundColor = '#121212';
    document.body.style.color = '#ffffff';
  }
};

window.logoutUser = function() {
  window.location.href = 'index.html';
};

window.logoutuser = function() {
  window.location.href = 'index.html';
};

// 3. Backup event listener for Dark Mode button text
document.addEventListener('DOMContentLoaded', () => {
  const allButtons = document.querySelectorAll('button');
  allButtons.forEach(btn => {
    const text = btn.textContent || btn.innerText;
    
    if (text.includes('Dark Mode')) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.toggleDarkMode();
      });
    }
  });
});
