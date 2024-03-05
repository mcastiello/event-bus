import { ChannelOf, EventDataOf, EventOf, GenericEventBusDefinition, SubscriptionOf } from "./events";

export type ChannelCache<
  Definitions extends GenericEventBusDefinition,
  Channel extends ChannelOf<Definitions>,
> = Partial<{ [Event in EventOf<Definitions, Channel>]: EventDataOf<Definitions, Channel, Event> }>;

export type ChannelSubscriptions<
  Definitions extends GenericEventBusDefinition,
  Channel extends ChannelOf<Definitions>,
> = Partial<{
  [Event in EventOf<Definitions, Channel>]: Map<string, SubscriptionData<Definitions, Channel, Event>>;
}>;

export type SubscriptionData<
  Definitions extends GenericEventBusDefinition,
  Channel extends ChannelOf<Definitions>,
  Event extends EventOf<Definitions, Channel>,
> = {
  subscription: SubscriptionOf<Definitions, Channel, Event>;
  handler: SubscriptionOf<Definitions, Channel, Event>;
  abort?: () => void;
};

export type ClearSubscription = () => void;

export type PublishArguments<
  Definitions extends GenericEventBusDefinition,
  Channel extends ChannelOf<Definitions>,
  Event extends EventOf<Definitions, Channel>,
> =
  EventDataOf<Definitions, Channel, Event> extends undefined
    ? [Event]
    : [Event, EventDataOf<Definitions, Channel, Event>];
