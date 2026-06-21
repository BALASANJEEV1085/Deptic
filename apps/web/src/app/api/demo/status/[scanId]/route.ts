import { NextRequest, NextResponse } from 'next/server';
import { getDemoToken } from '../../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://deptic-api.onrender.com/api';

export async function GET(_: NextRequest, { params }: { params: { scanId: string } }) {
  try {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${getDemoToken()}`
    };

    const res = await fetch(`${API_URL}/scans/${params.scanId}`, { headers, cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.error || 'Failed to fetch scan' }, { status: res.status });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
