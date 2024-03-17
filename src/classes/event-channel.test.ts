import { EventBus } from "./event-bus";
import { EventBusConfiguration } from "../types";

enum Channels {
  A = "A",
}
enum RequestEvents {
  Request = "req",
  Response = "resp",
  Error = "err",
}

type Def = {
  [Channels.A]: {
    [RequestEvents.Request]: {
      payload: string;
      responseEvent: RequestEvents.Response;
      errorEvent: RequestEvents.Error;
    };
    [RequestEvents.Response]: { payload: number[] };
    [RequestEvents.Error]: { payload: Error };
  };
};

const config: EventBusConfiguration<Def> = {
  [Channels.A]: {
    [RequestEvents.Request]: {
      responseEvent: RequestEvents.Response,
      errorEvent: RequestEvents.Error,
    },
  },
};

describe("EventChannel Request/Response", () => {
  const bus = new EventBus({ events: config });
  beforeEach(() => {
    bus.clear();
  });

  test("It should create a respond to a request", async () => {
    const data = "1,2,3";
    bus.getChannel(Channels.A).response(RequestEvents.Request, (data, resolve, reject) => {
      const response = data.split(",").map((value) => Number(value));

      if (response.includes(NaN)) {
        reject(new Error("Unable to parse numbers"));
      } else {
        resolve(response);
      }
    });

    const result = await bus.getChannel(Channels.A).request(RequestEvents.Request, data);

    expect(result).toEqual([1, 2, 3]);
  });
});
