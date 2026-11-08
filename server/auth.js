export function httpError(status, message) { return Object.assign(new Error(message), {status}); }
export async function requireVerified(headers, verifyToken) {
  const authorization = headers.authorization || headers.get?.('authorization') || '';
  if (!authorization.startsWith('Bearer ') || authorization.length > 10000) throw httpError(401, 'Please sign in to continue.');
  let token;
  try { token = await verifyToken(authorization.slice(7), true); }
  catch { throw httpError(401, 'Your session expired. Please sign in again.'); }
  if (!token?.uid) throw httpError(401, 'Please sign in to continue.');
  if (token.email_verified !== true) throw httpError(403, 'Please verify your email address to continue.');
  return token;
}
