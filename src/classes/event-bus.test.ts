import { EventBus } from "./event-bus";
import { EventBusConfiguration } from "../types";

enum Channels {
  A = "A",
  B = "B",
}

enum Events {
  Boolean = "bool",
  String = "str",
}

type Def = {
  [Channels.A]: {
    [Events.Boolean]: { payload: boolean };
    [Events.String]: { payload: string };
  };
  [Channels.B]: {
    [Events.Boolean]: { payload: undefined };
    [Events.String]: { payload: string[] };
  };
};

const config: EventBusConfiguration<Def> = {
  [Channels.B]: {
    [Events.String]: {
      defaultValue: ["a", "b"],
    },
  },
};

describe("EventBus", () => {
  const bus = new EventBus({ events: config });
  beforeEach(() => {
    bus.clear();
  });

  test("It should create a generic untyped Event Bus", () => {
    const untypedBus = new EventBus();
    const subscription = jest.fn();

    untypedBus.getChannel("test").subscribe("event", subscription);

    untypedBus.getChannel("test").publish("event", null);

    expect(subscription).toHaveBeenCalledWith(null);
  });
  test("It should listen for an event", () => {
    const subscription = jest.fn();

    bus.getChannel(Channels.A).subscribe(Events.Boolean, subscription);

    bus.getChannel(Channels.A).publish(Events.Boolean, true);

    expect(subscription).toHaveBeenCalledWith(true);
  });
  test("It should clear a subscription", () => {
    const subscription = jest.fn();

    const clear = bus.getChannel(Channels.A).subscribe(Events.Boolean, subscription);

    clear();

    bus.getChannel(Channels.A).publish(Events.Boolean, true);

    expect(subscription).not.toHaveBeenCalled();
  });
  test("It should publish an event synchronously", () => {
    const subscription = jest.fn();

    bus.getChannel(Channels.A).subscribe(Events.Boolean, subscription);

    bus.getChannel(Channels.A).run(Events.Boolean, true);

    expect(subscription).toHaveBeenCalledWith(true);
  });
  test("It should publish an event synchronously if the channel is synchronous", () => {
    const subscription = jest.fn();

    bus.getChannel(Channels.A).publishAsynchronously = false;

    expect(bus.getChannel(Channels.A).publishAsynchronously).toEqual(false);

    bus.getChannel(Channels.A).subscribe(Events.Boolean, subscription);

    bus.getChannel(Channels.A).publish(Events.Boolean, true);

    expect(subscription).toHaveBeenCalledWith(true);
  });
  test("It should get the data if it has been cached", () => {
    const subscription = jest.fn();

    bus.getChannel(Channels.A).run(Events.Boolean, true);

    bus.getChannel(Channels.A).subscribe(Events.Boolean, subscription);

    expect(subscription).toHaveBeenCalledWith(true);
  });
  test("It should get the default data if it has been set in the channel definition", () => {
    const subscription = jest.fn();

    bus.getChannel(Channels.B).subscribe(Events.String, subscription);

    expect(subscription).toHaveBeenCalledWith(["a", "b"]);
  });
  test("It should not get the data if the event cache gets cleared", () => {
    const subscription = jest.fn();

    bus.getChannel(Channels.A).run(Events.Boolean, true);
    bus.getChannel(Channels.A).clearCache(Events.Boolean);

    bus.getChannel(Channels.A).subscribe(Events.Boolean, subscription);

    expect(subscription).not.toHaveBeenCalled();
  });
  test("It should clear the cache if it gets disabled", () => {
    const subscription = jest.fn();

    bus.getChannel(Channels.A).run(Events.Boolean, true);

    bus.getChannel(Channels.A).cacheEvents = false;

    bus.getChannel(Channels.A).subscribe(Events.Boolean, subscription);

    expect(subscription).not.toHaveBeenCalled();
  });
  test("It should not get the data if the cache is disabled", () => {
    const subscription = jest.fn();

    bus.getChannel(Channels.A).cacheEvents = false;

    expect(bus.getChannel(Channels.A).cacheEvents).toEqual(false);

    bus.getChannel(Channels.A).publish(Events.Boolean, true);

    bus.getChannel(Channels.A).subscribe(Events.Boolean, subscription);

    expect(subscription).not.toHaveBeenCalled();
  });
  test("It should request some data only once", async () => {
    const request = bus.getChannel(Channels.A).once(Events.Boolean);

    bus.getChannel(Channels.A).publish(Events.Boolean, true);

    expect(await request).toEqual(true);
  });
  test("It should not return the value if the promise is cancelled", async () => {
    const request = bus.getChannel(Channels.A).once(Events.Boolean);

    request.cancel();

    bus.getChannel(Channels.A).publish(Events.Boolean, true);

    expect(await request).toEqual(undefined);
  });
  test("It should intercept an event", () => {
    const subscription = jest.fn();
    const interceptor = jest.fn((value) => !value);

    bus.getChannel(Channels.A).subscribe(Events.Boolean, subscription);
    bus.getChannel(Channels.A).intercept(Events.Boolean, interceptor);

    bus.getChannel(Channels.A).publish(Events.Boolean, true);

    expect(interceptor).toHaveBeenCalledWith(true, expect.any(Object));
    expect(subscription).toHaveBeenCalledWith(false);
  });
  test("It should clear the interceptor", () => {
    const subscription = jest.fn();
    const interceptor = jest.fn((value) => !value);

    bus.getChannel(Channels.A).subscribe(Events.Boolean, subscription);
    const clear = bus.getChannel(Channels.A).intercept(Events.Boolean, interceptor);

    clear();

    bus.getChannel(Channels.A).publish(Events.Boolean, true);

    expect(interceptor).not.toHaveBeenCalled();
    expect(subscription).toHaveBeenCalledWith(true);
  });
  test("It should prevent other intercepts to run", () => {
    const subscription = jest.fn();
    const interceptor = jest.fn((value) => !value);
    const stopper = jest.fn((value, { stopInterceptors }) => {
      stopInterceptors();
      return value;
    });

    bus.getChannel(Channels.A).subscribe(Events.Boolean, subscription);
    bus.getChannel(Channels.A).intercept(Events.Boolean, interceptor);
    bus.getChannel(Channels.A).intercept(Events.Boolean, stopper, 2); // Added after, but with a higher priority

    bus.getChannel(Channels.A).publish(Events.Boolean, true);

    expect(stopper).toHaveBeenCalledWith(true, expect.any(Object));
    expect(interceptor).not.toHaveBeenCalled();
    expect(subscription).toHaveBeenCalledWith(true);
  });
  test("It should prevent the event from being published", () => {
    const subscription = jest.fn();
    const interceptor = jest.fn((value) => !value);
    const stopper = jest.fn((value, { preventPublishing }) => {
      preventPublishing();
      return value;
    });

    bus.getChannel(Channels.A).subscribe(Events.Boolean, subscription);
    bus.getChannel(Channels.A).intercept(Events.Boolean, interceptor);
    bus.getChannel(Channels.A).intercept(Events.Boolean, stopper);

    bus.getChannel(Channels.A).publish(Events.Boolean, true);

    expect(interceptor).toHaveBeenCalledWith(true, expect.any(Object));
    expect(stopper).toHaveBeenCalledWith(false, expect.any(Object));
    expect(subscription).not.toHaveBeenCalledWith();
  });
  test("It should listen for an event on a private channel", () => {
    const id = "test";
    const subscription = jest.fn();

    bus.getChannel({ channel: Channels.A, id }).subscribe(Events.Boolean, subscription);

    bus.getChannel(Channels.A).publish(Events.Boolean, true);

    expect(subscription).not.toHaveBeenCalled();

    bus.getChannel({ channel: Channels.A, id }).publish(Events.Boolean, true);

    expect(subscription).toHaveBeenCalledWith(true);

    subscription.mockClear();

    bus.closeChannel({ channel: Channels.A, id }); // The channel doesn't exist anymore

    bus.getChannel({ channel: Channels.A, id }).publish(Events.Boolean, true);

    expect(subscription).not.toHaveBeenCalled();
  });
});
