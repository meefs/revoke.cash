import { RateLimiters, requireRateLimit, storeSiweNonceCookie } from 'lib/api/auth';
import { handleApiRouteError } from 'lib/api/errors';
import { type NextRequest, NextResponse } from 'next/server';
import { generateSiweNonce } from 'viem/siwe';

// Issues a server-generated SIWE nonce, bound to the requesting browser through a short-lived
// sealed cookie. The verify route only accepts messages carrying the nonce from this cookie.
export async function GET(req: NextRequest) {
  try {
    await requireRateLimit(req, RateLimiters.AUTH);
    const nonce = generateSiweNonce();

    const res = NextResponse.json({ nonce }, { headers: { 'Cache-Control': 'no-store' } });
    await storeSiweNonceCookie(req, res, nonce);
    return res;
  } catch (error) {
    return handleApiRouteError(error);
  }
}
