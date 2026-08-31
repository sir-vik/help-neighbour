document.addEventListener('DOMContentLoaded', () => {
  // 1. Force the sidebar to stay permanently visible (stops the flickering)
  const sidebar = document.querySelector('.sidebar') || document.querySelector('div[style*="width: 350px"]');
  if (sidebar) {
    sidebar.style.display = 'block';
    sidebar.style.visibility = 'visible';
  }

  // 2. Initialize Map safely
  try {
    var map = L.map('map').setView([6.3350, 5.6037], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);
  } catch (err) {
    console.log("Map note:", err);
  }

  // 3. Modals and Logout
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

  // 4. Clean Dark Mode Toggle (isolated so it won't crash anything)
  const darkBtn = document.getElementById('themeToggle');
  if (darkBtn) {
    darkBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Stop the click from bubbling up to other elements
      
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
