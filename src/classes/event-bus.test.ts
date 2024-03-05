import { EventBus } from "./event-bus";

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
    [Events.Boolean]: {
      payload: boolean;
    };
    [Events.String]: {
      payload: string;
    };
  };
  [Channels.B]: {
    [Events.Boolean]: {
      payload: undefined;
    };
    [Events.String]: {
      payload: string[];
    };
  };
};

describe("EventBus", () => {
  describe("Typed", () => {
    const bus = new EventBus<Def>();
    test("It should listen for an event", () => {
      const subscription = jest.fn();

      bus.getChannel(Channels.A).subscribe(Events.Boolean, subscription);

      bus.getChannel(Channels.A).publish(Events.Boolean, true);

      expect(subscription).toHaveBeenCalledWith(true);
    });
  });
});
