import { ChannelOf, EventDataOf, EventOf, GenericEventBusDefinition, InterceptorOf, SubscriptionOf } from "./events";

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

export type ChannelInterceptors<
  Definitions extends GenericEventBusDefinition,
  Channel extends ChannelOf<Definitions>,
> = Partial<{
  [Event in EventOf<Definitions, Channel>]: Map<string, InterceptorData<Definitions, Channel, Event>>;
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

export type InterceptorData<
  Definitions extends GenericEventBusDefinition,
  Channel extends ChannelOf<Definitions>,
  Event extends EventOf<Definitions, Channel>,
> = {
  interceptor: InterceptorOf<Definitions, Channel, Event>;
  priority: number;
};

export type ClearFunction = () => void;

export type PublishArguments<
  Definitions extends GenericEventBusDefinition,
  Channel extends ChannelOf<Definitions>,
  Event extends EventOf<Definitions, Channel>,
> =
  EventDataOf<Definitions, Channel, Event> extends undefined
    ? [Event]
    : [Event, EventDataOf<Definitions, Channel, Event>];
