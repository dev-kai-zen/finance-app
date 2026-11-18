import { useLocalSearchParams } from "expo-router";
import { SubscriptionsScreen } from "@/modules/subscriptions";
import type { SubscriptionFilter } from "@/modules/subscriptions";

export default function SubscriptionsRoute() {
  const { action, filter, subscriptionId } = useLocalSearchParams<{
    action?: string;
    filter?: SubscriptionFilter;
    subscriptionId?: string;
  }>();

  return (
    <SubscriptionsScreen
      initialAction={action === "new" ? "new" : undefined}
      initialFilter={filter}
      initialSubscriptionId={
        typeof subscriptionId === "string" && subscriptionId.length > 0
          ? subscriptionId
          : undefined
      }
    />
  );
}
