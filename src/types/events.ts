export type EventConfiguration<Payload = unknown, ResponseEvent = string, ErrorEvent = string> = {
  defaultValue?: Payload;
  responseEvent?: ResponseEvent;
  errorEvent?: ErrorEvent;
  cache?: boolean;
};

type Key = string | number | symbol;

export type EventDefinition<Payload = unknown, ResponseEvent = string, ErrorEvent = string> = {
  payload: Payload;
  responseEvent?: ResponseEvent;
  errorEvent?: ErrorEvent;
};

export type ChannelDefinition<Events extends Key> = {
  [Event in Events]: EventDefinition<unknown, Events, Events>;
};

export type EventBusDefinition<Channels extends Key> = {
  [Channel in Channels]: ChannelDefinition<keyof EventBusDefinition<Channels>[Channel]>;
};

export type GenericEventBusDefinition = EventBusDefinition<string> | undefined;

export type ChannelOf<Definitions extends GenericEventBusDefinition> = Definitions extends undefined
  ? string
  : keyof Definitions;

export type EventOf<
  Definitions extends GenericEventBusDefinition,
  Channel extends ChannelOf<Definitions>,
> = Definitions extends undefined ? string : Channel extends keyof Definitions ? keyof Definitions[Channel] : never;

export type EventChannelConfiguration<
  Definitions extends GenericEventBusDefinition,
  Channel extends keyof Definitions,
> = Definitions extends undefined
  ? undefined
  : {
      [Event in keyof Definitions[Channel]]?: Definitions[Channel][Event] extends EventDefinition
        ? EventConfiguration<
            Definitions[Channel][Event]["payload"],
            Definitions[Channel][Event]["responseEvent"],
            Definitions[Channel][Event]["errorEvent"]
          >
        : undefined;
    };

export type EventBusConfiguration<Definitions extends GenericEventBusDefinition> = Definitions extends undefined
  ? undefined
  : {
      [Channel in keyof Definitions]?: EventChannelConfiguration<Definitions, Channel>;
    };

export type ChannelDefinitionOf<
  Definitions extends GenericEventBusDefinition,
  Channel extends ChannelOf<Definitions>,
> = Definitions extends undefined
  ? string
  : Channel extends keyof Definitions
    ? NonNullable<Definitions[Channel]>
    : never;

export type ChannelConfigurationOf<
  Definitions extends GenericEventBusDefinition,
  Channel extends ChannelOf<Definitions>,
> = Definitions extends undefined
  ? unknown
  : Channel extends keyof Definitions
    ? Definitions[Channel] extends undefined
      ? undefined
      : NonNullable<Definitions[Channel]>
    : never;

export type EventDataOf<
  Definitions extends GenericEventBusDefinition,
  Channel extends ChannelOf<Definitions>,
  Event extends EventOf<Definitions, Channel>,
> = Definitions extends undefined
  ? unknown
  : Event extends keyof ChannelDefinitionOf<Definitions, Channel>
    ? "payload" extends keyof ChannelDefinitionOf<Definitions, Channel>[Event]
      ? ChannelDefinitionOf<Definitions, Channel>[Event]["payload"]
      : never
    : never;

export type EventConfigurationOf<
  Definitions extends GenericEventBusDefinition,
  Channel extends ChannelOf<Definitions>,
  Event extends EventOf<Definitions, Channel>,
> = Definitions extends undefined
  ? never
  : Channel extends keyof Definitions
    ? Event extends keyof ChannelConfigurationOf<Definitions, Channel>
      ? NonNullable<ChannelConfigurationOf<Definitions, Channel>[Event]>
      : never
    : never;

export type SubscriptionOf<
  Definitions extends GenericEventBusDefinition,
  Channel extends ChannelOf<Definitions>,
  Event extends EventOf<Definitions, Channel>,
> = (data: EventDataOf<Definitions, Channel, Event>) => void | PromiseLike<void>;

export type InterceptorOptions = {
  stopInterceptors: () => void;
  preventPublishing: () => void;
};

export type InterceptorOf<
  Definitions extends GenericEventBusDefinition,
  Channel extends ChannelOf<Definitions>,
  Event extends EventOf<Definitions, Channel>,
> = (
  data: EventDataOf<Definitions, Channel, Event>,
  options: InterceptorOptions,
) => EventDataOf<Definitions, Channel, Event>;

export type ResponseEventOf<
  Definitions extends GenericEventBusDefinition,
  Channel extends ChannelOf<Definitions>,
  Event extends EventOf<Definitions, Channel>,
> = EventConfigurationOf<Definitions, Channel, Event>["responseEvent"];

export type ErrorEventOf<
  Definitions extends GenericEventBusDefinition,
  Channel extends ChannelOf<Definitions>,
  Event extends EventOf<Definitions, Channel>,
> = EventConfigurationOf<Definitions, Channel, Event>["errorEvent"];

export type ResponseDataOf<
  Definitions extends GenericEventBusDefinition,
  Channel extends ChannelOf<Definitions>,
  Event extends EventOf<Definitions, Channel>,
> =
  ResponseEventOf<Definitions, Channel, Event> extends EventOf<Definitions, Channel>
    ? EventDataOf<Definitions, Channel, ResponseEventOf<Definitions, Channel, Event>>
    : unknown;

export type ErrorDataOf<
  Definitions extends GenericEventBusDefinition,
  Channel extends ChannelOf<Definitions>,
  Event extends EventOf<Definitions, Channel>,
> =
  ErrorEventOf<Definitions, Channel, Event> extends EventOf<Definitions, Channel>
    ? EventDataOf<Definitions, Channel, ErrorEventOf<Definitions, Channel, Event>>
    : unknown;

export type EventDefinitionOf<
  Definitions extends GenericEventBusDefinition,
  Channel extends ChannelOf<Definitions>,
  Event extends EventOf<Definitions, Channel>,
> = EventConfiguration<
  EventDataOf<Definitions, Channel, Event>,
  ResponseEventOf<Definitions, Channel, Event>,
  ErrorEventOf<Definitions, Channel, Event>
>;
