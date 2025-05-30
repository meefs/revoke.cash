import { ChainId, getChain } from '@revoke.cash/chains';
import { ETHERSCAN_API_KEYS, ETHERSCAN_RATE_LIMITS, INFURA_API_KEY, RPC_OVERRIDES } from 'lib/constants';
import type { EtherscanPlatform, RateLimit } from 'lib/interfaces';
import type { PriceStrategy } from 'lib/price/PriceStrategy';
import { isNullish } from 'lib/utils';
import { SECOND } from 'lib/utils/time';
import {
  http,
  type AddEthereumChainParameter,
  type ChainContract,
  type PublicClient,
  type Chain as ViemChain,
  createPublicClient,
  defineChain,
} from 'viem';

export interface ChainOptions {
  type: SupportType;
  chainId: number;
  name?: string;
  // slug?: string;
  logoUrl?: string;
  infoUrl?: string;
  nativeToken?: string;
  nativeTokenCoingeckoId?: string;
  explorerUrl?: string;
  etherscanCompatibleApiUrl?: string;
  rpc?: {
    main?: string | string[];
    logs?: string;
    free?: string;
  };
  deployedContracts?: DeployedContracts;
  priceStrategy?: PriceStrategy;
  backendPriceStrategy?: PriceStrategy;
  isTestnet?: boolean;
  isCanary?: boolean;
  correspondingMainnetChainId?: number;
}

export type DeployedContracts = Record<string, ChainContract>;

export enum SupportType {
  PROVIDER = 'PROVIDER',
  HYPERSYNC = 'HYPERSYNC',
  ETHERSCAN_COMPATIBLE = 'ETHERSCAN_COMPATIBLE',
  BLOCKSCOUT = 'BLOCKSCOUT', // Note that this is mostly Etherscan Compatible, with slight differences in the API
  COVALENT = 'COVALENT',
  BACKEND_NODE = 'BACKEND_NODE',
  BACKEND_CUSTOM = 'BACKEND_CUSTOM',
  UNSUPPORTED = 'UNSUPPORTED',
}

export class Chain {
  chainId: number;
  type: SupportType;

  constructor(private options: ChainOptions) {
    this.chainId = options.chainId;
    this.type = options.type;
  }

  isSupported(): boolean {
    return this.type !== SupportType.UNSUPPORTED;
  }

  getName(): string {
    const name = this.options.name ?? getChain(this.chainId)?.name ?? `Chain ID ${this.chainId}`;

    if (!this.isSupported()) {
      return `${name} (Unsupported)`;
    }

    return name;
  }

  getSlug(): string {
    const chainName = this.getName();
    return chainName
      .toLowerCase()
      .replace(' (unsupported)', '')
      .replace(/\s/g, '-')
      .replace(/\./g, '-')
      .replace(/zerθ/g, 'zero');
  }

  isTestnet(): boolean {
    return this.options.isTestnet ?? false;
  }

  isCanary(): boolean {
    return this.options.isCanary ?? false;
  }

  getLogoUrl(): string | undefined {
    return this.options.logoUrl ?? getChain(this.chainId)?.iconURL;
  }

  getExplorerUrl(): string {
    const [explorer] = getChain(this.chainId)?.explorers ?? [];
    return this.options.explorerUrl ?? explorer?.url;
  }

  getFreeRpcUrl(): string {
    const [rpcUrl] = getChain(this.chainId)?.rpc ?? [];
    return this.options.rpc?.free ?? rpcUrl ?? this.getRpcUrl();
  }

  getRpcUrls(): string[] {
    const baseRpcUrls =
      getChain(this.chainId)?.rpc?.map((url) => url.replace('${INFURA_API_KEY}', `${INFURA_API_KEY}`)) ?? [];
    const specifiedRpcUrls = [this.options.rpc?.main].flat().filter((url) => !isNullish(url));
    const rpcOverrides = RPC_OVERRIDES[this.chainId] ? [RPC_OVERRIDES[this.chainId]] : [];
    return [...rpcOverrides, ...specifiedRpcUrls, ...baseRpcUrls];
  }

  getRpcUrl(): string {
    return this.getRpcUrls()[0];
  }

  getLogsRpcUrl(): string {
    return this.options.rpc?.logs ?? this.getRpcUrl();
  }

  getInfoUrl(): string | undefined {
    // TODO: Ideally we would call getInfoUrl() for the mainnet chain here in case it has overridden infoUrl, but then
    // we run into circular dependency issues 😅
    const mainnetChainId = this.getCorrespondingMainnetChainId() ?? -1;
    return this.options.infoUrl ?? getChain(mainnetChainId)?.infoURL ?? getChain(this.chainId)?.infoURL;
  }

  // Note: we run tests to make sure that this is configured correctly for all chains (which is why we override the type)
  getNativeToken(): string {
    return (this.options.nativeToken ?? getChain(this.chainId)?.nativeCurrency?.symbol) as string;
  }

  getNativeTokenCoingeckoId(): string | undefined {
    return this.options.nativeTokenCoingeckoId ?? (this.getNativeToken() === 'ETH' ? 'ethereum' : undefined);
  }

  getEtherscanCompatibleApiUrl(): string | undefined {
    return this.options.etherscanCompatibleApiUrl ?? 'https://api.etherscan.io/v2/api';
  }

  getEtherscanCompatibleApiKey(): string | undefined {
    const platform = this.getEtherscanCompatiblePlatformNames();
    const subdomainApiKey = ETHERSCAN_API_KEYS[`${platform?.subdomain}.${platform?.domain}`];
    const domainApiKey = ETHERSCAN_API_KEYS[`${platform?.domain}`];
    return subdomainApiKey ?? domainApiKey;
  }

  getEtherscanCompatibleApiRateLimit(): RateLimit {
    const platform = this.getEtherscanCompatiblePlatformNames();
    const subdomainRateLimit = ETHERSCAN_RATE_LIMITS[`${platform?.subdomain}.${platform?.domain}`];
    const domainRateLimit = ETHERSCAN_RATE_LIMITS[`${platform?.domain}`];
    const customRateLimit = subdomainRateLimit ?? domainRateLimit;

    if (customRateLimit) {
      return { interval: 1000, intervalCap: customRateLimit };
    }

    // For all other chains we assume a rate limit of 5 requests per second (which we underestimate as 4/s to be safe)
    // Note that Etherscan requests without an API key are limited to 1 per 5 seconds, so we essentially assume that
    // all chains have an API key (since 1 per 5 seconds would be prohibitively slow for our use case)
    return { interval: 1000, intervalCap: 4 };
  }

  // TODO: Blockscout-hosted chains will all get identified as 'blockscout:undefined'. It is unclear if Blockscout
  // has a single rate limit for all chains or if each chain has its own rate limit. If the former, we're all good,
  // if the latter, we need to add a special case for these chains.
  getEtherscanCompatibleApiIdentifier(): string {
    const platform = this.getEtherscanCompatiblePlatformNames();
    const apiKey = this.getEtherscanCompatibleApiKey();
    return `${platform?.domain}:${apiKey}`;
  }

  private getEtherscanCompatiblePlatformNames = (): EtherscanPlatform | undefined => {
    const apiUrl = this.getEtherscanCompatibleApiUrl();
    if (!apiUrl) return undefined;

    const domain = new URL(apiUrl).hostname.split('.').at(-2)!;
    const subdomain = new URL(apiUrl).hostname.split('.').at(-3)?.split('-').at(-1);
    return { domain, subdomain };
  };

  getCorrespondingMainnetChainId(): number | undefined {
    return this.options.correspondingMainnetChainId;
  }

  getDeployedContracts(): DeployedContracts | undefined {
    return this.options.deployedContracts;
  }

  getViemChainConfig(): ViemChain {
    const chainInfo = getChain(this.chainId);
    const chainName = this.getName();
    const fallbackNativeCurrency = { name: chainName, symbol: this.getNativeToken(), decimals: 18 };

    return defineChain({
      id: this.chainId,
      name: chainName,
      network: this.getSlug(),
      nativeCurrency: chainInfo?.nativeCurrency ?? fallbackNativeCurrency,
      rpcUrls: {
        default: { http: [this.getRpcUrl()] },
        public: { http: [this.getRpcUrl()] },
      },
      blockExplorers: {
        default: {
          name: `${chainName} Explorer`,
          url: this.getExplorerUrl(),
        },
      },
      contracts: this.getDeployedContracts(),
      testnet: this.isTestnet(),
    });
  }

  getAddEthereumChainParameter(): AddEthereumChainParameter {
    const fallbackNativeCurrency = { name: this.getName(), symbol: this.getNativeToken(), decimals: 18 };
    const iconUrl = getChain(this.chainId)?.iconURL;
    const addEthereumChainParameter = {
      chainId: String(this.chainId),
      chainName: this.getName(),
      nativeCurrency: getChain(this.chainId)?.nativeCurrency ?? fallbackNativeCurrency,
      rpcUrls: [this.getFreeRpcUrl()],
      blockExplorerUrls: [this.getExplorerUrl()],
      iconUrls: iconUrl ? [iconUrl] : [],
    };

    return addEthereumChainParameter;
  }

  createViemPublicClient(overrideUrl?: string): PublicClient {
    // We noticed that certain chains run out of gas when using the default multicall settings
    const multicallOverrides: Record<number, { batchSize: number }> = {
      [ChainId.Mantle]: { batchSize: 256 },
    };

    // @ts-ignore TODO: This gives a TypeScript error since Viem v2
    return createPublicClient({
      pollingInterval: 4 * SECOND,
      chain: this.getViemChainConfig(),
      transport: http(overrideUrl ?? this.getRpcUrl()),
      batch: { multicall: multicallOverrides[this.chainId] ?? true },
    });
  }

  getPriceStrategy(): PriceStrategy | undefined {
    return this.options.priceStrategy;
  }

  getBackendPriceStrategy(): PriceStrategy | undefined {
    return this.options.backendPriceStrategy;
  }
}
