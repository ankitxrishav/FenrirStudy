importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAQvLgnyJODW_rC9XbMyh8OdD4dNXQ7t_A",
  authDomain: "fenrirstudyx.firebaseapp.com",
  projectId: "fenrirstudyx",
  storageBucket: "fenrirstudyx.firebasestorage.app",
  messagingSenderId: "475370976510",
  appId: "1:475370976510:web:247ee49c0da89bb6d461af"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message ', payload);

  const notificationTitle = payload.notification?.title || 'fenrirstudy';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message!',
    icon: '/icon/icon-192.png',
    badge: '/icon/icon-192.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click event and redirect to active room
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const roomId = event.notification.data?.roomId;
  const urlToOpen = roomId ? `/rooms/${roomId}` : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus if tab is already open
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
