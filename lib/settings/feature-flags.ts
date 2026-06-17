export const FEATURE_FLAGS = {
  ENABLE_SMS_NOTIFICATIONS: "ENABLE_SMS_NOTIFICATIONS",
  ENABLE_PHOTO_CAPTURE: "ENABLE_PHOTO_CAPTURE",
  ENABLE_PRE_REGISTRATION: "ENABLE_PRE_REGISTRATION",
  ENABLE_VISITOR_BLACKLIST: "ENABLE_VISITOR_BLACKLIST",
} as const;

export type FeatureFlagKey =
  (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

export const DEFAULT_FEATURE_FLAG_DEFINITIONS: Array<{
  key: FeatureFlagKey;
  value: boolean;
  description: string;
}> = [
  {
    key: FEATURE_FLAGS.ENABLE_SMS_NOTIFICATIONS,
    value: false,
    description: "Enable SMS notifications for visitor events",
  },
  {
    key: FEATURE_FLAGS.ENABLE_PHOTO_CAPTURE,
    value: true,
    description: "Allow visitor photo capture during registration",
  },
  {
    key: FEATURE_FLAGS.ENABLE_PRE_REGISTRATION,
    value: true,
    description: "Allow visitors to pre-register before arrival",
  },
  {
    key: FEATURE_FLAGS.ENABLE_VISITOR_BLACKLIST,
    value: false,
    description: "Enable visitor blacklist screening",
  },
];
