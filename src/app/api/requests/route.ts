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
    const { itemId, ownerId, requesterId } = await req.json();

    const request = await prisma.borrowRequest.create({
      data: {
        requesterId,
        ownerId,
        bookId: itemId,
        status: "PENDING"
      },
      include: {
        owner: { include: { pushSubscriptions: true } },
        book: { include: { book: true } },
        requester: true
      }
    });

    // Notify the Owner securely
    const payload = JSON.stringify({
      title: 'New Borrow Request!',
      body: `${request.requester.name} wants to borrow "${request.book.book.title}".`,
      url: '/reminders'
    });

    for (const sub of request.owner.pushSubscriptions) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
      } catch (err: any) {
        if (err.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
      }
    }

    return NextResponse.json({ success: true, request });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
