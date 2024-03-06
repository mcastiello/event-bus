export type EventDefinition<Events extends string> = {
  payload: unknown;
  responseEvent?: Events;
  errorEvent?: Events;
  cache?: boolean;
};

export type ChannelDefinition<Events extends string> = Partial<{
  [Event in Events]: EventDefinition<Events>;
}>;

export type EventBusDefinition<Channels extends string> = {
  [Channel in Channels]: ChannelDefinition<`${keyof EventBusDefinition<Channels>[Channel] & string}`>;
};

export type GenericEventBusDefinition = EventBusDefinition<string> | undefined;

export type ChannelOf<Definitions extends GenericEventBusDefinition> = Definitions extends undefined
  ? string
  : `${keyof Definitions & string}`;

export type ChannelDefinitionOf<
  Definitions extends GenericEventBusDefinition,
  Channel extends ChannelOf<Definitions>,
> = Definitions extends undefined ? string : Channel extends keyof Definitions ? Definitions[Channel] : never;

export type EventOf<
  Definitions extends GenericEventBusDefinition,
  Channel extends ChannelOf<Definitions>,
> = Definitions extends undefined
  ? string
  : Channel extends keyof Definitions
    ? `${keyof Definitions[Channel] & string}`
    : never;

export type EventDataOf<
  Definitions extends GenericEventBusDefinition,
  Channel extends ChannelOf<Definitions>,
  Event extends EventOf<Definitions, Channel>,
> = Definitions extends undefined
  ? unknown
  : Event extends keyof ChannelDefinitionOf<Definitions, Channel>
    ? ChannelDefinitionOf<Definitions, Channel>[Event] extends EventDefinition<EventOf<Definitions, Channel>>
      ? ChannelDefinitionOf<Definitions, Channel>[Event]["payload"]
      : never
    : never;

export type SubscriptionOf<
  Definitions extends GenericEventBusDefinition,
  Channel extends ChannelOf<Definitions>,
  Event extends EventOf<Definitions, Channel>,
> = (data?: EventDataOf<Definitions, Channel, Event>) => void | PromiseLike<void>;

export type InterceptorOptions = {
  stopInterceptors: () => void;
  preventPublishing: () => void;
};

export type InterceptorOf<
  Definitions extends GenericEventBusDefinition,
  Channel extends ChannelOf<Definitions>,
  Event extends EventOf<Definitions, Channel>,
> = <Data extends EventDataOf<Definitions, Channel, Event> | undefined>(
  data: Data,
  options: InterceptorOptions,
) => Data;
