document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Map
  try {
    var map = L.map('map').setView([6.3350, 5.6037], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);
  } catch (err) {
    console.log("Map note:", err);
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

  // 3. Load Nearby Requests from Firebase Live
  const requestsContainer = document.getElementById('requests-list');
  if (requestsContainer && typeof db !== 'undefined') {
    db.collection("helpRequests")
      .where("status", "==", "Open")
      .onSnapshot((snapshot) => {
        requestsContainer.innerHTML = "";
        
        if (snapshot.empty) {
          requestsContainer.innerHTML = '<p style="font-size: 12px; color: #94a3b8;">No open requests nearby.</p>';
          return;
        }

        snapshot.forEach((doc) => {
          const req = doc.data();
          const card = document.createElement('div');
          card.style.cssText = "background: #f8fafc; padding: 10px; border-radius: 6px; margin-bottom: 10px; border: 1px solid #e2e8f0;";
          card.innerHTML = `
            <strong style="color: #0f766e; font-size: 13px;">${req.category || 'Help Request'}</strong>
            <p style="font-size: 12px; color: #334155; margin: 5px 0;">${req.description || ''}</p>
            <span style="font-size: 11px; color: #64748b;">Distance: ~${req.distance || '1'} km</span>
          `;
          requestsContainer.appendChild(card);
        });
      });
  }
});
