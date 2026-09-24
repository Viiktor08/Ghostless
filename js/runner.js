// Ejecuta todos los collectors a la vez, cada uno con su timeout, y nunca deja
// que uno solo rompa la página.

export const DEFAULT_TIMEOUT = 2500;

const EMPTY_RESULT = { supported: false, value: null, raw: null, blocked: false, error: null };

class TimeoutError extends Error {
  constructor(ms) {
    super(`timeout (${ms} ms)`);
    this.name = 'TimeoutError';
  }
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Cede el hilo antes de cada collector para que la UI pueda pintar entre medias.
const yieldToBrowser = () => new Promise((resolve) => setTimeout(resolve, 0));

function errorMessage(err) {
  if (err instanceof Error) return err.message || err.name;
  return String(err);
}

function normalize(outcome) {
  if (outcome === null || typeof outcome !== 'object') {
    return { ...EMPTY_RESULT, supported: outcome !== undefined, value: outcome ?? null };
  }
  return {
    ...EMPTY_RESULT,
    ...outcome,
    supported: Boolean(outcome.supported),
    blocked: Boolean(outcome.blocked),
    error: outcome.error ? String(outcome.error) : null,
  };
}

function describe(collector, outcome, ms) {
  const { id, category, name, stable = true } = collector;
  return { id, category, name, stable, ...normalize(outcome), ms: Math.round(ms) };
}

async function runOne(collector, timeout) {
  await yieldToBrowser();
  const start = performance.now();
  let outcome;
  try {
    outcome = await withTimeout(Promise.resolve().then(() => collector.run()), timeout);
  } catch (err) {
    outcome = { supported: true, error: errorMessage(err), timedOut: err instanceof TimeoutError };
  }
  return describe(collector, outcome, performance.now() - start);
}

export async function runCollectors(collectors, { timeout = DEFAULT_TIMEOUT, onResult } = {}) {
  const tasks = collectors.map(async (collector) => {
    const result = await runOne(collector, collector.timeout ?? timeout);
    try {
      onResult?.(result);
    } catch (err) {
      console.error('onResult falló para', collector.id, err);
    }
    return result;
  });

  const settled = await Promise.allSettled(tasks);
  return settled.map((s, i) =>
    s.status === 'fulfilled'
      ? s.value
      : describe(collectors[i], { supported: true, error: errorMessage(s.reason) }, 0),
  );
}
