import {
  NotificationModal,
  type NotificationModalProps,
  type NotificationModalVariant,
} from "./notification-modal";

export type InfoModalVariant = NotificationModalVariant;
export interface InfoModalProps
  extends Omit<NotificationModalProps, "variant"> {
  variant?: InfoModalVariant;
}

export function InfoModal({ variant = "info", ...props }: InfoModalProps) {
  return <NotificationModal {...props} variant={variant} />;
}
