'use client';

import type { PremiumEntitlement, PremiumSubscription } from '@revoke.cash/core/premium/types';
import SubscriptionOverview from 'components/account/SubscriptionOverview';
import SubscriptionPaymentSection from 'components/account/SubscriptionPaymentSection';
import Card, { CardTitle } from 'components/common/Card';
import { usePremiumPlans } from 'lib/hooks/premium/usePremiumPlans';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { twMerge } from 'tailwind-merge';
import type { Address } from 'viem';

interface Props {
  account: Address;
  activeSubscription: PremiumSubscription | undefined;
  expiredSubscription: PremiumSubscription | undefined;
  entitlements: PremiumEntitlement[];
}

// The selected plan lives here rather than in the payment section, because it is seeded from the
// subscription data and the URL, and it decides when the whole card is still loading
const PremiumSubscriptionSection = ({ account, activeSubscription, expiredSubscription, entitlements }: Props) => {
  const t = useTranslations();

  const { selectedPlanId, setSelectedPlanId, isLoadingPlans } = usePlanSelection(
    activeSubscription,
    expiredSubscription,
  );

  return (
    <Card
      header={<CardTitle title={t('account.subscription.title')} />}
      isLoading={isLoadingPlans}
      className={twMerge('flex flex-col gap-4', isLoadingPlans && 'h-80')}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <SubscriptionOverview
          account={account}
          activeSubscription={activeSubscription}
          expiredSubscription={expiredSubscription}
          entitlements={entitlements}
        />

        <SubscriptionPaymentSection
          account={account}
          activeSubscription={activeSubscription}
          expiredSubscription={expiredSubscription}
          selectedPlanId={selectedPlanId}
          onSelectPlanId={setSelectedPlanId}
        />
      </div>
    </Card>
  );
};

export default PremiumSubscriptionSection;

// Owns the selected plan and the three places it gets chosen from: the subscription itself, the
// tier passed by the pricing page, and the loaded plan list. The plans query lives here too, since
// two of those rules read it and nothing else in this component does.
const usePlanSelection = (
  activeSubscription: PremiumSubscription | undefined,
  expiredSubscription: PremiumSubscription | undefined,
) => {
  const preselectedTier = useSearchParams()?.get('plan');

  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    activeSubscription?.plan.id ?? expiredSubscription?.plan.id ?? 'premium_annual',
  );

  const { plans, isLoading: isLoadingPlans } = usePremiumPlans(selectedPlanId);

  // Preselect the tier chosen on the pricing page once the plans load
  useEffect(() => {
    if (!preselectedTier) return;

    const preselectedPlan = plans.find((plan) => plan.tier === preselectedTier);
    if (preselectedPlan) {
      setSelectedPlanId(preselectedPlan.id);
    }
  }, [preselectedTier, plans]);

  // Sync selected plan when subscription data loads, unless the pricing page chose a tier
  useEffect(() => {
    if (preselectedTier) return;

    const subscribedPlanId = activeSubscription?.plan.id ?? expiredSubscription?.plan.id;
    if (subscribedPlanId) {
      setSelectedPlanId(subscribedPlanId);
    }
  }, [activeSubscription?.plan.id, expiredSubscription?.plan.id, preselectedTier]);

  // Reset selected plan if loaded plans don't include it
  useEffect(() => {
    const firstPlanId = plans[0]?.id;
    if (!firstPlanId) return;

    if (selectedPlanId !== 'free' && !plans.some((plan) => plan.id === selectedPlanId)) {
      setSelectedPlanId(firstPlanId);
    }
  }, [plans, selectedPlanId]);

  return { selectedPlanId, setSelectedPlanId, isLoadingPlans };
};
