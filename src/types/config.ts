export type EventChannelConfig = {
  cacheEvents?: boolean;
  publishAsynchronously?: boolean;
};

export type SubscriptionConfig = {
  sync?: boolean;
  once?: boolean;
};
