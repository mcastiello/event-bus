import { GenericEventBusConfiguration } from "./events";

export type EventChannelConfig = {
  cacheEvents?: boolean;
  publishAsynchronously?: boolean;
};

export type EventBusConfig<Definitions extends GenericEventBusConfiguration> = EventChannelConfig & {
  events?: Definitions;
};

export type SubscriptionConfig = {
  sync?: boolean;
  once?: boolean;
};
