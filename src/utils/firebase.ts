import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import fs from 'fs';
import path from 'path';
import { prisma } from './prisma.js'; // Make sure to import prisma for the helper!

// Read the JSON file
const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Initialize the app using the new modular syntax
const app = initializeApp({
  credential: cert(serviceAccount),
});

// Extract the messaging service
export const messaging = getMessaging(app);

// Your Push Notification Helper
export const sendPushNotification = async (userId: string, title: string, body: string) => {
  try {
    const user = await prisma.user.findUnique({ 
      where: { id: userId }, 
      select: { fcmToken: true } 
    });
    
    // If frontend hasn't set it up yet, just return silently.
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