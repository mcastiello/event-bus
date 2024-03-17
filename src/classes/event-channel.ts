import {
  ChannelConfigurationOf,
  ChannelOf,
  EventBusConfiguration,
  EventConfigurationOf,
  EventDataOf,
  EventOf,
  GenericEventBusDefinition,
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

export class EventChannel<Definitions extends GenericEventBusDefinition, Channel extends ChannelOf<Definitions>> {
  readonly #channelConfig: ChannelConfigurationOf<Definitions, EventBusConfiguration<Definitions>, Channel> | undefined;
  #cacheEvents: boolean = true;
  #publishAsynchronously: boolean = true;

  #eventCache: ChannelCache<Definitions, Channel> = {};
  #eventSubscriptions: ChannelSubscriptions<Definitions, Channel> = {};
  #eventInterceptors: ChannelInterceptors<Definitions, Channel> = {};
  #eventResponders: ChannelResponders<Definitions, Channel> = {};

  constructor(channelConfig?: ChannelConfigurationOf<Definitions, EventBusConfiguration<Definitions>, Channel>) {
    this.#channelConfig = channelConfig;

    if (channelConfig) {
      const events = Object.keys(channelConfig) as EventOf<Definitions, Channel>[];

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

  getEventConfig<Event extends EventOf<Definitions, Channel>>(
    event: Event,
  ): EventConfigurationOf<Definitions, Channel, Event> | undefined {
    return this.#channelConfig?.[
      event as keyof ChannelConfigurationOf<Definitions, EventBusConfiguration<Definitions>, Channel>
    ] as EventConfigurationOf<Definitions, Channel, Event>;
  }

  intercept<Event extends EventOf<Definitions, Channel>>(
    event: Event,
    interceptor: InterceptorOf<Definitions, Channel, Event>,
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

  subscribe<Event extends EventOf<Definitions, Channel>>(
    event: Event,
    subscription: SubscriptionOf<Definitions, Channel, Event>,
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

    const wrappedSubscription: SubscriptionOf<Definitions, Channel, Event> = once
      ? (...args) => {
          subscription(...args);
          clearSubscription();
        }
      : subscription;

    const handler: SubscriptionOf<Definitions, Channel, Event> = sync
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

  once<Event extends EventOf<Definitions, Channel>>(
    event: Event,
  ): CancellablePromise<EventDataOf<Definitions, Channel, Event>> {
    return new CancellablePromise<EventDataOf<Definitions, Channel, Event>>((resolve) => {
      this.subscribe(
        event,
        (data) => {
          resolve(data);
        },
        { once: true },
      );
    });
  }

  #parseEventPayload<Event extends EventOf<Definitions, Channel>>(
    event: Event,
    payload: EventDataOf<Definitions, Channel, Event>,
  ): [EventDataOf<Definitions, Channel, Event>, boolean] {
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

  #notifyData<Event extends EventOf<Definitions, Channel>>(
    event: Event,
    payload: EventDataOf<Definitions, Channel, Event>,
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

  publish<Event extends EventOf<Definitions, Channel>>(...args: PublishArguments<Definitions, Channel, Event>) {
    const [event, payload] = args as [Event, EventDataOf<Definitions, Channel, Event>];
    const [parsedData, isPublishingPrevented] = this.#parseEventPayload(event, payload);

    this.#notifyData(event, parsedData, isPublishingPrevented, false);
  }

  run<Event extends EventOf<Definitions, Channel>>(...args: PublishArguments<Definitions, Channel, Event>) {
    const [event, payload] = args as [Event, EventDataOf<Definitions, Channel, Event>];
    const [parsedData, isPublishingPrevented] = this.#parseEventPayload(event, payload);

    this.#notifyData(event, parsedData, isPublishingPrevented, true);
  }

  response<Event extends EventOf<Definitions, Channel>>(
    event: Event,
    handler: ResponseHandler<Definitions, Channel, Event>,
  ): ClearFunction {
    const clearResponder = () => {
      delete this.#eventResponders[event];
    };

    this.#eventResponders[event] = handler;

    return clearResponder;
  }

  request<Event extends EventOf<Definitions, Channel>>(
    ...args: PublishArguments<Definitions, Channel, Event>
  ): CancellablePromise<ResponseDataOf<Definitions, Channel, Event> | undefined> {
    const [event, payload] = args as [Event, EventDataOf<Definitions, Channel, Event>];
    const handler = this.#eventResponders[event];
    const { responseEvent, errorEvent } = this.getEventConfig(event) || {};

    if (handler) {
      return new CancellablePromise<ResponseDataOf<Definitions, Channel, Event> | undefined>(
        async (resolve, reject) => {
          try {
            const response = await new CancellablePromise<ResponseDataOf<Definitions, Channel, Event>>(
              (resolve, reject) => handler(payload, resolve, reject),
            );
            if (responseEvent) {
              const [parsedData, isPublishingPrevented] = this.#parseEventPayload(
                responseEvent,
                response as EventDataOf<Definitions, Channel, typeof responseEvent>,
              );
              this.#notifyData(responseEvent, parsedData, isPublishingPrevented);
              if (isPublishingPrevented) {
                resolve(undefined);
              } else {
                resolve(parsedData as ResponseDataOf<Definitions, Channel, Event>);
              }
            } else {
              resolve(response);
            }
          } catch (error) {
            if (errorEvent) {
              const [parsedData, isPublishingPrevented] = this.#parseEventPayload(
                errorEvent,
                error as EventDataOf<Definitions, Channel, typeof errorEvent>,
              );
              this.#notifyData(errorEvent, parsedData, isPublishingPrevented);
              if (isPublishingPrevented) {
                resolve(undefined);
              } else {
                reject(parsedData);
              }
            } else {
              reject(error);
            }
          }
        },
      );
    } else {
      return CancellablePromise.reject<ResponseDataOf<Definitions, Channel, Event>>(
        `There isn't a responder for the event "${event}"`,
      );
    }
  }

  clearInterceptors<Event extends EventOf<Definitions, Channel>>(event?: Event) {
    if (event && this.#eventInterceptors[event]) {
      this.#eventInterceptors[event]?.clear();
      delete this.#eventInterceptors[event];
    } else {
      Object.keys(this.#eventInterceptors).forEach((event) => {
        this.clearInterceptors(event as EventOf<Definitions, Channel>);
      });
    }
  }

  clearResponders<Event extends EventOf<Definitions, Channel>>(event?: Event) {
    if (event && this.#eventResponders[event]) {
      delete this.#eventResponders[event];
    } else {
      Object.keys(this.#eventResponders).forEach((event) => {
        this.clearInterceptors(event as EventOf<Definitions, Channel>);
      });
    }
  }

  clearSubscriptions<Event extends EventOf<Definitions, Channel>>(event?: Event) {
    if (event && this.#eventSubscriptions[event]) {
      this.#eventSubscriptions[event]?.forEach((data) => data.abort?.());
      this.#eventSubscriptions[event]?.clear();
      delete this.#eventSubscriptions[event];
    } else {
      Object.keys(this.#eventSubscriptions).forEach((event) => {
        this.clearSubscriptions(event as EventOf<Definitions, Channel>);
      });
    }
  }

  clearCache<Event extends EventOf<Definitions, Channel>>(event?: Event) {
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
