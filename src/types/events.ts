export type EventDefinition<Events> = {
  responseEvent?: Events;
  errorEvent?: Events;
  cache?: boolean;
};

type Key = string | number | symbol;

export type ChannelDefinition<Events extends Key> = {
  [Event in Events]: unknown;
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
      [Event in keyof Definitions[Channel]]?: EventDefinition<keyof Definitions[Channel]>;
    };

export type EventBusConfiguration<Definitions extends GenericEventBusDefinition> = Definitions extends undefined
  ? undefined
  : {
      [Channel in keyof Definitions]?: EventChannelConfiguration<Definitions, Channel>;
    };

export type GenericEventBusConfiguration = EventBusConfiguration<GenericEventBusDefinition> | undefined;

export type EventBusDefinitionOf<Definitions extends GenericEventBusConfiguration> =
  Definitions extends EventBusConfiguration<infer EventBusDefinition> ? EventBusDefinition : undefined;

export type ChannelDefinitionOf<
  Definitions extends GenericEventBusConfiguration,
  Channel extends ChannelOf<EventBusDefinitionOf<Definitions>>,
> = Definitions extends undefined
  ? string
  : Channel extends keyof EventBusDefinitionOf<Definitions>
    ? EventBusDefinitionOf<Definitions>[Channel]
    : never;

export type EventDataOf<
  Definitions extends GenericEventBusConfiguration,
  Channel extends ChannelOf<EventBusDefinitionOf<Definitions>>,
  Event extends EventOf<EventBusDefinitionOf<Definitions>, Channel>,
> = Definitions extends undefined
  ? unknown
  : Event extends keyof ChannelDefinitionOf<Definitions, Channel>
    ? ChannelDefinitionOf<Definitions, Channel>[Event]
    : never;

export type EventConfigurationOf<
  Definitions extends GenericEventBusConfiguration,
  Channel extends ChannelOf<EventBusDefinitionOf<Definitions>>,
  Event extends EventOf<EventBusDefinitionOf<Definitions>, Channel>,
> = Definitions extends undefined
  ? never
  : Channel extends keyof Definitions
    ? Event extends keyof Definitions[Channel]
      ? Definitions[Channel][Event]
      : never
    : never;

export type SubscriptionOf<
  Definitions extends GenericEventBusConfiguration,
  Channel extends ChannelOf<EventBusDefinitionOf<Definitions>>,
  Event extends EventOf<EventBusDefinitionOf<Definitions>, Channel>,
> = (data: EventDataOf<Definitions, Channel, Event>) => void | PromiseLike<void>;

export type InterceptorOptions = {
  stopInterceptors: () => void;
  preventPublishing: () => void;
};

export type InterceptorOf<
  Definitions extends GenericEventBusConfiguration,
  Channel extends ChannelOf<EventBusDefinitionOf<Definitions>>,
  Event extends EventOf<EventBusDefinitionOf<Definitions>, Channel>,
> = (
  data: EventDataOf<Definitions, Channel, Event>,
  options: InterceptorOptions,
) => EventDataOf<Definitions, Channel, Event>;

export type ResponseEventOf<
  Definitions extends GenericEventBusConfiguration,
  Channel extends ChannelOf<EventBusDefinitionOf<Definitions>>,
  Event extends EventOf<EventBusDefinitionOf<Definitions>, Channel>,
> = EventConfigurationOf<Definitions, Channel, Event>["responseEvent"];

export type ErrorEventOf<
  Definitions extends GenericEventBusConfiguration,
  Channel extends ChannelOf<EventBusDefinitionOf<Definitions>>,
  Event extends EventOf<EventBusDefinitionOf<Definitions>, Channel>,
> = EventConfigurationOf<Definitions, Channel, Event>["errorEvent"];

export type ResponseDataOf<
  Definitions extends GenericEventBusConfiguration,
  Channel extends ChannelOf<EventBusDefinitionOf<Definitions>>,
  Event extends EventOf<EventBusDefinitionOf<Definitions>, Channel>,
> =
  ResponseEventOf<Definitions, Channel, Event> extends EventOf<EventBusDefinitionOf<Definitions>, Channel>
    ? EventDataOf<Definitions, Channel, ResponseEventOf<Definitions, Channel, Event>>
    : unknown;

export type ErrorDataOf<
  Definitions extends GenericEventBusConfiguration,
  Channel extends ChannelOf<EventBusDefinitionOf<Definitions>>,
  Event extends EventOf<EventBusDefinitionOf<Definitions>, Channel>,
> =
  ErrorEventOf<Definitions, Channel, Event> extends EventOf<EventBusDefinitionOf<Definitions>, Channel>
    ? EventDataOf<Definitions, Channel, ErrorEventOf<Definitions, Channel, Event>>
    : unknown;
