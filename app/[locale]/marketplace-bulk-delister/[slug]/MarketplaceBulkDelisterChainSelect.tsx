'use client';

import ChainSelectHref from 'components/common/select/ChainSelectHref';
import { OPENSEA_CHAINS } from 'lib/hooks/ethereum/useMarketplaces';
import { CHAIN_SELECT_MAINNETS, getChainSlug } from 'lib/utils/chains';
import { useCallback } from 'react';

interface Props {
  chainId: number;
}

// This is a wrapper around ChainSelectHref because we cannot pass the getUrl function as a prop from a server component
const MarketplaceBulkDelisterChainSelect = ({ chainId }: Props) => {
  const chains = CHAIN_SELECT_MAINNETS.filter((chainId) => OPENSEA_CHAINS.includes(chainId));
  const getUrl = useCallback((chainId: number) => `/marketplace-bulk-delister/${getChainSlug(chainId)}`, []);

  return (
    <ChainSelectHref
      instanceId="marketplace-bulk-delister-chain-select"
      selected={chainId}
      getUrl={getUrl}
      showNames
      chainIds={chains}
    />
  );
};

export default MarketplaceBulkDelisterChainSelect;
