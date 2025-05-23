import ChainLogo from 'components/common/ChainLogo';
import { useColorTheme } from 'lib/hooks/useColorTheme';
import { CHAIN_SELECT_MAINNETS, CHAIN_SELECT_TESTNETS, getChainName, isSupportedChain } from 'lib/utils/chains';
import { useTranslations } from 'next-intl';
import { memo } from 'react';
import PlaceholderIcon from '../PlaceholderIcon';
import SearchableSelect from './SearchableSelect';

interface ChainOption {
  value: string;
  chainId: number;
}

interface Props {
  selected?: number;
  chainIds?: number[];
  onSelect?: (chainId: number) => void;
  menuAlign?: 'left' | 'right';
  instanceId?: string;
  showNames?: boolean;
}

const ChainSelect = ({ onSelect, selected, menuAlign, chainIds, instanceId, showNames }: Props) => {
  const t = useTranslations();
  const { darkMode } = useColorTheme();

  const mainnetOptions = (chainIds ?? CHAIN_SELECT_MAINNETS).map((chainId) => ({
    value: getChainName(chainId),
    chainId,
  }));

  const testnetOptions = CHAIN_SELECT_TESTNETS.map((chainId) => ({
    value: getChainName(chainId),
    chainId,
  }));

  const groups = [
    {
      label: t('common.chain_select.mainnets'),
      options: mainnetOptions,
    },
    {
      label: t('common.chain_select.testnets'),
      options: testnetOptions,
    },
  ];

  const onChange = ({ chainId }: ChainOption) => {
    onSelect?.(chainId);
  };

  const displayOption = ({ chainId }: ChainOption, { context }: any) => {
    const chainName = getChainName(chainId);

    return (
      <div className="flex items-center gap-1">
        {<ChainLogo chainId={chainId} checkMounted />}
        {(context === 'menu' || showNames) && <div>{chainName}</div>}
      </div>
    );
  };

  return (
    <SearchableSelect
      instanceId={instanceId ?? 'chain-select'}
      classNamePrefix="chain-select"
      aria-label="Select Network"
      size="md"
      className="shrink-0"
      theme={darkMode ? 'dark' : 'light'}
      value={groups.flatMap((group) => group.options).find((option) => option.chainId === selected)}
      options={chainIds ? mainnetOptions : groups}
      isOptionDisabled={(option) => !isSupportedChain(option.chainId)}
      onChange={(option) => onChange(option!)}
      formatOptionLabel={displayOption}
      menuPlacement="bottom"
      minMenuWidth="14.5rem"
      placeholder={<PlaceholderIcon size={24} border />}
      menuAlign={menuAlign}
      // Note: when searching, option do get unmounted, so there's still some optimization to be done here
      keepMounted
      isMulti={false}
    />
  );
};

export default memo(ChainSelect);
