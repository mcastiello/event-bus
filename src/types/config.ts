import { EventBusConfiguration, GenericEventBusDefinition } from "./events";

export type EventChannelConfig = {
  cacheEvents?: boolean;
  publishAsynchronously?: boolean;
};

export type EventBusConfig<Definitions extends GenericEventBusDefinition> = EventChannelConfig & {
  events?: EventBusConfiguration<Definitions>;
};

export type SubscriptionConfig = {
  sync?: boolean;
  once?: boolean;
};
