import {
  ChannelOf,
  ErrorDataOf,
  EventDataOf,
  EventOf,
  GenericEventBusDefinition,
  InterceptorOf,
  ResponseDataOf,
  SubscriptionOf,
} from "./events";

export type ChannelCache<
  Definitions extends GenericEventBusDefinition,
  Channel extends ChannelOf<Definitions>,
> = Partial<{
  [Event in EventOf<Definitions, Channel>]: EventDataOf<Definitions, Channel, Event>;
}>;

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

export type ChannelResponders<
  Definitions extends GenericEventBusDefinition,
  Channel extends ChannelOf<Definitions>,
> = Partial<{
  [Event in EventOf<Definitions, Channel>]: ResponseHandler<Definitions, Channel, Event>;
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

export type ResponseResolver<
  Definitions extends GenericEventBusDefinition,
  Channel extends ChannelOf<Definitions>,
  Event extends EventOf<Definitions, Channel>,
> = (
  data: ResponseDataOf<Definitions, Channel, Event> | PromiseLike<ResponseDataOf<Definitions, Channel, Event>>,
) => void;

export type ResponseReject<
  Definitions extends GenericEventBusDefinition,
  Channel extends ChannelOf<Definitions>,
  Event extends EventOf<Definitions, Channel>,
> = (data: ErrorDataOf<Definitions, Channel, Event>) => void;

export type ResponseHandler<
  Definitions extends GenericEventBusDefinition,
  Channel extends ChannelOf<Definitions>,
  Event extends EventOf<Definitions, Channel>,
> = (
  data: EventDataOf<Definitions, Channel, Event>,
  resolve: ResponseResolver<Definitions, Channel, Event>,
  reject: ResponseReject<Definitions, Channel, Event>,
) => void;

export type PrivateChannel<Definitions extends GenericEventBusDefinition, Channel extends ChannelOf<Definitions>> = {
  channel: Channel;
  id: string;
};
