// Function to run everything safely right away
function initHelpGrid() {
  // 1. Initialize Leaflet Map safely
  try {
    var mapElement = document.getElementById('map');
    if (mapElement && !mapElement._leaflet_id) {
      var map = L.map('map').setView([6.3350, 5.6037], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(map);
    }
  } catch (err) {
    console.log("Map note:", err);
  }

  // 2. Modal and logout functions
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

  // 3. Dark Mode Toggle
  const darkBtn = document.getElementById('themeToggle');
  if (darkBtn && !darkBtn.dataset.bound) {
    darkBtn.dataset.bound = "true"; // Prevent duplicate binding
    darkBtn.addEventListener('click', (e) => {
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
    });
  }
}

// Run immediately if ready, or wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHelpGrid);
} else {
  initHelpGrid();
}
