// Register Service Worker for PWA - Fixed Version

// Only register service worker if running on http/https (not file://)
if ('serviceWorker' in navigator && (location.protocol === 'http:' || location.protocol === 'https:')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered successfully:', registration.scope);
      })
      .catch(error => {
        console.log('Service Worker registration failed:', error);
      });
  });
} else if (location.protocol === 'file:') {
  console.log('Service Worker not available on file:// protocol. Please use a web server.');
}

// PWA Install Prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  // Show install button
  const installBtn = document.createElement('button');
  installBtn.className = 'btn btn-primary install-pwa-btn';
  installBtn.style.cssText = 'position: fixed; bottom: 80px; right: 20px; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
  installBtn.innerHTML = '<i class="bi bi-download"></i> Install App';
  installBtn.onclick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response: ${outcome}`);
      deferredPrompt = null;
      installBtn.remove();
    }
  };
  
  document.body.appendChild(installBtn);
});

window.addEventListener('appinstalled', () => {
  console.log('PWA installed successfully!');
  deferredPrompt = null;
});