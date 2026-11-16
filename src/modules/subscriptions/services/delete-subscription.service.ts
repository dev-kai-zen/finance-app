import { db, type DbContext } from "@/infrastructure/database/client";
import {
  archiveSubscriptionRecord,
  permanentlyDeleteSubscriptionRecord,
} from "../repositories/subscriptions.repository";

export function archiveSubscription(subscriptionId: string): void {
  db.transaction((tx) => archiveSubscriptionInContext(subscriptionId, tx));
}

export function archiveSubscriptionInContext(
  subscriptionId: string,
  context: DbContext,
): void {
  archiveSubscriptionRecord(subscriptionId, context);
}

export function permanentlyDeleteSubscription(subscriptionId: string): void {
  db.transaction((tx) => permanentlyDeleteSubscriptionInContext(subscriptionId, tx));
}

export function permanentlyDeleteSubscriptionInContext(
  subscriptionId: string,
  context: DbContext,
): void {
  permanentlyDeleteSubscriptionRecord(subscriptionId, context);
}
