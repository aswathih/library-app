import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { ownerId, bookId, title, author, coverUrl } = await req.json();
    
    // Check if duplicate exists
    const existing = await prisma.libraryItem.findFirst({
      where: { ownerId, bookId }
    });
    if (existing) {
      return NextResponse.json({ error: 'You have already added this book to your library.' }, { status: 400 });
    }
    
    const book = await prisma.book.upsert({
      where: { id: bookId },
      update: {},
      create: {
        id: bookId,
        title,
        author,
        coverUrl
      }
    });

    const item = await prisma.libraryItem.create({
      data: {
        ownerId,
        bookId: book.id,
        status: 'AVAILABLE'
      }
    });

    return NextResponse.json({ success: true, item });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to add book' }, { status: 500 });
  }
}
