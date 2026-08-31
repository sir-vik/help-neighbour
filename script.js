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

// Catch any possible spelling of dark mode functions in HTML
window.toggleDarkMode = function() { toggleDark(); };
window.toggledarkmode = function() { toggleDark(); };

function toggleDark() {
  document.body.classList.toggle('dark-mode');
  document.body.classList.toggle('dark');
  
  // Direct inline style fallback to guarantee background changes
  if (document.body.style.backgroundColor === 'rgb(18, 18, 18)') {
    document.body.style.backgroundColor = '';
    document.body.style.color = '';
  } else {
    document.body.style.backgroundColor = '#121212';
    document.body.style.color = '#ffffff';
  }
}

window.logoutUser = function() { window.location.href = 'index.html'; };
window.logoutuser = function() { window.location.href = 'index.html'; };

// 3. Force-bind event listeners to any button containing "Dark Mode"
document.addEventListener('click', (e) => {
  const target = e.target.closest('button');
  if (target && (target.textContent.includes('Dark Mode') || target.innerText.includes('Dark Mode'))) {
    e.preventDefault();
    toggleDark();
  }
});
