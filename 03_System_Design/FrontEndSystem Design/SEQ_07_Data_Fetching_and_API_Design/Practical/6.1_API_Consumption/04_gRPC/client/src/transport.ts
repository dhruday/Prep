/**
 * transport.ts — Single shared gRPC-Web transport instance.
 *
 * FAANG CONCEPT:
 *   The transport is the connection layer between the browser and gRPC.
 *   createGrpcWebTransport speaks the "gRPC-Web" wire protocol:
 *     - Sends binary protobuf frames in POST bodies
 *     - Works with Envoy's grpc_web HTTP filter
 *     - NOT raw gRPC (browsers can't do raw HTTP/2 framing)
 *
 *   Interceptors are applied outermost-first (array order):
 *     loggingInterceptor( authInterceptor( network ) )
 *     └─ timing includes token injection overhead
 *
 *   All hooks and clients import the same transport so interceptors fire once
 *   per call rather than being duplicated across modules.
 *
 * CHANGING THE BASE URL:
 *   - Local Docker stack:   "http://localhost:8080"  (default)
 *   - Staging/prod:         "https://api.yourdomain.com"
 */

import { createGrpcWebTransport } from "@connectrpc/connect-web";
import { authInterceptor } from "./interceptors/auth";
import { loggingInterceptor } from "./interceptors/logging";

export const transport = createGrpcWebTransport({
  baseUrl: "http://localhost:8080",
  interceptors: [loggingInterceptor, authInterceptor],
});
