// 1. Initialize Leaflet Map
var map = L.map('map').setView([6.3350, 5.6037], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap'
}).addTo(map);

// 2. Modal and logout handlers
window.openModal = function() { document.getElementById('requestModal').style.display = 'flex'; };
window.closeModal = function() { document.getElementById('requestModal').style.display = 'none'; };
window.logoutUser = function() { window.location.href = 'index.html'; };
window.logoutuser = function() { window.location.href = 'index.html'; };

// 3. Precise Dark Mode Handler using the exact button ID
document.addEventListener('DOMContentLoaded', () => {
  const themeToggleBtn = document.getElementById('themeToggle');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Stop click from affecting other sections
      document.body.classList.toggle('dark-mode');
      document.body.classList.toggle('dark');
      
      if (document.body.style.backgroundColor === 'rgb(18, 18, 18)') {
        document.body.style.backgroundColor = '';
        document.body.style.color = '';
      } else {
        document.body.style.backgroundColor = '#121212';
        document.body.style.color = '#ffffff';
      }
    });
  }
});

// Fallback global listener specifically looking for element ID 'themeToggle'
document.addEventListener('click', (e) => {
  if (e.target.id === 'themeToggle' || e.target.closest('#themeToggle')) {
    e.preventDefault();
    e.stopPropagation();
    document.body.classList.toggle('dark-mode');
    document.body.classList.toggle('dark');
    
    if (document.body.style.backgroundColor === 'rgb(18, 18, 18)') {
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
    } else {
      document.body.style.backgroundColor = '#121212';
      document.body.style.color = '#ffffff';
    }
  }
});
