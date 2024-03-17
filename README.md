# Event Bus
This library is a simple publish/subscribe bus implementation, which will allow you to send and receive events across your application, organised in different channels with the option to get all the event payloads strictly typed.

### Install

`yarn add @mcastiello/event-bus`

`npm install @mcastiello/event-bus`

## Reference

The event bus is organised in channel. Each channel gets created the first time it is requested, every subsequent get will return the previously initialised instance, unless they get destroyed/closed.

```ts
import { EventBus } from "@mcastiello/event-bus";

const bus = new EventBus();

// Creates and return a channel called "network".
bus.getChannel("network");

// Close and destroy the previously created channel.
bus.closeChannel("network");

// Close all the channels created so far.
bus.clear();
```

### `publish`/`run`/`subscribe` events
You can publish events on a channel. When you do that, all the subscriptions will be executed asynchronously, and they will receive the event payload as a parameter
```ts
import { EventBus } from "@mcastiello/event-bus";

const bus = new EventBus();

// Adds a subscription to the event "update" and it will log the payload when that is published
bus.getChannel("network").subscribe("update", (data) => console.log(data));

// Publish a message that will be received by the subscriptions.
bus.getChannel("network").publish("update", "Hello World!");
```
You can remove your subscription at any time. The `subscribe` method will return a callback that, once executed, it will remove the event listener.
```ts
const clear = bus.getChannel("network").subscribe("update", (data) => console.log(data));

// Remove the subscription
clear();
```
You can also remove all the subscription to a specific event
```ts
bus.getChannel("network").clearSubscriptions("update");
// Omitting the name of the event will clear all the subscription for every event.
```
You can also decide to automatically unsubscribe from the event after the subscription is executed once.
```ts
bus.getChannel("network").subscribe("update", (data) => console.log(data), {
  once: true,
});
```
#### Event cache
Whenever an event is published, its payload is cached, so that when a new subscription is created, it can immediately receive the latest data.

This behaviour can be disabled in a variety of ways. First of all, you can disable it for the entire Event Bus:
```ts
import { EventBus } from "@mcastiello/event-bus";

const bus = new EventBus({
  cacheEvents: false
});
```
Or it can be disabled for a specific channel.
```ts
import { EventBus } from "@mcastiello/event-bus";

const bus = new EventBus();

// Make the channel synchronous.
const channel = bus.getChannel("network", {
  cacheEvents: false
});
```
it can also be disabled for specific events using the Event configuration (more on that later):
This behaviour can be disabled in a variety of ways. First of all, you can disable it for the entire Event Bus:
```ts
import { EventBus } from "@mcastiello/event-bus";

const bus = new EventBus({
  config: {
    network: {
      update: {
        cache: false
      }
    }
  }
});

bus.getChannel("network").publish("update", "Hello World!"); // This won't be cached
```
#### Run subscriptions synchronously
By default, all subscriptions will be executed asynchronously, but there are different ways to force them to run synchronously.

The following example will cause all subscriptions in all channels to run synchronously:
```ts
import { EventBus } from "@mcastiello/event-bus";

const bus = new EventBus({
  publishAsynchronously: false
});
```
You can also decide to make a specific channel synchronously (even just temporarily):
```ts
import { EventBus } from "@mcastiello/event-bus";

const bus = new EventBus();

// Make the channel synchronous.
const channel = bus.getChannel("network", {
  publishAsynchronously: false
});

// This event will be published synchronously
channel.publish("update", "Hello World!");
```
Or you can specify that a specific subscription must always be executed synchronously, even if the event is published asynchronously.
```ts
import { EventBus } from "@mcastiello/event-bus";

const bus = new EventBus();

// Adds a synchronous subscription
bus.getChannel("network").subscribe("update", (data) => console.log(data), {
  sync: true,
});

bus.getChannel("network").publish("update", "Hello World!");
```
Finally, the event itself can be published synchronously by using the method `run`. All subscriptions will be executed in sync:
```ts
import { EventBus } from "@mcastiello/event-bus";

const bus = new EventBus();

// Adds an asynchronous subscription
bus.getChannel("network").subscribe("update", (data) => console.log(data));

// Force all subscriptions to run synchronously
bus.getChannel("network").run("update", "Hello World!");
```
### `once`
There is also a special method that returns a promise that will get resolved once the event is published for the first time.
```ts
import { EventBus } from "@mcastiello/event-bus";

const bus = new EventBus();

setTimeout(() => {
  // Publish the event after 100ms
  bus.getChannel("network").publish("update", "Hello World!");
}, 100);

// Await for the event to be dispatched, and returns it to the caller
const data = await bus.getChannel("network").once("update");

console.log(data);
```
There is no need to pass an event handler, as the event payload is returned as part of the resolved promise.
### `request`/`response` events
Using the response method allows you to flip the logic, instead of having a subscription that waits to receive data, you can create a handler that can serve data in response to a request.

It works similarly to a promise; the handler will receive the data from the request, and it can use that to do its calculation and `resolve` or `reject` the request. 
```ts
import { EventBus } from "@mcastiello/event-bus";

const bus = new EventBus();

// Create a response to an event request. It will convert a string with a numeric list, into a number array.
const clear = bus.getChannel("network").response("request-numeric-list", (data: string, resolve, reject) => {
  const response = data.split(",").map((value) => Number(value));

  if (response.includes(NaN)) {
    reject("Unable to parse numbers");
  } else {
    resolve(response);
  }
});

const data = await bus.getChannel("network").request("request-numeric-list", "1,2,3");

console.log(data); // [1, 2, 3]
```
The `response` returns a `clear` function that you can use to remove the responder. You can also use:
```ts
bus.getChannel("network").clearResponders("request-numeric-list");
// Omitting the name of the event will clear all the responses for every event.
```
### `intercept` events
The `intercept` method allows you to intercept events or responses in a channel. Each interceptor will receive the event payload, and it has to return the exact same type of payload, but it can alter its content or generate a new one.
```ts
import { EventBus } from "@mcastiello/event-bus";

const bus = new EventBus();

// Adds a subscription to the event "update" and it will log the payload when that is published
bus.getChannel("network").subscribe("update", (data) => console.log(data)); // false

// Intercept a message with a boolean payload and negate it
const clear = bus.getChannel("network").intercept("update", (value: boolean) => !value);

// Publish a boolean payload
bus.getChannel("network").publish("update", true);
```
The `intercept` returns a `clear` function that you can use to remove the interceptor. You can also use:
```ts
bus.getChannel("network").clearInterceptors("update");
// Omitting the name of the event will clear all the interceptors for every event.
```
Many different interceptors can be added for the same event, and they will be all executed in sequence, each one updating the data generated from the previous one.

It is although possible to specify the priority of an interceptor in order to control which one is executed first:
```ts
import { EventBus } from "@mcastiello/event-bus";

const bus = new EventBus();

// The higher is the priority, the sooner the interceptor will be executed
bus.getChannel("network").intercept("update", (value: boolean) => !value);
// This should normally be executed second, but because of the higher priority (100), it will be executed first
bus.getChannel("network").intercept("update", (value: boolean) => !value, 100);
```
Interceptors will also receive a couple of functions to control the execution flow dynamically.

```ts
import { EventBus } from "@mcastiello/event-bus";

const bus = new EventBus();

bus.getChannel("network").intercept("update", (value: boolean, { stopInterceptors, preventPublishing }) => {
  if (!value) {
    preventPublishing();
  }
});
```
The 2 functions are:
 - `stopInterceptors`: All the interceptors that should have been executed after the current one will be ignored, and the published event will feature whatever the current interceptor returns.
 - `preventPublishing`: This function has the same effect of the previous one, but it will also prevent the event from being published into the channel. If the intercepted event was the response to a request, the request promise will be resolved with `undefined`. 

## Types
The EventBus works well without enforcing any type, but it also allows to add types for all channels, events, and payloads.

You can define what channels are going to be part of the bus, and what events can be dispatched on each channel, and what payload each event is expecting.

Those types will be enforced, and it will also help resolving what type of responses you are going to receive from each request.

### Without configuration
The easiest way of adding types on the bus is by declaring a type that extends `GenericEventBusDefinition`. Each event can define what its payload is going to be, and if the event can respond to a request with another event, or with an error. The following is an example of how to define a simple configuration.

Let's start by defining the name of the channels and of the events.
```ts
enum Channels {
  Network = "network",
  Server = "server",
}

enum NetworkEvents {
  Update = "update",
  Message = "message",
}

enum ServerEvents {
  Request = "req",
  Response = "resp",
  Error = "err",
}
```
Then let's put them together to define the bus type:
```ts
type BusDefinition = {
  [Channels.Network]: {
    [NetworkEvents.Update]: { payload: boolean };
    [NetworkEvents.Message]: { payload: string };
  };
  [Channels.Server]: {
    // The Request event will send a string, and it will respond with a Response event, which resolve in an array of numbers. 
    [ServerEvents.Request]: {
      payload: string;
      responseEvent: RequestEvents.Response; // This is optional
      errorEvent: RequestEvents.Error; // This is optional
    };
    [ServerEvents.Response]: { payload: number[] };
    [ServerEvents.Error]: { payload: string };
  };
};
```
Now that we have our definition, we can add it to the bus using the generic type, to have everything typed.
```ts
import { EventBus } from "@mcastiello/event-bus";

const bus = new EventBus<BusDefinition>();

// If you don't pass a string, TypeScript will complain
const data = await bus.getChannel(Channels.Server).request(ServerEvents.Request, "1,2,3");
// The returned value will automatically infer the type `number[]`.
```
### With configuration
The bus will infer the type definition from the `config` parameter, which can also be used to add some extra functionalities.

You can, in fact, specify if an event can be cached, and if so, you can also specify an initial value that is added to the cache immediately.

If you also specify a `responseEvent` and/or an `errorEvent`, whenever a response handler is executed, the returned value or error will not just be returned to the request, they will also be published as separate events.

To create a configuration, you can use the generic type `EventBusConfiguration`:
```ts
import { EventBus, EventBusConfiguration } from "@mcastiello/event-bus";

const config: EventBusConfiguration<BusDefinition> = {
  [Channels.Network]: {
    [NetworkEvents.Update]: { 
      defaultValue: true,
    },
    [NetworkEvents.Message]: {
      cache: false
    },
  },
  [Channels.Server]: {
    [ServerEvents.Request]: {
      responseEvent: ServerEvents.Response,
      errorEvent: ServerEvents.Error,
    },
  },
}

const bus = new EventBus({ config });
```
This will use the type definition created earlier, and it will tell the bus that the `NetworkEvents.Update` will have an initial value of `true` stored in the cache, the event `NetworkEvents.Message` won't be cached at all, and the responses to `ServerEvents.Request` will dispatch their own messages.

```ts
// This will resolve immediately as `true`
const data = await bus.getChannel(Channels.Network).once(NetworkEvents.Update);

// Whenever a request fails, this subscription will log an error at console.
bus.getChannel(Channels.Server).subscribe(ServerEvents.Error, (message) => console.error(message));
// Whenever a request is successful, this subscription will log the response at console.
bus.getChannel(Channels.Server).subscribe(ServerEvents.Response, (data) => console.debug(data));

try {
  // This will fail as the payload does not contain a list of numbers.
  const result = await bus.getChannel(Channels.Server).request(ServerEvents.Request, "Test");
} catch (error) {
  // No need for logging here, the subscription will do that
}
```

### Private channels
Once the bus is typed, you may want to use the same channel types in different streams, for example if you have different modules communicating with a central units, but all sending the same types of messages.

For this particular use case, it is possible to create private channels that rely on an ID shared between different modules. In this way, other part of your application won't be able to listen to events sent in that channel, and their messages won't affect the cache in your private channel.

```ts
import { EventBus } from "@mcastiello/event-bus";

const bus = new EventBus({ config });
const privateChannel = { channel: Channels.Network, id: "mypricate-id" };

// Adds a subscription to the message event on the private channel
bus.getChannel(privateChannel).subscribe(NetworkEvents.Message, (data) => console.log(data));

// This will not trigger the subscription.
bus.getChannel(Channels.Network).publish(NetworkEvents.Message, "Hello Public World!");
// This will.
bus.getChannel(privateChannel).publish(NetworkEvents.Message, "Hello Private World!");
```
