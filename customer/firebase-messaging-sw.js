importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBe15E_Ww2HqLDGUvwl0hwo7AoQ3SVCsaY",
  authDomain: "mobile-order-e0de2.firebaseapp.com",
  projectId: "mobile-order-e0de2",
  storageBucket: "mobile-order-e0de2.firebasestorage.app",
  messagingSenderId: "390340815540",
  appId: "1:390340815540:web:5ff2cc28868d94d59345e1"
});

const messaging = firebase.messaging();

// バックグラウンド（タブが閉じてる/裏にある）時の通知表示
messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.data.title, {
    body: payload.data.body,
    icon: "/customer/assets/splash-logo.png"
  });
});