/**
 * @module ModuleRpcCommon
 *
 * Definitions common to both the client and server sides of RPC services.
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { ValueOf } from '../utils/type_utils';

/**
 * All service definitions derive from this type.
 *
 * It associates a method name with request and response types as follows:
 * ```Typescript
 * const bankingServiceDefinition = {
 *   getBalance: {
 *     request: null as {
 *       userId: string;
 *     },
 *     response: null as {
 *       value: number;
 *       unit: string;
 *     },
 *   },
 *   transfer: {
 *     request: null as {
 *       fromUserId: string;
 *       toUserId: string;
 *       amount: {
 *         value: number;
 *         unit: string;
 *       }
 *     },
 *     response: null as {},
 *   },
 * };
 * ```
 *
 * The `null as` allows us to derive proper typing.  It is better than defining
 * a service with a TypeScript type because with such a definition the methods
 * can be enumerated.
 */
export type ServiceDefinition = {
  [method: string]: { request: any; response: any; type?: any };
};

export const ServiceMethodType = {
  unary: Symbol('unary'),
  serverStream: Symbol('serverStream'),
};

/** The service definition is misformed or ill-adapted to the transport protocol. */
export class MisspecifiedServiceError extends Error {}

export type MethodsFor<
  serviceDefinition extends ServiceDefinition
> = keyof serviceDefinition;

/** The type of a request for the given method of a service. */
export type RequestFor<
  serviceDefinition extends ServiceDefinition,
  method extends keyof serviceDefinition
> = serviceDefinition[method]['request'];

/** The type of a response for the given method of a service. */
export type ResponseFor<
  serviceDefinition extends ServiceDefinition,
  method extends keyof serviceDefinition
> = serviceDefinition[method]['response'];

export type ResponseWithContextFor<
  serviceDefinition extends ServiceDefinition,
  method extends keyof serviceDefinition,
  ResponseContext
> = {
  response: ResponseFor<serviceDefinition, method>;
  responseContext: ResponseContext;
};

export type UnaryMethodsFor<
  serviceDefinition extends ServiceDefinition
> = ValueOf<
  {
    [method in keyof serviceDefinition]: serviceDefinition[method] extends {
      type: typeof ServiceMethodType.serverStream;
    }
      ? never
      : method
  }
>;

/**
 * Error types reported by RPC services.  The error types broadly follow the gRPC
 * status codes as detailed here: https://github.com/grpc/grpc-go/blob/master/codes/codes.go
 */
export enum RpcErrorType {
  /** Unknown error. */
  unknown = 'unknown',

  /** The operation was canceled (typically by the caller). */
  canceled = 'canceled',

  /**
   * The client specified an invalid argument. Note that this differs from FailedPrecondition.
   * It indicates arguments that are problematic regardless of the state of the system
   * (e.g., a malformed file name).
   */
  invalidArgument = 'invalidArgument',

  /** Some requested entity (e.g., file or directory) was not found. */
  notFound = 'notFound',

  /** An attempt to create an entity failed because one already exists. */
  alreadyExists = 'alreadyExists',

  /**
   * Some resource has been exhausted, perhaps a per-user quota, or perhaps the entire
   * file system is out of space.
   */
  resourceExhausted = 'resourceExhausted',

  /** The caller does not have permission to execute the specified operation. */
  permissionDenied = 'permissionDenied',

  /**
   * The operation was rejected because the system is not in a state required for the
   * operation's execution. For example, directory to be deleted may be non-empty, an rmdir
   * operation is applied to a non-directory, etc.
   */
  failedPrecondition = 'failedPrecondition',

  /**
   * Some invariants expected by the underlying system has been broken. If you see one of
   * these errors, something is very broken.
   */
  internal = 'internal',

  /**
   * The service is currently unavailable.  This is a most likely a transient
   * condition and may be corrected by retrying with a backoff.
   */
  unavailable = 'unavailable',

  /** the request does not have valid authentication credentials for the operation. */
  unauthenticated = 'unauthenticated',
}

/**
 * Both request and response contexts are encoded as maps.
 * The maps are produced and decoded by the client/server context connectors.
 * */
export type EncodedContext = { [key: string]: string };

/** List of available transport protocols. */
export enum Protocol {
  /** grpc-web with JSON serialization/deserialization */
  grpcWebJson = 'grpcWebJson',
}
