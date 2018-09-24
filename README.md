# api_framework

TODO: Rework after article.

`api_framework` is a framework for doing typesafe [_Remote Procedure Calls (RPC)_](https://en.wikipedia.org/wiki/Remote_procedure_call) in TypeScript. It uses no [_Domain-Specific Language_](https://en.wikipedia.org/wiki/Domain-specific_language) (and in that differs from RPC frameworks that serialize their messages using [Protocol Buffers](https://developers.google.com/protocol-buffers/) and [Apache Thrift](https://thrift.apache.org/)): the services are all defined using TypeScript. This approach is particularly suitable for shortening the development cycle of isomorphic web applications that rely on TypeScript for both frontend and backend development.

## Example

_example.ts_

```Typescript
const helloServiceDefinition = {
  getLocalHello: {
    request: null as {
      language: string;
    },
    response: null as {
      text: string;
    },
  },
};

/* ... Some piping to get the client object (see below) ... */

const { response: balanceResponseBefore } = await client.getBalance({});
console.log('Balance is', balanceResponseBefore.value);

console.log('Transfering...');
await client.transfer({
  toUserId: 'u2',
  amount: balanceResponseBefore.value / 2,
});

const { response: balanceResponseAfter } = await client.getBalance({});
console.log('Now balance is', balanceResponseAfter.value);
```

## Justification

_TODO: update after blog article._

Remote procedure calls is not a new thing, before the gRPC craze you had CORBA, SOAP & co. gRPC and Finagle are the two most popular RPC frameworks developed by the "cool" companies (resp. by Google and Twitter), whereas the aforementioned RPCs feel too Oracle/IBM-like for some people. Speaking of RPCs instead of REST API just means having strongly typed definitions in a domain-specific language and a way to call a wrapper function in your choice language that handles the transportation mechanism. The problem with both gRPC and Finagle is that the transportation layer is not HTTP REST-based, but extremely custom. Messages are not JSON-serialized but transmitted in binary form (protocol buffers for gRPC, Apache Thrift for Finagle), and communication does not occur via HTTP but with a custom transportation layer that is akin to HTTP2 for connection multiplexing. So lots of performance, but clearly a huge machinery to put in place. Another problem is that these frameworks are made for server-to-server communication, not for communicating with browsers. For gRPC, you need a server-side adapter such as web-gRPC. So it gets out of hand very quickly.

In contrast, this implementation leverages Typescript instead of a domain-specific language. It makes sense in the context of a nodejs web app, as Typescript types allow to fully exploit server-client isomorphism. Moreover, it is flexible enough to accommodate any transportation protocol.

Currently, it means that the client/server architecture is typesafe as long as they are compiled from the same codebase and share the same _service definition._ In the future, it would be best to implement on top of that I/O boundary type checks (checking that when you serialize/deserialize your JSON you end up with the right fields).

## Concepts

A _service_ handles Remote Procedure Calls (RPCs), or _methods,_ taking _requests_ and giving back _responses._ A service has two implementations: a _client_, and a _server_ (the server delegates the actual execution to a _handler_). The actual _transportation protocol_, from client to server, back to client, is abstracted away. [`http_json`](./protocol/http_json) is a lightweight protocol that is provided as part of this package. Other transportation protocols that are compatible with this library include [gRPC](https://grpc.io/) and [finagle-thrift](https://twitter.github.io/finagle/guide/Protocols.html).

The requests and responses are augmented with _contexts_ (either _request contexts_ or _response contexts_). Contexts are added by _context connectors_ and contain meta information that pertain to the remote nature of the procedure call. A rule of thumb is that a piece of information belongs to a context if it wouldn't make sense to include it in the request or response of a procedure call that occured locally, within the same OS process. Additionally, context connectors can abort an RPC if some precondition is not met. Context connectors can be used to:

- ensure that the requester is properly authenticated and authorized,
- inject user data concerning the requester (such as user ID, user locale, time zone, or perhaps user preferences in general),
- inject identifiers for [distributed tracing](http://opentracing.io/documentation/),
- provide timestamping to deal with out-of-order responses.

## Detailed Example

A complete example of an RPC system implemented using this framework can be found in [`./examples/simple`](./examples/simple).

## API

### Service definitions

Services are all defined as maps of method names to method definitions. The casting of null values is a trick that allows the library to provide proper typing:

```Typescript
const myServiceDefinition = {
  myMethod: {
    request: null as { /** Request type */ },
    response: null as { /** Response type */ },
  },
};
```

Both the request and response types have to be object types.

### Protocols

#### `http_json` transportation protocol

The service methods are all implemented by the server as `POST` routes on an Express router, and the requests and responses are JSON-serialized. Accordingly, `http_json` clients use the `fetch` API, available in modern browsers and through a [polyfill](https://github.com/github/fetch). The fetch API understands HTTP2 as well, allowing the whole transportation to occur on a single TCP connection with HTTP2 frames.

#### `getHttpJsonRpcClient`

Return an RPC client for the `http_json` protocol.

```Typescript
function getHttpJsonRpcClient<
  serviceDefinition extends ModuleRpcCommon.ServiceDefinition,
  ResponseContext
>(
  serviceDefinition: serviceDefinition,
  clientContextConnector: ModuleRpcClient.ClientContextConnector<
    ResponseContext
  >,
  options: HttpJsonClientOptions,
): ModuleRpcCommon.Service<serviceDefinition, ResponseContext>;
```

Arguments:

- `serviceDefinition`: The service definition.
- `clientContextConnector`: The client context connector to provide an encoded request context and decode the encoded response context coming from the server.
- `options`: Transport options.
  - `remoteAddress`: The remote address to connect to (example: https://domain.test:8000).

#### `registerHttpJsonRpcRoutes`

Register the API routes of an RPC service for the `http_json` protocol.

```Typescript
function registerHttpJsonRpcRoutes<
  serviceDefinition extends ModuleRpcCommon.ServiceDefinition,
  RequestContext
>(
  serviceDefinition: serviceDefinition,
  serviceHandler: ModuleRpcServer.ServiceHandlerFor<
    serviceDefinition,
    RequestContext
  >,
  serverContextConnector: ModuleRpcServer.ServerContextConnector<
    RequestContext
  >,
  options: HttpJsonServerOptions = {},
);
```

Arguments:

- `serviceDefinition`: The service definition.
- `serverContextConnector`: The server context connector to provide an encoded response context and decode the encoded request context coming from the client.
- `options`: Transport options.
  - `router`: The Express router to add the routes to.
  - `captureError`: A function to capture errors that occurred during RPCs.

### Context connectors

Context connectors are always paired (there is always a client-side and a server-side context connectors for the same feature).

The context connectors that are provided here are:

- `empty` (`EmptyClientContextConnector` and `EmptyServerContextConnector`): Provide empty request and response contexts.
- `composite` (`CompositeClientContextConnector` and `CompositeServerContextConnector`): Compose multiple context connectors (both client and server side). The resulting contexts are maps of the composed contexts, indexed by arbitrary context names.
- `timestamp` (`TimestampClientContextConnector` and `TimestampServerContextConnector`): Provide a response context containing a timestamp. Provide an empty request context.
- `token_auth` (`TokenAuthClientContextConnector` and `TokenAuthServerContextConnector`): Provide a request context with an authentication token. Provide an empty response context.

## Redux

A Redux package is also provided to remove the boilerplate from invoking RPCs within the confine of Redux.

On top of some utility functions to ease the writing of reducers in general (`createReducer`, `composeReducers`, `combineReducers`, ...), the package provides a Redux middleware that dispatches multiple actions corresponding to the lifecycle events of an RPC (it is called, it starts, it succeeds, it fails), and a reducer creator that make "subscribing" to these events pretty easy.

An example of using RPC with Redux is provided in [`./examples/redux`](./examples/redux).
