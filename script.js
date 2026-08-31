// 1. Initialize Leaflet Map
var map = L.map('map').setView([6.3350, 5.6037], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap'
}).addTo(map);

// 2. Global functions for modals and logout
window.openModal = function() {
  const modal = document.getElementById('requestModal');
  if (modal) modal.style.display = 'flex';
};

window.closeModal = function() {
  const modal = document.getElementById('requestModal');
  if (modal) modal.style.display = 'none';
};

window.logoutUser = function() { window.location.href = 'index.html'; };
window.logoutuser = function() { window.location.href = 'index.html'; };

// 3. Define toggleDarkMode globally so HTML onclick works without errors
window.toggleDarkMode = function() {
  executeDarkMode();
};
window.toggledarkmode = function() {
  executeDarkMode();
};

function executeDarkMode() {
  // Toggle classes
  document.body.classList.toggle('dark-mode');
  document.body.classList.toggle('dark');
  
  // Force visual dark styling on body and sidebar panels
  if (document.body.style.backgroundColor === 'rgb(18, 18, 18)') {
    document.body.style.backgroundColor = '';
    document.body.style.color = '';
  } else {
    document.body.style.backgroundColor = '#121212';
    document.body.style.color = '#ffffff';
  }
}

// 4. Backup click listener
document.addEventListener('click', (e) => {
  const target = e.target.closest('button') || e.target;
  const text = target.textContent || target.innerText || '';
  
  if (text.includes('Dark') || text.includes('Mode') || text.includes('🌙')) {
    e.preventDefault();
    executeDarkMode();
  }
});
