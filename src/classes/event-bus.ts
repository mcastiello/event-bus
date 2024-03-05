import { ChannelOf, EventChannelConfig, GenericEventBusDefinition } from "../types";
import { EventChannel } from "./event-channel";

export class EventBus<Definition extends GenericEventBusDefinition = undefined> {
  readonly #cacheEvents: boolean = true;
  readonly #publishAsynchronously: boolean = true;

  readonly #channelsMap: Partial<{ [Channel in ChannelOf<Definition>]: EventChannel<Definition, Channel> }> = {};

  constructor(config: EventChannelConfig = {}) {
    const { cacheEvents = true, publishAsynchronously = true } = config;
    this.#cacheEvents = cacheEvents;
    this.#publishAsynchronously = publishAsynchronously;
  }

  getChannel<Channel extends ChannelOf<Definition>>(
    channel: Channel,
    privateId?: string,
    config: EventChannelConfig = {},
  ): EventChannel<Definition, Channel> {
    const { cacheEvents = this.#cacheEvents, publishAsynchronously = this.#publishAsynchronously } = config;
    const channelName = (privateId ? `${channel}-${privateId}` : channel) as Channel;

    const eventChannel = this.#channelsMap[channelName] || new EventChannel<Definition, Channel>();

    if (!this.#channelsMap[channelName]) {
      this.#channelsMap[channelName] = eventChannel;
    }

    eventChannel.cacheEvents = cacheEvents;
    eventChannel.publishAsynchronously = publishAsynchronously;

    return eventChannel;
  }

  closeChannel<Channel extends ChannelOf<Definition>>(channel: Channel, privateId?: string) {
    const channelName = (privateId ? `${channel}-${privateId}` : channel) as Channel;
    this.#channelsMap[channelName]?.clear();

    delete this.#channelsMap[channelName];
  }

  clear() {
    Object.keys(this.#channelsMap).forEach((channel) => this.closeChannel(channel as ChannelOf<Definition>));
  }
}
