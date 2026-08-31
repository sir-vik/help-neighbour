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

// 3. Direct button isolation for Dark Mode
function setupDarkModeButton() {
  const darkBtn = document.getElementById('themeToggle');
  if (darkBtn) {
    // Remove inline onclick attribute to prevent conflicts
    darkBtn.removeAttribute('onclick');
    
    // Attach a clean listener that completely traps the click
    darkBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation(); // Stops it from triggering "Requests Near You"
      
      document.body.classList.toggle('dark-mode');
      document.body.classList.toggle('dark');
      
      if (document.body.style.backgroundColor === 'rgb(18, 18, 18)') {
        document.body.style.backgroundColor = '';
        document.body.style.color = '';
      } else {
        document.body.style.backgroundColor = '#121212';
        document.body.style.color = '#ffffff';
      }
    }, true); // Capture phase traps the click first
  }
}

// Run immediately and also on window load
setupDarkModeButton();
window.addEventListener('DOMContentLoaded', setupDarkModeButton);
