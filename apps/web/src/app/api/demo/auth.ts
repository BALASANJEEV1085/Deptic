import crypto from 'crypto';

export function getDemoToken(): string {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    console.warn('SUPABASE_JWT_SECRET is missing. Demo requests may fail.');
    return '';
  }

  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    role: 'authenticated',
    sub: '11111111-1111-1111-1111-111111111111',
    email: 'demo@deptic.io',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiration
  };

  const toBase64Url = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  
  const headerB64 = toBase64Url(header);
  const payloadB64 = toBase64Url(payload);
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  return `${headerB64}.${payloadB64}.${signature}`;
}
