"use client";

import { useState, useEffect } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationsPrompt({ userId }: { userId: string }) {
  const [isSubscribed, setIsSubscribed] = useState(true);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then(sub => {
          setIsSubscribed(!!sub);
        });
      });
    }
  }, []);

  const subscribePush = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
      });

      await fetch("/api/push", {
        method: "POST",
        body: JSON.stringify({ userId, subscription: sub })
      });
      setIsSubscribed(true);
      alert("Notifications Enabled!");
    } catch (e) {
      console.error(e);
      alert("Failed to subscribe or permission denied.");
    }
  };

  if (isSubscribed) return null;

  return (
    <div className="card glass" style={{background: "rgba(59, 130, 246, 0.2)", border: "1px solid #3b82f6"}}>
      <h3 style={{marginBottom: "0.5rem"}}>Enable Notifications</h3>
      <p style={{marginBottom: "1rem"}}>Allow push notifications so you instantly know when someone requests a book!</p>
      <button className="btn btn-primary" onClick={subscribePush}>Enable Now</button>
    </div>
  );
}
