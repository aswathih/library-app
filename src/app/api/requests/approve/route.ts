import webpush from 'web-push';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@libraryapp.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

export async function POST(req: Request) {
  try {
    const { requestId, reminderDateString } = await req.json();

    const request = await prisma.borrowRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED" },
      include: {
        requester: { include: { pushSubscriptions: true } },
        owner: true,
        book: { include: { book: true } }
      }
    });

    // Generate the Reminders for both users
    const date = new Date(reminderDateString); // Scheduled day of handover
    
    await prisma.reminder.create({
      data: {
        creatorId: request.ownerId,
        targetUserId: request.requesterId, // Targeting borrower
        bookId: request.bookId,
        reminderDate: date,
      }
    });
    
    // Create reversed reminder for the Owner
    await prisma.reminder.create({
      data: {
         creatorId: request.requesterId,
         targetUserId: request.ownerId, // Targeting owner
         bookId: request.bookId,
         reminderDate: date,
      }
    });

    // Fire Push Notification to the Requester
    const payload = JSON.stringify({
      title: 'Request Approved!',
      body: `${request.owner.name} approved your request for "${request.book.book.title}". Meet on ${date.toDateString()}!`,
      url: '/reminders'
    });

    for (const sub of request.requester.pushSubscriptions) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
      } catch (err: any) {
        if (err.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
