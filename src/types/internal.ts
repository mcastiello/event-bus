import {
  ChannelOf,
  ErrorDataOf,
  EventBusDefinitionOf,
  EventDataOf,
  EventOf,
  GenericEventBusConfiguration,
  InterceptorOf,
  ResponseDataOf,
  ResponseEventOf,
  SubscriptionOf,
} from "./events";

export type ChannelCache<
  Definitions extends GenericEventBusConfiguration,
  Channel extends ChannelOf<EventBusDefinitionOf<Definitions>>,
> = Partial<{
  [Event in EventOf<EventBusDefinitionOf<Definitions>, Channel>]: EventDataOf<Definitions, Channel, Event>;
}>;

export type ChannelSubscriptions<
  Definitions extends GenericEventBusConfiguration,
  Channel extends ChannelOf<EventBusDefinitionOf<Definitions>>,
> = Partial<{
  [Event in EventOf<EventBusDefinitionOf<Definitions>, Channel>]: Map<
    string,
    SubscriptionData<Definitions, Channel, Event>
  >;
}>;

export type ChannelInterceptors<
  Definitions extends GenericEventBusConfiguration,
  Channel extends ChannelOf<EventBusDefinitionOf<Definitions>>,
> = Partial<{
  [Event in EventOf<EventBusDefinitionOf<Definitions>, Channel>]: Map<
    string,
    InterceptorData<Definitions, Channel, Event>
  >;
}>;

export type ChannelResponders<
  Definitions extends GenericEventBusConfiguration,
  Channel extends ChannelOf<EventBusDefinitionOf<Definitions>>,
> = Partial<{
  [Event in EventOf<EventBusDefinitionOf<Definitions>, Channel>]: ResponseHandler<Definitions, Channel, Event>;
}>;

export type SubscriptionData<
  Definitions extends GenericEventBusConfiguration,
  Channel extends ChannelOf<EventBusDefinitionOf<Definitions>>,
  Event extends EventOf<EventBusDefinitionOf<Definitions>, Channel>,
> = {
  subscription: SubscriptionOf<Definitions, Channel, Event>;
  handler: SubscriptionOf<Definitions, Channel, Event>;
  abort?: () => void;
};

export type InterceptorData<
  Definitions extends GenericEventBusConfiguration,
  Channel extends ChannelOf<EventBusDefinitionOf<Definitions>>,
  Event extends EventOf<EventBusDefinitionOf<Definitions>, Channel>,
> = {
  interceptor: InterceptorOf<Definitions, Channel, Event>;
  priority: number;
};

export type ClearFunction = () => void;

export type PublishArguments<
  Definitions extends GenericEventBusConfiguration,
  Channel extends ChannelOf<EventBusDefinitionOf<Definitions>>,
  Event extends EventOf<EventBusDefinitionOf<Definitions>, Channel>,
> =
  EventDataOf<Definitions, Channel, Event> extends undefined
    ? [Event]
    : [Event, EventDataOf<Definitions, Channel, Event>];

export type ResponseResolver<
  Definitions extends GenericEventBusConfiguration,
  Channel extends ChannelOf<EventBusDefinitionOf<Definitions>>,
  Event extends EventOf<EventBusDefinitionOf<Definitions>, Channel>,
> = (
  data: ResponseDataOf<Definitions, Channel, Event> | PromiseLike<ResponseDataOf<Definitions, Channel, Event>>,
) => void;

export type ResponseReject<
  Definitions extends GenericEventBusConfiguration,
  Channel extends ChannelOf<EventBusDefinitionOf<Definitions>>,
  Event extends EventOf<EventBusDefinitionOf<Definitions>, Channel>,
> = (data: ErrorDataOf<Definitions, Channel, Event>) => void;

export type ResponseHandler<
  Definitions extends GenericEventBusConfiguration,
  Channel extends ChannelOf<EventBusDefinitionOf<Definitions>>,
  Event extends EventOf<EventBusDefinitionOf<Definitions>, Channel>,
> =
  ResponseEventOf<Definitions, Channel, Event> extends never
    ? never
    : (
        data: EventDataOf<Definitions, Channel, Event>,
        resolve: ResponseResolver<Definitions, Channel, Event>,
        reject: ResponseReject<Definitions, Channel, Event>,
      ) => void;
