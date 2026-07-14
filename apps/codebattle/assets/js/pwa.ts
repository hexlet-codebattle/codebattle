if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/service-worker.js').catch((error: unknown) => {
      console.error('Service worker registration failed', error);
    });
  });
}
