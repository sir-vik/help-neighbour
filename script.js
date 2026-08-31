document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Map
  try {
    var map = L.map('map').setView([6.3350, 5.6037], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);
  } catch (err) {
    console.log("Map initialization note:", err);
  }

  // 2. Modals and Logout Handlers
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
});
