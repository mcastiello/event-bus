import {
  ChannelConfigurationOf,
  ChannelOf,
  EventBusConfig,
  EventBusConfiguration,
  EventChannelConfig,
  GenericEventBusDefinition,
} from "../types";
import { EventChannel } from "./event-channel";
import { PrivateChannel } from "../types/internal";

const isPrivateChannel = <Definitions extends GenericEventBusDefinition, Channel extends ChannelOf<Definitions>>(
  channel: Channel | PrivateChannel<Definitions, Channel>,
): channel is PrivateChannel<Definitions, Channel> => typeof channel === "object" && !!channel?.channel;

export class EventBus<Definitions extends GenericEventBusDefinition = undefined> {
  private readonly cacheEvents: boolean = true;
  private readonly publishAsynchronously: boolean = true;
  private readonly eventConfig: EventBusConfiguration<Definitions> | undefined;

  private readonly channelsMap: Partial<{
    [Channel in ChannelOf<Definitions>]: EventChannel<Definitions, Channel>;
  }> = {};

  constructor(config: EventBusConfig<Definitions> = {}) {
    const { cacheEvents = true, publishAsynchronously = true } = config;
    this.cacheEvents = cacheEvents;
    this.publishAsynchronously = publishAsynchronously;
    this.eventConfig = config.events;
  }

  getChannel<Channel extends ChannelOf<Definitions>>(
    channel: Channel | PrivateChannel<Definitions, Channel>,
    config: EventChannelConfig = {},
  ): EventChannel<Definitions, Channel> {
    const { channel: channelName, id: privateId } = isPrivateChannel(channel) ? channel : { channel, id: undefined };
    const channelConfig = this.eventConfig?.[channelName] as ChannelConfigurationOf<
      Definitions,
      EventBusConfiguration<Definitions>,
      Channel
    >;
    const channelId = (privateId ? `${channelName}-${privateId}` : channelName) as Channel;
    const {
      cacheEvents = this.channelsMap[channelId] !== undefined
        ? !!this.channelsMap[channelId]?.cacheEvents
        : this.cacheEvents,
      publishAsynchronously = this.channelsMap[channelId] !== undefined
        ? !!this.channelsMap[channelId]?.publishAsynchronously
        : this.publishAsynchronously,
    } = config;

    const eventChannel = this.channelsMap[channelId] || new EventChannel<Definitions, Channel>(channelConfig);

    if (!this.channelsMap[channelId]) {
      this.channelsMap[channelId] = eventChannel;
    }

    eventChannel.cacheEvents = cacheEvents;
    eventChannel.publishAsynchronously = publishAsynchronously;

    return eventChannel;
  }

  closeChannel<Channel extends ChannelOf<Definitions>>(channel: Channel | PrivateChannel<Definitions, Channel>) {
    const { channel: channelName, id: privateId } = isPrivateChannel(channel) ? channel : { channel, id: undefined };
    const channelId = (privateId ? `${channelName}-${privateId}` : channelName) as Channel;
    this.channelsMap[channelId]?.clear();

    delete this.channelsMap[channelId];
  }

  clear() {
    Object.keys(this.channelsMap).forEach((channel) => this.closeChannel(channel as ChannelOf<Definitions>));
  }
}
