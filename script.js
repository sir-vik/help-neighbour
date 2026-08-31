document.addEventListener('DOMContentLoaded', () => {
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

  // 3. Ultimate Dark Mode & Parent-Shield Override
  const darkBtn = document.getElementById('themeToggle');
  if (darkBtn) {
    darkBtn.removeAttribute('onclick');
    
    // If the button's parent container has an onclick attribute causing the collapse, 
    // let's clear it out automatically so it leaves your button alone!
    const parentContainer = darkBtn.parentElement;
    if (parentContainer && parentContainer.hasAttribute('onclick')) {
      parentContainer.removeAttribute('onclick');
    }

    darkBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      // Toggle dark classes
      document.body.classList.toggle('dark-mode');
      document.body.classList.toggle('dark');
      
      // Visual background toggle
      if (document.body.style.backgroundColor === 'rgb(18, 18, 18)') {
        document.body.style.backgroundColor = '';
        document.body.style.color = '';
      } else {
        document.body.style.backgroundColor = '#121212';
        document.body.style.color = '#ffffff';
      }
    }, true);
  }
});
