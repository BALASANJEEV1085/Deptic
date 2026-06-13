import { NextRequest, NextResponse } from 'next/server';
import { getDemoToken } from '../auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://deptic-api.onrender.com/api';

export async function POST(req: NextRequest) {
  try {
    const { github_url } = await req.json();

    if (!github_url) {
      return NextResponse.json({ error: 'github_url is required' }, { status: 400 });
    }

    const headers: Record<string, string> = { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getDemoToken()}` 
    };

    const res = await fetch(`${API_URL}/scans`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        github_url,
        project_id: '00000000-0000-0000-0000-000000000000',
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.error || 'Failed to start scan' }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
