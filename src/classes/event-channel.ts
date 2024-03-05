import {
  ChannelOf,
  EventDataOf,
  EventOf,
  GenericEventBusDefinition,
  SubscriptionConfig,
  SubscriptionOf,
} from "../types";
import { CancellablePromise } from "../utils/promises";
import { ChannelCache, ClearSubscription, ChannelSubscriptions, PublishArguments } from "../types/internal";

export class EventChannel<Definition extends GenericEventBusDefinition, Channel extends ChannelOf<Definition>> {
  #cacheEvents: boolean = true;
  #publishAsynchronously: boolean = true;

  #eventCache: ChannelCache<Definition, Channel> = {};
  #eventSubscriptions: ChannelSubscriptions<Definition, Channel> = {};

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

  subscribe<Event extends EventOf<Definition, Channel>>(
    event: Event,
    subscription: SubscriptionOf<Definition, Channel, Event>,
    options: SubscriptionConfig = {},
  ): ClearSubscription {
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

  publish<Event extends EventOf<Definition, Channel>>(...args: PublishArguments<Definition, Channel, Event>) {
    const [event, payload] = args;

    if (this.#cacheEvents) {
      this.#eventCache[event] = payload;
    }

    this.#eventSubscriptions[event]?.forEach((data) => {
      const result = data.handler(payload);
      data.abort = result instanceof CancellablePromise ? result.cancel : undefined;
    });
  }

  run<Event extends EventOf<Definition, Channel>>(...args: PublishArguments<Definition, Channel, Event>) {
    const [event, payload] = args;

    if (this.#cacheEvents) {
      this.#eventCache[event] = payload;
    }

    this.#eventSubscriptions[event]?.forEach((data) => {
      data.subscription(payload);
      data.abort = undefined;
    });
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
    this.clearSubscriptions();
  }
}
