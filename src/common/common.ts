/**
 * Definitions common to both the client and server sides of RPC services.
 *
 * @module ModuleRpcCommon
 * @preferred
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/** */
import { BaseError } from 'make-error';
import { ModuleRpcUtils } from '../utils';

/**
 * All service definitions derive from this type.
 *
 * It associates a method name with request and response types as follows:
 * ```Typescript
 * const bankingServiceDefinition = {
 *   getBalance: {
 *     request: {} as {
 *       userId: string;
 *     },
 *     response: {} as {
 *       value: number;
 *       unit: string;
 *     },
 *   },
 *   transfer: {
 *     request: {} as {
 *       fromUserId: string;
 *       toUserId: string;
 *       amount: {
 *         value: number;
 *         unit: string;
 *       }
 *     },
 *     response: {} as {},
 *   },
 * };
 * ```
 *
 * The `{} as` allows us to derive proper typing.  It is better than defining
 * a service with, e.g., an interface: with the definition above, the methods
 * can be enumerated.
 */
export type ServiceDefinition = {
  [method: string]: { request: any; response: any; type?: any };
};

/**
 * The type of service methods.
 */
export const ServiceMethodType = {
  /**
   * A single request is followed by a single response.
   * Unary RPCs are the most common ones.
   */
  unary: Symbol('unary'),
  /**
   * A single request is followed by multiple responses (they
   * can be sent at different points in time).
   *
   * Server streams can be used, e.g., by a web application to subscribe to
   * push notifications.
   */
  serverStream: Symbol('serverStream'),
};

/** The service definition is misformed or ill-adapted to the transport protocol. */
export class MisspecifiedServiceError extends BaseError {}

/**
 * Method names for a service definition.
 *
 * @example ```Typescript
 * const serviceDefinition = {
 *   foo: { request: {} as {}, response: {} as {} },
 *   bar: { request: {} as {}, response: {} as {} },
 * };
 *
 * // `ModuleRpcCommon.MethodsFor<typeof serviceDefinition>` is equivalent
 * // to `'foo' | 'bar'`.
 * ```
 */
export type MethodsFor<serviceDefinition extends ServiceDefinition> = Extract<
  keyof serviceDefinition,
  string
>;

/**
 * The type of a request for the given method of a service.
 *
 * @example ```Typescript
 * const serviceDefinition = {
 *   foo: { request: {} as { hello: 'world' }, response: {} as {} },
 * };
 *
 * // `ModuleRpcCommon.RequestFor<typeof serviceDefinition, 'foo'>` is equivalent to
 * // `{ hello: 'world' }`.
 * ```
 */
export type RequestFor<
  serviceDefinition extends ServiceDefinition,
  method extends MethodsFor<serviceDefinition>
> = serviceDefinition[method]['request'];

/**
 * The type of a response for the given method of a service.
 *
 * @example ```Typescript
 * const serviceDefinition = {
 *   foo: { request: {} as {}, response: {} as { hello: 'world' } },
 * };
 *
 * // `ModuleRpcCommon.ResponseFor<typeof serviceDefinition, 'foo'>` is equivalent to
 * // `{ hello: 'world' }`.
 * ```
 */
export type ResponseFor<
  serviceDefinition extends ServiceDefinition,
  method extends MethodsFor<serviceDefinition>
> = serviceDefinition[method]['response'];

/**
 * Method names of the unary methods in a service definition (the server streams are
 * filtered out).
 *
 * @example ```Typescript
 * const serviceDefinition = {
 *   unary: { request: {} as {}, response: {} as {} },
 *   serverStream: {
 *     type: ModuleRpcCommon.ServiceMethodType.serverStream,
 *     request: {} as {},
 *     response: {} as {},
 *   },
 * };
 *
 * // `ModuleRpcCommon.UnaryMethodsFor<typeof serviceDefinition>` is equivalent
 * // to `'unary'` (the method `'serverStream'` is filtered out).
 * ```
 */
export type UnaryMethodsFor<
  serviceDefinition extends ServiceDefinition
> = Extract<
  ModuleRpcUtils.ValueOf<
    {
      [method in keyof serviceDefinition]: serviceDefinition[method] extends {
        type: typeof ServiceMethodType.serverStream;
      }
        ? never
        : method
    }
  >,
  string
> &
  MethodsFor<serviceDefinition>;

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

  /** Operation is not implemented or not supported/enabled in this service. */
  unimplemented = 'unimplemented',

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
 * Map used to encode both request and response contexts.
 * The maps are produced and decoded by the client/server context connectors.
 */
export interface EncodedContext {
  [key: string]: string;
}
