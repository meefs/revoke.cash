import { getExecutorGasBalances, getExecutorSpend } from '@revoke.cash/core/admin/executor';
import { handleAdminRead } from 'lib/api/admin';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const handler = async () => {
    const [balances, spend30d] = await Promise.all([getExecutorGasBalances(), getExecutorSpend(30)]);
    return { balances, spend30d };
  };

  return handleAdminRead(req, handler);
}
