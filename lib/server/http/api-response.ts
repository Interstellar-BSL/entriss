import { NextResponse } from "next/server";

import type { VisitState } from "@/lib/server/visits/visit-states";

export interface ApiEnvelopeSuccess<T = unknown> {
  success: true;
  state: VisitState;
  data?: T;
}

export interface ApiEnvelopeError {
  success: false;
  state?: VisitState;
  error: {
    code: string;
    message: string;
  };
}

export function apiSuccess<T>({
  state,
  data,
}: {
  state: VisitState;
  data?: T;
}): ApiEnvelopeSuccess<T> {
  return {
    success: true,
    state,
    data,
  };
}

export function apiError({
  state,
  code,
  message,
}: {
  state?: VisitState;
  code: string;
  message: string;
}): ApiEnvelopeError {
  return {
    success: false,
    ...(state ? { state } : {}),
    error: {
      code,
      message,
    },
  };
}

export function jsonApiSuccess<T>(
  envelope: ApiEnvelopeSuccess<T>,
  status = 200,
) {
  return NextResponse.json(envelope, { status });
}

export function jsonApiError(envelope: ApiEnvelopeError, statusCode: number) {
  return NextResponse.json(envelope, { status: statusCode });
}
