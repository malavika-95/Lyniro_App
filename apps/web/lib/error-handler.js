/**
 * Centralized error handling
 * ALL responses must follow this format:
 * Success: { success: true, data }
 * Error: { success: false, error }
 */

import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

/**
 * Handle API errors consistently
 * Usage: return handleError(error, "operation_name")
 */
export function handleError(error, operation = "operation") {
  console.error(`[${operation}] Error:`, error.message);

  let statusCode = 500;
  let message = error.message || "An error occurred";

  // Map common error types
  if (error.statusCode) {
    statusCode = error.statusCode;
  } else if (error.message?.includes("not found")) {
    statusCode = 404;
  } else if (error.message?.includes("unauthorized") || error.message?.includes("Unauthorized")) {
    statusCode = 401;
  } else if (error.message?.includes("forbidden") || error.message?.includes("Forbidden")) {
    statusCode = 403;
  } else if (error.message?.includes("already")) {
    statusCode = 409;
  }

  return NextResponse.json(
    {
      success: false,
      error: message
    },
    { status: statusCode }
  );
}

/**
 * Success response wrapper
 * Usage: return successResponse(data)
 */
export function successResponse(data, statusCode = 200) {
  return NextResponse.json(
    {
      success: true,
      data
    },
    { status: statusCode }
  );
}

/**
 * Error response wrapper
 * Usage: return errorResponse(message, statusCode)
 */
export function errorResponse(message, statusCode = 500) {
  return NextResponse.json(
    {
      success: false,
      error: message
    },
    { status: statusCode }
  );
}
