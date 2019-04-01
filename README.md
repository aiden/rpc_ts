# rpc_ts: Remote Procedure Calls in TypeScript made simple 🤞

[![CircleCI](https://circleci.com/gh/aiden/rpc_ts/tree/master.svg?style=svg)](https://circleci.com/gh/aiden/rpc_ts/tree/master) [![Coverage Status](https://coveralls.io/repos/github/aiden/rpc_ts/badge.svg?branch=master)](https://coveralls.io/github/aiden/rpc_ts?branch=master) [![npm version](https://badge.fury.io/js/rpc_ts.svg)](https://badge.fury.io/js/rpc_ts) [![typescript](./docs/typescript.svg)](https://aleen42.github.io/badges/src/typescript.svg) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

rpc_ts is a framework for doing typesafe [Remote Procedure Calls (RPC)](https://en.wikipedia.org/wiki/Remote_procedure_call) in TypeScript. It uses no [Domain-Specific Language](https://en.wikipedia.org/wiki/Domain-specific_language) such as [Protocol Buffers](https://developers.google.com/protocol-buffers/) or [Apache Thrift](https://thrift.apache.org/): the services are all defined using the powerful TypeScript type system. This approach is particularly suitable for shortening the development cycle of isomorphic web applications that rely on TypeScript for both frontend and backend development.

rpc_ts supports both unary calls and server-side streaming and is fully compatible with the [grpc-web+json](https://github.com/grpc/grpc-web) protocol (an adaptation of the popular gRPC protocol for the web). It has been designed with a relentless focus on modularity, simplicity, and robustness, and does not require the use of an intermediate gRPC proxy.

## Examples

### Chat room

[![Chat room](docs/rpc_ts_chat_demo.gif)](https://github.com/aiden/rpc_ts_chat)

The [chat room](https://github.com/aiden/rpc_ts_chat) example showcases error handling and real-time with rpc_ts, and also best practices.

### Primer

This is how a minimal RPC service with one procedure, `getHello`, looks like:

```Typescript
import { ModuleRpcCommon } from 'rpc_ts/lib/common';
import { ModuleRpcServer } from 'rpc_ts/lib/server';
import { ModuleRpcProtocolServer } from 'rpc_ts/lib/protocol/server';
import { ModuleRpcProtocolClient } from 'rpc_ts/lib/protocol/client';

// Definition of the RPC service
const helloServiceDefinition = {
  getHello: {
    request: {} as { language: string },
    response: {} as { text: string },
  },
};

// Implementation of an RPC server
import * as express from 'express';
import * as http from 'http';
const app = express();
const handler: ModuleRpcServer.ServiceHandlerFor<typeof helloServiceDefinition> = {
  async getHello({ language }) {
    if (language === 'Spanish') return { text: 'Hola' };
    throw new ModuleRpcServer.ServerRpcError(
      ModuleRpcCommon.RpcErrorType.notFound,
      `language '${language}' not found`,
    );
  },
};
app.use(ModuleRpcProtocolServer.registerRpcRoutes(helloServiceDefinition, handler));
const server = http.createServer(app).listen();

// Now let's do a Remote Procedure Call
async function rpc() {
  const { text } = await ModuleRpcProtocolClient.getRpcClient(helloServiceDefinition, {
    remoteAddress: `http://localhost:${server.address().port}`
  }).getHello({ language: 'Spanish' });
  // (Notice that, with TypeScript typing, it is not possible to mess up the
  // type of the request: for instance, `.getHello({ lang: 'Spanish' })`
  // will error.)

  console.log('Hello:', text);
}

rpc().then(() => server.close()).catch(err => {
  console.error(err);
  process.exit(1);
});
```

## Why rpc_ts?

Bootstrapping an HTTP REST API over JSON is extremely simple in dynamic languages such as Python and JavaScript. With the right framework, it is possible to write a client/server interaction in a few lines of codes. This simplicity comes from that the conversion to and from untyped JSON feels natural, but also that no explicit contract is specified between the client and the user.

On the other side of the spectrum, both gRPC and Thrift are built around Interface Definition Languages that provide such a contract. They have also been developed with performance in mind, and their primary application is compiled languages with static typing such as C++ and Java, even though they are also available in Python, JavaScript, and other dynamic languages. However,

1.  The IDLs must be translated to clients and server stubs in the target languages, adding an additional building step.

2.  The service definition lives in at least two languages, sometimes three: the IDL, the server-side language and the client-side language (if they are different).

3.  The very rigid IDL type system fights against, rather than helps, the "native" type constructs and tends to [contaminate more and more of the code base](http://reasonablypolymorphic.com/blog/protos-are-wrong/). This is especially saddening with regards to TypeScript and its well-crafted system of [algebraic data types](https://en.wikipedia.org/wiki/Algebraic_data_type) (algebraic data types are very cool).

**We believe that rpc_ts fills an important gap in the RPC ecosystem: it provides a hassle-free way to define APIs in an expressive language, TypeScript, so that we can build isomorphic applications faster.** 🏖

## The protocol

The protocol we implement is gRPC-Web with a JSON codec (a.k.a, `grpc-web+json`), as introduced [here](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-WEB.md). So we are not reinventing anything here, we are just making the whole process simpler (🤞).

## Other projects

The [gRPC-Web reference implementation of a JavaScript client](https://github.com/grpc/grpc-web), based on a Protocol Buffer codec, is now [generally available](https://www.cncf.io/blog/2018/10/24/grpc-web-is-going-ga/). There also exists a [TypeScript-first implementation](https://github.com/improbable-eng/grpc-web) of a gRPC-Web client, again with Protocol Buffers, and a Golang server.

Our implementation, to the best of our knowledge, is the first implementation of a gRPC-Web server in TypeScript, and the first implementation of gRPC-Web which can work with arbitrary codecs, including JSON, and the first that does not necessitate compiling the service definition from a foreign Interface Definition Language.

## Runtime type checks

In the context of an isomorphic web application running on Node.js, rpc_ts is typesafe as long as both the client and the server are compiled from the same codebase and share the same service definition. This is a real shortcoming for public APIs as well as a security issue. Fortunately, the TypeScript compiler can be very easily plugged into. We are using such runtime type checking internally and are also in the process of open sourcing it so that this I/O boundary can be addressed.

## Concepts

A _service_ handles Remote Procedure Calls (RPCs), or methods, taking requests and giving back responses.

A service has two implementations: a _client,_ and a _server_ (the server delegates the actual execution to a _handler_). The actual _transportation protocol,_ linking the client to the server, is abstracted away by the RPC system. This transportation protocol needs to serialize/encode and deserialize/decode the requests and responses from their in-memory representation, suitable for manipulation by the clients and handlers, to an encoded representation that can be transmitted on the wire. This process, handled by a _codec,_ must be fast to provide high throughput and must produce small encoded messages to limit network latency.

### Contexts

The requests and responses are augmented with _contexts_ (either _request contexts_ or _response contexts_). Contexts are added by _context connectors_ and contain meta information that pertains to the remote nature of the procedure call. A rule of thumb is that a piece of information belongs to a context if it wouldn't make sense to include it in the request or response of a procedure call that occurred locally, within the same OS process. Additionally, context connectors can abort an RPC if some precondition is not met. Context connectors can be used to:

- ensure that the requester is properly authenticated and authorized,
- inject user data concerning the requester (such as user ID, user locale, time zone, or perhaps user preferences in general),
- inject identifiers for [distributed tracing](http://opentracing.io/documentation/),
- provide timestamping to deal with out-of-order responses.

Context connectors are always paired (there is always a client-side and a server-side context connectors for the same feature).

Go to the [context](./src/examples/context) example to see how it works in the context of authentication.

### Unary calls and server streams

RPCs can be classified according to how requests and responses intermingle during the call:

- Unary RPCs: a single request is followed by a single response;
- Server streams: a single request is followed by multiple responses (they can be sent at different points in time);
- Client streams: multiple requests are followed by a single response;
- Bidirectional streams, requests and responses can be sent at arbitrary points in time.

Unary RPCs and server streams can be implemented using half duplexes (think of "walkie-talkies" where the two parties to the communication cannot communicate at the same time), client and bidirectional streams require a full duplex communication (where simultaneous communication is possible). This has implications for the transportation layer used. For example, client and bidirectional streams cannot be implemented in HTTP/1.1 and, whereas the HTTP2 RFC provides a full duplex, the current browser interface to HTTP2 allows only for a half duplex (in the browser, full duplexes can be implemented using WebSocket). That's why for, now, gRPC-Web, including our implementation, only supports unary calls and server streams.

Go to the [server_stream](./src/examples/server_stream) example to see how server streams are implemented with rpc_ts.

## License

rpc_ts is licensed under the MIT License.
