document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Leaflet Map
  var map = map || L.map('map').setView([6.3350, 5.6037], 13);
  if (!map.hasLayer && L.tileLayer) {
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);
  }

  // 2. Modal and logout handlers
  window.openModal = function() { document.getElementById('requestModal').style.display = 'flex'; };
  window.closeModal = function() { document.getElementById('requestModal').style.display = 'none'; };
  window.logoutUser = function() { window.location.href = 'index.html'; };
  window.logoutuser = function() { window.location.href = 'index.html'; };

  // 3. Dark Mode Toggle on the Div
  const darkBtn = document.getElementById('themeToggle');
  if (darkBtn) {
    darkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
      
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
