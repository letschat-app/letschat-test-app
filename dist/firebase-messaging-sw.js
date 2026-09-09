// public/firebase-messaging-sw.js
// This file is required by Firebase Cloud Messaging to handle background notifications.
// On GitHub Pages (subdirectory), this file must be present in the public folder.

importScripts('service-worker.js');

// This wrapper ensures that FCM can find its default service worker file
// even if we are using a custom registration in the main app.
