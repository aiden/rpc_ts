# Primer

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
