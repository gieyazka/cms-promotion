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

export async function GET() {
  const promotions = await getPromotions();
  return NextResponse.json(promotions);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const promotions = await getPromotions();
    
    const newPromotion = {
      ...body,
      id: Date.now().toString(),
    };

    promotions.push(newPromotion as Promotion);
    await savePromotions(promotions);

    return NextResponse.json(newPromotion, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to save promotion' }, { status: 500 });
  }
}
