import { join } from 'node:path';
import { connect } from './croche.mjs';
import { TodoStore } from './todos.mjs';

export class AppError extends Error {}

export function settings(env = process.env) {
  const { CROCHE_PROJECT_KEY: projectKey, CROCHE_DEBUG_KEY: debugKey } = env;
  if (!projectKey?.trim() || !debugKey?.trim()) {
    throw new AppError('Load the CLI-created .env with both project and debug keys using npm start.');
  }
  const user = env.TODO_USER ?? 'local-user';
  if (!/^[\w-]{1,64}$/.test(user)) throw new AppError('TODO_USER must use 1–64 letters, numbers, underscores or hyphens.');
  return { projectKey, debugKey, user };
}

export async function openSession({ dataDir, ...options }) {
  const store = new TodoStore(join(dataDir, 'todos.json'));
  return { store, ...await connect({ ...options, dataDir: join(dataDir, 'croche'), store }) };
}

// Never print raw SDK errors: diagnostics may contain private input or credentials.
export function errorMessage(error) {
  if (error instanceof AppError) return error.message;
  const hints = {
    account_credit_exhausted: 'Development allowance exhausted. Check your balance in Studio.',
    invite_required: 'Activate your account with your private invite code in Studio.',
    unverified_allowance_exhausted: 'Unverified allowance exhausted. Review app verification in Studio.',
    gateway_unavailable: 'Model service unavailable. Try again later.',
  };
  return (Object.hasOwn(hints, error?.code ?? '') ? hints[error.code] : undefined) ?? 'Could not finish. Check setup and Studio → Monitoring → Logs; do not share keys or raw private diagnostics.';
}
