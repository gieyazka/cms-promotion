import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

import { Promotion } from '@/types/promotion';

const DATA_PATH = path.join(process.cwd(), 'data', 'promotions.json');

async function getPromotions(): Promise<Promotion[]> {
  try {
    const data = await fs.readFile(DATA_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function savePromotions(promotions: Promotion[]) {
  await fs.writeFile(DATA_PATH, JSON.stringify(promotions, null, 2), 'utf-8');
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const promotions = await getPromotions();
  const promotion = promotions.find((p: Promotion) => p.id === id);

  if (!promotion) {
    return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
  }

  return NextResponse.json(promotion);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const promotions = await getPromotions();
    
    const index = promotions.findIndex((p: Promotion) => p.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }

    promotions[index] = {
      ...promotions[index],
      ...body,
      id, // Keep the original ID
    };

    await savePromotions(promotions);

    return NextResponse.json(promotions[index]);
  } catch {
    return NextResponse.json({ error: 'Failed to update promotion' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const promotions = await getPromotions();
    
    const filteredPromotions = promotions.filter((p: Promotion) => p.id !== id);
    await savePromotions(filteredPromotions);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete promotion' }, { status: 500 });
  }
}
