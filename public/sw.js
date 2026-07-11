importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBsFo07T-8_CA6EWzaLfeWLJ3ShuGx5KIM",
  authDomain: "rs-b5cf5.firebaseapp.com",
  projectId: "rs-b5cf5",
  storageBucket: "rs-b5cf5.firebasestorage.app",
  messagingSenderId: "414676912966",
  appId: "1:414676912966:web:f4b40db19d4326ba3db347"
});
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.data || {};
  self.registration.showNotification(title || 'Youtubers Studio', {
    body: body || '',
    icon: icon || undefined,
    tag: payload.messageId || title || 'default',
  });
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  event.waitUntil(
    (async () => {
      try {
        const payload = event.data.json();
        if (payload && payload.data) {
          const { title, body, icon } = payload.data;
          await self.registration.showNotification(title || 'Youtubers Studio', {
            body: body || '',
            icon: icon || undefined,
          });
        }
      } catch (e) {
        await self.registration.showNotification('Youtubers Studio', { body: 'You have a new update.' });
      }
    })()
  );
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      if (clientList.length > 0) return clientList[0].focus();
      return clients.openWindow('/');
    })
  );
});
