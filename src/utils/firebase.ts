import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import fs from 'fs';
import path from 'path';
import { prisma } from './prisma.js';

let serviceAccount;

// 1. Vercel / Local Environment Check
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Production: Read from Vercel Environment Variable
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  // Local Development: Read from file
  const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
}

// 2. Initialize Firebase
const app = initializeApp({
  credential: cert(serviceAccount),
});

export const messaging = getMessaging(app);

// 3. The Push Notification Helper (This is what Vercel was missing!)
export const sendPushNotification = async (userId: string, title: string, body: string) => {
  try {
    const user = await prisma.user.findUnique({ 
      where: { id: userId }, 
      select: { fcmToken: true } 
    });
    
    if (!user || !user.fcmToken) return; 

    await messaging.send({
      token: user.fcmToken,
      notification: { title, body },
      data: { click_action: 'FLUTTER_NOTIFICATION_CLICK' } 
    });
    console.log(`Push sent to user ${userId}`);
  } catch (error) {
    console.error('Error sending FCM push:', error);
  }
};