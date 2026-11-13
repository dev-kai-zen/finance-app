import type { WalkthroughStep } from "../types/walkthrough.types";

export interface GetCreditCardsWalkthroughStepsOptions {
  hasCards: boolean;
  hasUnbilledActivity?: boolean;
}

export const CREDIT_CARDS_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "creditCardDueSummary",
    targetId: "creditCardDueSummary",
    titleKey: "creditCardsWalkthrough.stepDueSummaryTitle",
    descKey: "creditCardsWalkthrough.stepDueSummaryDesc",
  },
  {
    id: "creditCardAccountChips",
    targetId: "creditCardAccountChips",
    titleKey: "creditCardsWalkthrough.stepAccountChipsTitle",
    descKey: "creditCardsWalkthrough.stepAccountChipsDesc",
  },
  {
    id: "creditCardLimitUtilization",
    targetId: "creditCardLimitUtilization",
    titleKey: "creditCardsWalkthrough.stepLimitUtilizationTitle",
    descKey: "creditCardsWalkthrough.stepLimitUtilizationDesc",
  },
  {
    id: "creditCardMetrics",
    targetId: "creditCardMetrics",
    titleKey: "creditCardsWalkthrough.stepMetricsTitle",
    descKey: "creditCardsWalkthrough.stepMetricsDesc",
  },
  {
    id: "creditCardDueInstallments",
    targetId: "creditCardDueInstallments",
    titleKey: "creditCardsWalkthrough.stepDueInstallmentsTitle",
    descKey: "creditCardsWalkthrough.stepDueInstallmentsDesc",
  },
  {
    id: "creditCardStatements",
    targetId: "creditCardStatements",
    titleKey: "creditCardsWalkthrough.stepStatementsTitle",
    descKey: "creditCardsWalkthrough.stepStatementsDesc",
  },
  {
    id: "creditCardUnbilled",
    targetId: "creditCardUnbilled",
    titleKey: "creditCardsWalkthrough.stepUnbilledTitle",
    descKey: "creditCardsWalkthrough.stepUnbilledDesc",
  },
];

export const CREDIT_CARDS_EMPTY_WALKTHROUGH_STEP: WalkthroughStep = {
  id: "creditCardEmptyAddButton",
  targetId: "creditCardEmptyAddButton",
  titleKey: "creditCardsWalkthrough.stepEmptyAddTitle",
  descKey: "creditCardsWalkthrough.stepEmptyAddDesc",
};

export function getCreditCardsWalkthroughSteps(
  options: GetCreditCardsWalkthroughStepsOptions,
): WalkthroughStep[] {
  const { hasCards, hasUnbilledActivity = false } = options;

  if (!hasCards) {
    return [CREDIT_CARDS_EMPTY_WALKTHROUGH_STEP];
  }

  const steps: WalkthroughStep[] = [
    CREDIT_CARDS_WALKTHROUGH_STEPS[0],
    CREDIT_CARDS_WALKTHROUGH_STEPS[1],
    CREDIT_CARDS_WALKTHROUGH_STEPS[2],
    CREDIT_CARDS_WALKTHROUGH_STEPS[3],
    CREDIT_CARDS_WALKTHROUGH_STEPS[4],
    CREDIT_CARDS_WALKTHROUGH_STEPS[5],
  ];

  if (hasUnbilledActivity) {
    steps.push(CREDIT_CARDS_WALKTHROUGH_STEPS[6]);
  }

  return steps;
}

