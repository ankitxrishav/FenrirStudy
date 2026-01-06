// A list of custom error types for the application.

/**
 * Represents the contextual information for a Firestore Security Rule denial.
 * This is used to construct a detailed error message for debugging.
 */
export type SecurityRuleContext = {
  /** The Firestore path that was accessed (e.g., "users/some-user-id"). */
  path: string;
  /** The operation that was denied (e.g., "get", "create", "update"). */
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  /** The data that was being sent with the request (for write operations). */
  requestResourceData?: any;
};

/**
 * A custom error that provides detailed context about a Firestore
 * security rule violation. In development, this error is thrown
 * to be caught by the Next.js overlay, providing rich debugging information.
 */
export class FirestorePermissionError extends Error {
  public context: SecurityRuleContext;

  constructor(context: SecurityRuleContext) {
    const message = `
FirestoreError: Missing or insufficient permissions. The following request was denied by Firestore Security Rules:
${JSON.stringify({ ...context, requestResourceData: context.requestResourceData ?? 'No data provided' }, null, 2)}
`;
    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;

    // This is necessary to make the stack trace readable in Node.js
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FirestorePermissionError);
    }
  }
}
