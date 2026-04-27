import webpush from 'web-push';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Configure Web Push Engine cryptography
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@libraryapp.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

export async function GET(req: Request) {
  // Determine bounds for "Today"
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Fetch all pending Reminders meant to be processed today
  const reminders = await prisma.reminder.findMany({
    where: {
      status: 'PENDING',
      reminderDate: {
        gte: today,
        lt: tomorrow
      }
    },
    include: {
      target: { include: { pushSubscriptions: true } },
      creator: { include: { pushSubscriptions: true } },
      book: { include: { book: true } }
    }
  });

  for (const reminder of reminders) {
    const payload = JSON.stringify({
      title: '📚 Library Reminder',
      body: `Don't forget to hand over "${reminder.book.book.title}" today!`,
      url: '/reminders'
    });

    // Notify the Target user (owner or borrower) via all their active browser tokens
    for (const sub of reminder.target.pushSubscriptions) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
      } catch (err: any) {
         // If a token is permanently gone (e.g. they cleared Safari cache), wipe it securely
         if (err.statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } });
         }
      }
    }
    
    // Notify the Creator user via all their active browser tokens 
    for (const sub of reminder.creator.pushSubscriptions) {
       // Avoid notifying the creator twice if they set a reminder for themselves somehow
       if (reminder.creator.id === reminder.target.id) continue;
       
       try {
         await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
       } catch (err: any) {
         if (err.statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } });
         }
       }
    }

    // Mark transaction complete so it doesn't trigger tomorrow
    await prisma.reminder.update({
      where: { id: reminder.id },
      data: { status: 'SENT' }
    });
  }

  return NextResponse.json({ success: true, processed: reminders.length });
}
