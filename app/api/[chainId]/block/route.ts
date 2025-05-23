import { RateLimiters, checkActiveSessionEdge, checkRateLimitAllowedEdge } from 'lib/api/auth';
import { getEventGetter } from 'lib/api/globals';
import { parseErrorMessage } from 'lib/utils/errors';
import type { NextRequest } from 'next/server';

interface Props {
  params: Promise<Params>;
}

interface Params {
  chainId: string;
}

export async function GET(req: NextRequest, { params }: Props) {
  const { chainId: chainIdString } = await params;

  if (!(await checkActiveSessionEdge(req))) {
    return new Response(JSON.stringify({ message: 'No API session is active' }), { status: 403 });
  }

  if (!(await checkRateLimitAllowedEdge(req, RateLimiters.LOGS))) {
    return new Response(JSON.stringify({ message: 'Too many requests, please try again later.' }), { status: 429 });
  }

  const chainId = Number(chainIdString);

  try {
    const eventGetter = getEventGetter(chainId);
    const blockNumber = await eventGetter.getLatestBlock(chainId);
    return new Response(JSON.stringify({ blockNumber }), { status: 200 });
  } catch (e) {
    console.error('Error occurred', parseErrorMessage(e));

    if (e instanceof Error && e.message.includes('Unsupported chain ID')) {
      return new Response(JSON.stringify({ message: e.message }), { status: 404 });
    }

    return new Response(JSON.stringify({ message: parseErrorMessage(e) }), { status: 500 });
  }
}
