import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Deleting the library item and all its associated borrow history
    await prisma.$transaction([
      prisma.borrowRecord.deleteMany({ where: { itemId: id } }),
      prisma.libraryItem.delete({ where: { id: id } })
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete error:', err);
    return NextResponse.json({ error: 'Failed to delete library item' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    const updated = await prisma.libraryItem.update({
      where: { id },
      data: { status }
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (err) {
    console.error('Update error:', err);
    return NextResponse.json({ error: 'Failed to update item status' }, { status: 500 });
  }
}
