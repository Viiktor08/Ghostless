export default [
  {
    id: 'connection',
    category: 'network',
    name: 'Tipo de conexión',
    // Cambia con la red: no entra en el hash.
    stable: false,
    run() {
      const c = navigator.connection;
      if (!c) return { supported: false };
      const raw = {
        type: c.type ?? null,
        effectiveType: c.effectiveType ?? null,
        downlink: c.downlink ?? null,
        rtt: c.rtt ?? null,
        saveData: c.saveData ?? null,
      };
      const parts = [
        raw.type,
        raw.effectiveType && `calidad ${raw.effectiveType}`,
        raw.downlink != null && `↓ ~${raw.downlink} Mbps`,
        raw.rtt != null && `latencia ~${raw.rtt} ms`,
        raw.saveData && 'ahorro de datos activado',
      ].filter(Boolean);
      return { supported: true, value: parts.join(' · '), raw };
    },
  },
];
