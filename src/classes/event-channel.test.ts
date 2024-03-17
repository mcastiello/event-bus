import { EventBus } from "./event-bus";
import { EventBusConfiguration } from "../types";
import { ResponseHandler } from "../types/internal";

enum Channels {
  A = "A",
  B = "B",
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
  [Channels.B]: {
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
  const responder: ResponseHandler<Def, Channels.A, RequestEvents.Request> &
    ResponseHandler<Def, Channels.B, RequestEvents.Request> = (data, resolve, reject) => {
    const response = data.split(",").map((value) => Number(value));

    if (response.includes(NaN)) {
      reject(new Error("Unable to parse numbers"));
    } else {
      resolve(response);
    }
  };
  let clear: () => void;
  beforeEach(() => {
    bus.clear();
    clear = bus.getChannel(Channels.A).response(RequestEvents.Request, responder);
    bus.getChannel(Channels.B).response(RequestEvents.Request, responder);
  });

  test("It should create a generic untyped responder", async () => {
    const untypedBus = new EventBus();

    untypedBus.getChannel("test").response("event", (data, resolve) => resolve(data));

    const result = await untypedBus.getChannel("test").request("event", null);

    expect(result).toEqual(null);
  });
  test("It should create a response to a request", async () => {
    const data = "1,2,3";
    const subscription = jest.fn();

    bus.getChannel(Channels.A).subscribe(RequestEvents.Response, subscription);

    const result = await bus.getChannel(Channels.A).request(RequestEvents.Request, data);

    expect(result).toEqual([1, 2, 3]);
    expect(subscription).toHaveBeenCalledWith([1, 2, 3]);
  });
  test("It should create a response to a request without publishing an event", async () => {
    const data = "1,2,3";
    const subscription = jest.fn();

    bus.getChannel(Channels.B).subscribe(RequestEvents.Response, subscription);

    const result = await bus.getChannel(Channels.B).request(RequestEvents.Request, data);

    expect(result).toEqual([1, 2, 3]);
    expect(subscription).not.toHaveBeenCalled();
  });
  test("It should reject a request when there is not a configured responder", async () => {
    const data = "1,2,3";

    clear();

    try {
      await bus.getChannel(Channels.A).request(RequestEvents.Request, data);
    } catch (error) {
      expect(error).toEqual(`There isn't a responder for the event "${RequestEvents.Request}"`);
    }
  });
  test("It should remove the responder for a specific event", async () => {
    const data = "1,2,3";

    bus.getChannel(Channels.A).clearResponders(RequestEvents.Request);

    try {
      await bus.getChannel(Channels.A).request(RequestEvents.Request, data);
    } catch (error) {
      expect(error).toEqual(`There isn't a responder for the event "${RequestEvents.Request}"`);
    }
  });
  test("It should generate an error", async () => {
    const data = "test";
    const subscription = jest.fn();

    bus.getChannel(Channels.A).subscribe(RequestEvents.Error, subscription);

    try {
      await bus.getChannel(Channels.A).request(RequestEvents.Request, data);
    } catch (error) {
      expect(error).toEqual(new Error("Unable to parse numbers"));
      expect(subscription).toHaveBeenCalledWith(new Error("Unable to parse numbers"));
    }
  });
  test("It should generate an error without publishing an event", async () => {
    const data = "test";
    const subscription = jest.fn();

    bus.getChannel(Channels.B).subscribe(RequestEvents.Error, subscription);

    try {
      await bus.getChannel(Channels.B).request(RequestEvents.Request, data);
    } catch (error) {
      expect(error).toEqual(new Error("Unable to parse numbers"));
      expect(subscription).not.toHaveBeenCalled();
    }
  });
  test("It should be able to intercept and clear a response", async () => {
    const data = "1,2,3";

    bus.getChannel(Channels.A).intercept(RequestEvents.Response, (data, { preventPublishing }) => {
      preventPublishing();
      return data;
    });

    const result = await bus.getChannel(Channels.A).request(RequestEvents.Request, data);

    expect(result).toEqual(undefined);
  });
  test("It should be able to intercept an error and clear it", async () => {
    const data = "test";

    bus.getChannel(Channels.A).intercept(RequestEvents.Error, (data, { preventPublishing }) => {
      preventPublishing();
      return data;
    });

    const result = await bus.getChannel(Channels.A).request(RequestEvents.Request, data);

    expect(result).toEqual(undefined);
  });
});
