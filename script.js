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

// 3. Bulletproof Dark Mode Handler with immediate event termination
document.addEventListener('click', (e) => {
  const target = e.target.closest('#themeToggle') || e.target.closest('button');
  
  if (target && (target.id === 'themeToggle' || target.textContent.includes('Dark') || target.textContent.includes('🌙'))) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation(); // Stops the click from reaching "Requests Near You"
    
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
}, true); // Use capture phase to intercept the click first!
