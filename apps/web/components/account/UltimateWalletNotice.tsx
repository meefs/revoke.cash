'use client';

import NoticeBanner from 'components/common/NoticeBanner';
import { useErc7715Support } from 'lib/hooks/auto-revoke/useErc7715Support';
import { useTranslations } from 'next-intl';

const UltimateWalletNotice = () => {
  const t = useTranslations();
  const { supportsErc7715 } = useErc7715Support();

  if (supportsErc7715) return null;
  return <NoticeBanner style="warning">{t('account.subscription.ultimate_requires_metamask')}</NoticeBanner>;
};

export default UltimateWalletNotice;
