import { getTreasuryBalances } from '@revoke.cash/core/admin/treasury';
import { handleAdminRead } from 'lib/api/admin';
import type { NextRequest } from 'next/server';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  return handleAdminRead(req, getTreasuryBalances);
}
