import { Alert, Platform } from "react-native";
import * as Linking from "expo-linking";
import * as Application from "expo-application";
import Constants from "expo-constants";

export const FEEDBACK_EMAIL = "support@kaizenfinanceapp.com";

export interface FeedbackOptions {
  subject?: string;
  body?: string;
}

export function getAppVersionInfo(): string {
  const marketingVersion =
    Application.nativeApplicationVersion ??
    Constants.expoConfig?.version ??
    "1.0.0";
  const buildVersion =
    Application.nativeBuildVersion ??
    Constants.expoConfig?.android?.versionCode ??
    Constants.expoConfig?.ios?.buildNumber ??
    "";

  return buildVersion ? `${marketingVersion} (${buildVersion})` : marketingVersion;
}

export function buildDefaultFeedbackBody(): string {
  const version = getAppVersionInfo();
  const platform = Platform.OS;

  return [
    "Hi Kaizen Team,",
    "",
    "[Please write your feedback, feature request, or questions here]",
    "",
    "---",
    `App: Kaizen Finance v${version}`,
    `Platform: ${platform}`,
    "---",
  ].join("\n");
}

/**
 * Opens Gmail or default email client with pre-filled feedback information.
 */
export async function sendFeedback(options?: FeedbackOptions): Promise<void> {
  const subject = options?.subject ?? "Kaizen Finance - User Feedback";
  const body = options?.body ?? buildDefaultFeedbackBody();

  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);

  const gmailAppUrl = `googlegmail:///co?to=${FEEDBACK_EMAIL}&subject=${encodedSubject}&body=${encodedBody}`;
  const mailtoUrl = `mailto:${FEEDBACK_EMAIL}?subject=${encodedSubject}&body=${encodedBody}`;
  const webGmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${FEEDBACK_EMAIL}&su=${encodedSubject}&body=${encodedBody}`;

  try {
    // 1. Try direct Gmail app scheme if supported
    const canOpenGmail = await Linking.canOpenURL(gmailAppUrl).catch(() => false);
    if (canOpenGmail) {
      await Linking.openURL(gmailAppUrl);
      return;
    }

    // 2. Try standard mailto: scheme (Android email chooser / default client)
    const canOpenMailto = await Linking.canOpenURL(mailtoUrl).catch(() => false);
    if (canOpenMailto) {
      await Linking.openURL(mailtoUrl);
      return;
    }

    // 3. Fallback to web Gmail compose on browser or unsupported platforms
    const canOpenWeb = await Linking.canOpenURL(webGmailUrl).catch(() => false);
    if (canOpenWeb) {
      await Linking.openURL(webGmailUrl);
      return;
    }

    // 4. If all fail, display an alert to the user
    Alert.alert(
      "Send Feedback",
      `We could not open an email client automatically. Please send your feedback to ${FEEDBACK_EMAIL}.`,
    );
  } catch {
    Alert.alert(
      "Send Feedback",
      `Please email your feedback to ${FEEDBACK_EMAIL}.`,
    );
  }
}
