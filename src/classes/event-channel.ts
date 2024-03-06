import {
  ChannelOf,
  EventDataOf,
  EventOf,
  GenericEventBusDefinition,
  InterceptorOf,
  SubscriptionConfig,
  SubscriptionOf,
} from "../types";
import { CancellablePromise } from "../utils/promises";
import {
  ChannelCache,
  ClearFunction,
  ChannelSubscriptions,
  PublishArguments,
  ChannelInterceptors,
} from "../types/internal";

export class EventChannel<Definition extends GenericEventBusDefinition, Channel extends ChannelOf<Definition>> {
  #cacheEvents: boolean = true;
  #publishAsynchronously: boolean = true;

  #eventCache: ChannelCache<Definition, Channel> = {};
  #eventSubscriptions: ChannelSubscriptions<Definition, Channel> = {};
  #eventInterceptors: ChannelInterceptors<Definition, Channel> = {};

  set cacheEvents(value: boolean) {
    this.#cacheEvents = value;

    if (!value) {
      this.#eventCache = {};
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

  intercept<Event extends EventOf<Definition, Channel>>(
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

  subscribe<Event extends EventOf<Definition, Channel>>(
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

  once<Event extends EventOf<Definition, Channel>>(
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

  #parseEventPayload<Event extends EventOf<Definition, Channel>>(
    event: Event,
    payload?: EventDataOf<Definition, Channel, Event>,
  ): [EventDataOf<Definition, Channel, Event> | undefined, boolean] {
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
    if (this.#cacheEvents && !isPublishingPrevented) {
      this.#eventCache[event] = data;
    }
    return [payload, isPublishingPrevented];
  }

  publish<Event extends EventOf<Definition, Channel>>(...args: PublishArguments<Definition, Channel, Event>) {
    const [event, payload] = args;
    const [parsedData, isPublishingPrevented] = this.#parseEventPayload(event, payload);

    if (!isPublishingPrevented) {
      this.#eventSubscriptions[event]?.forEach((data) => {
        const result = data.handler(parsedData);
        data.abort = result instanceof CancellablePromise ? () => result.cancel() : undefined;
      });
    }
  }

  run<Event extends EventOf<Definition, Channel>>(...args: PublishArguments<Definition, Channel, Event>) {
    const [event, payload] = args;
    const [parsedData, isPublishingPrevented] = this.#parseEventPayload(event, payload);

    if (!isPublishingPrevented) {
      this.#eventSubscriptions[event]?.forEach((data) => {
        data.subscription(parsedData);
        data.abort = undefined;
      });
    }
  }

  clearInterceptors<Event extends EventOf<Definition, Channel>>(event?: Event) {
    if (event && this.#eventInterceptors[event]) {
      this.#eventInterceptors[event]?.clear();
      delete this.#eventInterceptors[event];
    } else {
      Object.keys(this.#eventInterceptors).forEach((event) => {
        this.clearInterceptors(event as EventOf<Definition, Channel>);
      });
    }
  }

  clearSubscriptions<Event extends EventOf<Definition, Channel>>(event?: Event) {
    if (event && this.#eventSubscriptions[event]) {
      this.#eventSubscriptions[event]?.forEach((data) => data.abort?.());
      this.#eventSubscriptions[event]?.clear();
      delete this.#eventSubscriptions[event];
    } else {
      Object.keys(this.#eventSubscriptions).forEach((event) => {
        this.clearSubscriptions(event as EventOf<Definition, Channel>);
      });
    }
  }

  clearCache<Event extends EventOf<Definition, Channel>>(event?: Event) {
    if (event && this.#eventCache[event]) {
      delete this.#eventCache[event];
    } else {
      this.#eventCache = {};
    }
  }

  clear() {
    this.clearCache();
    this.clearInterceptors();
    this.clearSubscriptions();
  }
}
