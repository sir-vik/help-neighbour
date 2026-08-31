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

window.logoutUser = function() { window.location.href = 'index.html'; };
window.logoutuser = function() { window.location.href = 'index.html'; };

// 3. Foolproof Dark Mode Debugger & Force Toggle
document.addEventListener('click', (e) => {
  const target = e.target.closest('button') || e.target;
  const text = target.textContent || target.innerText || '';
  
  if (text.includes('Dark') || text.includes('Mode') || text.includes('🌙')) {
    e.preventDefault();
    console.log("Dark mode button successfully clicked!");
    
    // Toggle classes
    document.body.classList.toggle('dark-mode');
    document.body.classList.toggle('dark');
    
    // Force direct background and text color change so you see it instantly
    if (document.body.style.backgroundColor === 'rgb(18, 18, 18)') {
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
      console.log("Switched to Light Mode");
    } else {
      document.body.style.backgroundColor = '#121212';
      document.body.style.color = '#ffffff';
      console.log("Switched to Dark Mode");
    }
  }
});
