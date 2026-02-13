'use client';

import AddressForm from 'components/exploits/AddressForm';
import PermitsTable from 'components/signatures/permit/PermitsTable';
import { AddressPageContextProvider } from 'lib/hooks/page-context/AddressPageContext';
import { useTranslations } from 'next-intl';
import { Suspense, useState } from 'react';
import type { Address } from 'viem';

interface Props {
  chainId: number;
}

const PermitSignaturesChecker = ({ chainId }: Props) => {
  const t = useTranslations();
  const [address, setAddress] = useState<Address | undefined>();

  return (
    <Suspense>
      <AddressPageContextProvider address={address!} initialChainId={chainId}>
        <div className="flex flex-col gap-2 w-full max-w-3xl">
          <AddressForm onSubmit={setAddress} placeholder={t('common.nav.search')} />
          {address && <PermitsTable />}
        </div>
      </AddressPageContextProvider>
    </Suspense>
  );
};

export default PermitSignaturesChecker;
