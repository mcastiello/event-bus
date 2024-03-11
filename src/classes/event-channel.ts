import {
  ChannelConfigurationOf,
  ChannelOf,
  EventBusDefinitionOf,
  EventDataOf,
  EventDefinition,
  EventOf,
  GenericEventBusConfiguration,
  InterceptorOf,
  ResponseDataOf,
  SubscriptionConfig,
  SubscriptionOf,
} from "../types";
import { CancellablePromise } from "../utils/promises";
import {
  ChannelCache,
  ClearFunction,
  PublishArguments,
  ChannelSubscriptions,
  ChannelInterceptors,
  ResponseHandler,
  ChannelResponders,
} from "../types/internal";

export class EventChannel<
  Definition extends GenericEventBusConfiguration,
  Channel extends ChannelOf<EventBusDefinitionOf<Definition>>,
> {
  readonly #channelConfig: ChannelConfigurationOf<Definition, Channel> | undefined;
  #cacheEvents: boolean = true;
  #publishAsynchronously: boolean = true;

  #eventCache: ChannelCache<Definition, Channel> = {};
  #eventSubscriptions: ChannelSubscriptions<Definition, Channel> = {};
  #eventInterceptors: ChannelInterceptors<Definition, Channel> = {};
  #eventResponders: ChannelResponders<Definition, Channel> = {};

  constructor(channelConfig?: ChannelConfigurationOf<Definition, Channel>) {
    this.#channelConfig = channelConfig;

    if (channelConfig) {
      const events = Object.keys(channelConfig) as EventOf<EventBusDefinitionOf<Definition>, Channel>[];

      events.forEach((event) => {
        const config = this.getEventConfig(event);
        if (config?.defaultValue !== undefined) {
          this.#parseEventPayload(event, config.defaultValue);
        }
      });
    }
  }

  set cacheEvents(value: boolean) {
    if (value !== this.#cacheEvents) {
      this.#cacheEvents = value;

      if (!value) {
        this.#eventCache = {};
      }
    }
  }

  get cacheEvents() {
    return this.#cacheEvents;
  }

  set publishAsynchronously(value: boolean) {
    this.#publishAsynchronously = value;
  }

  get publishAsynchronously() {
    return this.#publishAsynchronously;
  }

  get channelConfig() {
    return this.#channelConfig;
  }

  getEventConfig<Event extends EventOf<EventBusDefinitionOf<Definition>, Channel>>(
    event: Event,
  ):
    | EventDefinition<EventOf<EventBusDefinitionOf<Definition>, Channel>, EventDataOf<Definition, Channel, Event>>
    | undefined {
    return this.#channelConfig?.[event as keyof ChannelConfigurationOf<Definition, Channel>] as EventDefinition<
      EventOf<EventBusDefinitionOf<Definition>, Channel>,
      EventDataOf<Definition, Channel, Event>
    >;
  }

  intercept<Event extends EventOf<EventBusDefinitionOf<Definition>, Channel>>(
    event: Event,
    interceptor: InterceptorOf<Definition, Channel, Event>,
    priority: number = 0,
  ): ClearFunction {
    const id: string = crypto.randomUUID();

    const clearInterceptor = () => {
      const data = this.#eventInterceptors[event]?.get(id);
      if (data) {
        this.#eventInterceptors[event]?.delete(id);
      }
    };

    if (!this.#eventInterceptors[event]) {
      this.#eventInterceptors[event] = new Map();
    }

    this.#eventInterceptors[event]?.set(id, { interceptor, priority });

    return clearInterceptor;
  }

  subscribe<Event extends EventOf<EventBusDefinitionOf<Definition>, Channel>>(
    event: Event,
    subscription: SubscriptionOf<Definition, Channel, Event>,
    options: SubscriptionConfig = {},
  ): ClearFunction {
    const { sync = !this.publishAsynchronously, once = false } = options;
    const id: string = crypto.randomUUID();

    const clearSubscription = () => {
      const data = this.#eventSubscriptions[event]?.get(id);
      if (data) {
        data.abort?.();
        this.#eventSubscriptions[event]?.delete(id);
      }
    };

    const wrappedSubscription: SubscriptionOf<Definition, Channel, Event> = once
      ? (...args) => {
          subscription(...args);
          clearSubscription();
        }
      : subscription;

    const handler: SubscriptionOf<Definition, Channel, Event> = sync
      ? wrappedSubscription
      : CancellablePromise.defer(wrappedSubscription);

    if (!this.#eventSubscriptions[event]) {
      this.#eventSubscriptions[event] = new Map();
    }

    this.#eventSubscriptions[event]?.set(id, { subscription, handler });

    const cachedData = this.#eventCache[event];
    if (cachedData) {
      subscription(cachedData);
    }

    return clearSubscription;
  }

  once<Event extends EventOf<EventBusDefinitionOf<Definition>, Channel>>(
    event: Event,
  ): CancellablePromise<EventDataOf<Definition, Channel, Event>> {
    return new CancellablePromise<EventDataOf<Definition, Channel, Event>>((resolve) => {
      this.subscribe(
        event,
        (data) => {
          resolve(data);
        },
        { once: true },
      );
    });
  }

  #parseEventPayload<Event extends EventOf<EventBusDefinitionOf<Definition>, Channel>>(
    event: Event,
    payload: EventDataOf<Definition, Channel, Event>,
  ): [EventDataOf<Definition, Channel, Event>, boolean] {
    const { data, isPublishingPrevented } = Array.from(this.#eventInterceptors[event]?.values() || [])
      .sort((a, b) => b.priority - a.priority) // Sort in descending order based on interceptor priority
      .reduce(
        ({ data, isPublishingPrevented, isInterceptorStopped }, { interceptor }) => {
          if (!isInterceptorStopped && !isPublishingPrevented) {
            const interceptedData = interceptor(data, {
              stopInterceptors: () => (isInterceptorStopped = true),
              preventPublishing: () => (isPublishingPrevented = true),
            });
            return { data: interceptedData, isPublishingPrevented, isInterceptorStopped };
          } else {
            return { data, isPublishingPrevented, isInterceptorStopped };
          }
        },
        { data: payload, isPublishingPrevented: false, isInterceptorStopped: false },
      );
    const eventSpecificCacheFlag = this.getEventConfig(event)?.cache;
    if (this.#cacheEvents && !isPublishingPrevented && eventSpecificCacheFlag != false) {
      this.#eventCache[event] = data;
    }
    return [data, isPublishingPrevented];
  }

  #notifyData<Event extends EventOf<EventBusDefinitionOf<Definition>, Channel>>(
    event: Event,
    payload: EventDataOf<Definition, Channel, Event>,
    isPublishingPrevented: boolean,
    forceSync?: boolean,
  ) {
    if (!isPublishingPrevented) {
      this.#eventSubscriptions[event]?.forEach((data) => {
        const result = forceSync ? data.subscription(payload) : data.handler(payload);
        data.abort = result instanceof CancellablePromise && !forceSync ? () => result.cancel() : undefined;
      });
    }
  }

  publish<Event extends EventOf<EventBusDefinitionOf<Definition>, Channel>>(
    ...args: PublishArguments<Definition, Channel, Event>
  ) {
    const [event, payload] = args as [Event, EventDataOf<Definition, Channel, Event>];
    const [parsedData, isPublishingPrevented] = this.#parseEventPayload(event, payload);

    this.#notifyData(event, parsedData, isPublishingPrevented, false);
  }

  run<Event extends EventOf<EventBusDefinitionOf<Definition>, Channel>>(
    ...args: PublishArguments<Definition, Channel, Event>
  ) {
    const [event, payload] = args as [Event, EventDataOf<Definition, Channel, Event>];
    const [parsedData, isPublishingPrevented] = this.#parseEventPayload(event, payload);

    this.#notifyData(event, parsedData, isPublishingPrevented, true);
  }

  response<Event extends EventOf<EventBusDefinitionOf<Definition>, Channel>>(
    event: Event,
    handler: ResponseHandler<Definition, Channel, Event>,
    forceSyncResponse?: boolean,
  ): ClearFunction {
    const clearResponder = () => {
      delete this.#eventResponders[event];
    };

    this.#eventResponders[event] = { forceSyncResponse, handler };

    return clearResponder;
  }

  request<Event extends EventOf<EventBusDefinitionOf<Definition>, Channel>>(
    ...args: PublishArguments<Definition, Channel, Event>
  ): CancellablePromise<ResponseDataOf<Definition, Channel, Event> | undefined> {
    const [event, payload] = args as [Event, EventDataOf<Definition, Channel, Event>];
    const { handler, forceSyncResponse } = this.#eventResponders[event] || {};
    const { responseEvent, errorEvent } = this.getEventConfig(event) || {};

    if (handler) {
      return new CancellablePromise<ResponseDataOf<Definition, Channel, Event> | undefined>(async (resolve, reject) => {
        try {
          const response = await new CancellablePromise<ResponseDataOf<Definition, Channel, Event>>((resolve, reject) =>
            handler(payload, resolve, reject),
          );
          if (responseEvent) {
            const [parsedData, isPublishingPrevented] = this.#parseEventPayload(responseEvent, response as never);
            this.#notifyData(responseEvent, parsedData, isPublishingPrevented, forceSyncResponse);
            if (isPublishingPrevented) {
              resolve(undefined);
            } else {
              resolve(parsedData as ResponseDataOf<Definition, Channel, Event>);
            }
          } else {
            resolve(response);
          }
        } catch (error) {
          if (errorEvent) {
            const [parsedData, isPublishingPrevented] = this.#parseEventPayload(errorEvent, error as never);
            this.#notifyData(errorEvent, parsedData, isPublishingPrevented, forceSyncResponse);
            if (isPublishingPrevented) {
              resolve(undefined);
            } else {
              reject(parsedData);
            }
          } else {
            reject(error);
          }
        }
      });
    } else {
      return CancellablePromise.reject<ResponseDataOf<Definition, Channel, Event>>(
        `There isn't a responder for the event "${event}"`,
      );
    }
  }

  clearInterceptors<Event extends EventOf<EventBusDefinitionOf<Definition>, Channel>>(event?: Event) {
    if (event && this.#eventInterceptors[event]) {
      this.#eventInterceptors[event]?.clear();
      delete this.#eventInterceptors[event];
    } else {
      Object.keys(this.#eventInterceptors).forEach((event) => {
        this.clearInterceptors(event as EventOf<EventBusDefinitionOf<Definition>, Channel>);
      });
    }
  }

  clearResponders<Event extends EventOf<EventBusDefinitionOf<Definition>, Channel>>(event?: Event) {
    if (event && this.#eventResponders[event]) {
      delete this.#eventResponders[event];
    } else {
      Object.keys(this.#eventResponders).forEach((event) => {
        this.clearInterceptors(event as EventOf<EventBusDefinitionOf<Definition>, Channel>);
      });
    }
  }

  clearSubscriptions<Event extends EventOf<EventBusDefinitionOf<Definition>, Channel>>(event?: Event) {
    if (event && this.#eventSubscriptions[event]) {
      this.#eventSubscriptions[event]?.forEach((data) => data.abort?.());
      this.#eventSubscriptions[event]?.clear();
      delete this.#eventSubscriptions[event];
    } else {
      Object.keys(this.#eventSubscriptions).forEach((event) => {
        this.clearSubscriptions(event as EventOf<EventBusDefinitionOf<Definition>, Channel>);
      });
    }
  }

  clearCache<Event extends EventOf<EventBusDefinitionOf<Definition>, Channel>>(event?: Event) {
    if (event && this.#eventCache[event]) {
      delete this.#eventCache[event];
    } else {
      this.#eventCache = {};
    }
  }

  clear() {
    this.clearCache();
    this.clearInterceptors();
    this.clearResponders();
    this.clearSubscriptions();
  }
}
