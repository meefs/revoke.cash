import { useQuery } from '@tanstack/react-query';
import { createViemPublicClientForChain } from 'lib/utils/chains';
import { MINUTE } from 'lib/utils/time';

// We add this custom useBlockNumber instead of using wagmi's so that we can easily invalidate the query when needed
export const useBlockNumber = (chainId: number) => {
  return useQuery<number, Error>({
    queryKey: ['blockNumber', chainId],
    queryFn: async () => createViemPublicClientForChain(chainId).getBlockNumber().then(Number),
    // Don't refresh the block number too often to avoid refreshing events too often, to avoid backend API rate limiting
    gcTime: 1 * MINUTE,
    staleTime: 1 * MINUTE,
  });
};
