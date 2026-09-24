const GB = 1024 ** 3;

// Comprueba si un almacenamiento es accesible sin escribir nada en él.
function accessible(getter) {
  try {
    return getter() != null;
  } catch {
    return false;
  }
}

export default [
  {
    id: 'storageQuota',
    category: 'storage',
    name: 'Cuota de almacenamiento',
    // Depende del espacio libre en disco: varía sola.
    stable: false,
    async run() {
      if (!navigator.storage?.estimate) return { supported: false };
      const { quota = 0, usage = 0 } = await navigator.storage.estimate();
      const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : null;
      const quotaGB = quota / GB;
      const shown = quotaGB >= 1 ? `${quotaGB.toFixed(1)} GB` : `${Math.round(quota / 1024 ** 2)} MB`;
      const raw = { quota, usage, persisted };
      return { supported: true, value: `${shown} disponibles para esta web`, raw };
    },
  },
  {
    id: 'storageApis',
    category: 'storage',
    name: 'APIs de almacenamiento',
    run() {
      const raw = {
        localStorage: accessible(() => window.localStorage),
        sessionStorage: accessible(() => window.sessionStorage),
        indexedDB: accessible(() => window.indexedDB),
        cacheStorage: accessible(() => window.caches),
        serviceWorker: 'serviceWorker' in navigator,
        cookieStore: 'cookieStore' in window,
        opfs: typeof navigator.storage?.getDirectory === 'function',
        storageAccess: typeof document.hasStorageAccess === 'function',
      };
      const available = Object.entries(raw).filter(([, ok]) => ok).map(([name]) => name);
      const total = Object.keys(raw).length;
      return { supported: true, value: `${available.length}/${total} disponibles · ${available.join(', ')}`, raw };
    },
  },
];
