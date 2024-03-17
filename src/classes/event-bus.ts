import {
  ChannelConfigurationOf,
  ChannelOf,
  EventBusConfig,
  EventBusConfiguration,
  EventChannelConfig,
  GenericEventBusDefinition,
} from "../types";
import { EventChannel } from "./event-channel";

export class EventBus<Definitions extends GenericEventBusDefinition = undefined> {
  readonly #cacheEvents: boolean = true;
  readonly #publishAsynchronously: boolean = true;
  readonly #eventConfig: EventBusConfiguration<Definitions> | undefined;

  readonly #channelsMap: Partial<{
    [Channel in ChannelOf<Definitions>]: EventChannel<Definitions, Channel>;
  }> = {};

  constructor(config: EventBusConfig<Definitions> = {}) {
    const { cacheEvents = true, publishAsynchronously = true } = config;
    this.#cacheEvents = cacheEvents;
    this.#publishAsynchronously = publishAsynchronously;
    this.#eventConfig = config.events;
  }

  getChannel<Channel extends ChannelOf<Definitions>>(
    channel: Channel,
    privateId?: string,
    config: EventChannelConfig = {},
  ): EventChannel<Definitions, Channel> {
    const channelConfig = this.#eventConfig?.[channel] as ChannelConfigurationOf<
      Definitions,
      EventBusConfiguration<Definitions>,
      Channel
    >;
    const channelName = (privateId ? `${channel}-${privateId}` : channel) as Channel;
    const {
      cacheEvents = this.#channelsMap[channelName] !== undefined
        ? !!this.#channelsMap[channelName]?.cacheEvents
        : this.#cacheEvents,
      publishAsynchronously = this.#channelsMap[channelName] !== undefined
        ? !!this.#channelsMap[channelName]?.publishAsynchronously
        : this.#publishAsynchronously,
    } = config;

    const eventChannel = this.#channelsMap[channelName] || new EventChannel<Definitions, Channel>(channelConfig);

    if (!this.#channelsMap[channelName]) {
      this.#channelsMap[channelName] = eventChannel;
    }

    eventChannel.cacheEvents = cacheEvents;
    eventChannel.publishAsynchronously = publishAsynchronously;

    return eventChannel;
  }

  closeChannel<Channel extends ChannelOf<Definitions>>(channel: Channel, privateId?: string) {
    const channelName = (privateId ? `${channel}-${privateId}` : channel) as Channel;
    this.#channelsMap[channelName]?.clear();

    delete this.#channelsMap[channelName];
  }

  clear() {
    Object.keys(this.#channelsMap).forEach((channel) => this.closeChannel(channel as ChannelOf<Definitions>));
  }
}
