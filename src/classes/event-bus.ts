import {
  ChannelConfigurationOf,
  ChannelOf,
  EventBusConfig,
  EventBusDefinitionOf,
  EventChannelConfig,
  GenericEventBusConfiguration,
} from "../types";
import { EventChannel } from "./event-channel";

export class EventBus<Definition extends GenericEventBusConfiguration = undefined> {
  readonly #cacheEvents: boolean = true;
  readonly #publishAsynchronously: boolean = true;
  readonly #eventConfig: Definition | undefined;

  readonly #channelsMap: Partial<{
    [Channel in ChannelOf<EventBusDefinitionOf<Definition>>]: EventChannel<Definition, Channel>;
  }> = {};

  constructor(config: EventBusConfig<Definition> = {}) {
    const { cacheEvents = true, publishAsynchronously = true } = config;
    this.#cacheEvents = cacheEvents;
    this.#publishAsynchronously = publishAsynchronously;
    this.#eventConfig = config.events;
  }

  getChannel<Channel extends ChannelOf<EventBusDefinitionOf<Definition>>>(
    channel: Channel,
    privateId?: string,
    config: EventChannelConfig = {},
  ): EventChannel<Definition, Channel> {
    const channelConfig = this.#eventConfig?.[channel] as ChannelConfigurationOf<Definition, Channel>;
    const channelName = (privateId ? `${channel}-${privateId}` : channel) as Channel;
    const {
      cacheEvents = this.#channelsMap[channelName] !== undefined
        ? !!this.#channelsMap[channelName]?.cacheEvents
        : this.#cacheEvents,
      publishAsynchronously = this.#channelsMap[channelName] !== undefined
        ? !!this.#channelsMap[channelName]?.publishAsynchronously
        : this.#publishAsynchronously,
    } = config;

    const eventChannel = this.#channelsMap[channelName] || new EventChannel<Definition, Channel>(channelConfig);

    if (!this.#channelsMap[channelName]) {
      this.#channelsMap[channelName] = eventChannel;
    }

    eventChannel.cacheEvents = cacheEvents;
    eventChannel.publishAsynchronously = publishAsynchronously;

    return eventChannel;
  }

  closeChannel<Channel extends ChannelOf<EventBusDefinitionOf<Definition>>>(channel: Channel, privateId?: string) {
    const channelName = (privateId ? `${channel}-${privateId}` : channel) as Channel;
    this.#channelsMap[channelName]?.clear();

    delete this.#channelsMap[channelName];
  }

  clear() {
    Object.keys(this.#channelsMap).forEach((channel) =>
      this.closeChannel(channel as ChannelOf<EventBusDefinitionOf<Definition>>),
    );
  }
}
