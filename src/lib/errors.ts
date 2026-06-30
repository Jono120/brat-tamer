/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OperationType, FirestoreErrorInfo } from "../types";

/**
 * Handles API errors by logging them and throwing a standardized error object
 * compatible with ErrorBoundary.
 */
export function handleApiError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: undefined,
      email: undefined,
      emailVerified: undefined,
      isAnonymous: undefined,
      tenantId: undefined,
      providerInfo: [],
    },
    operationType,
    path,
  };
  console.error("API Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/** Extracts a human-readable message from an unknown error. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed?.error) return String(parsed.error);
    } catch {
      /* not JSON */
    }
    return error.message;
  }
  return String(error);
}
