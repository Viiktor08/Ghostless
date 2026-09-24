// Sin servidor STUN: solo se ven los candidatos "host" que el navegador genera
// en local. Así no se hace ninguna petición a terceros.
const GATHER_TIMEOUT = 1800;

function parseCandidate(line) {
  // "candidate:842163049 1 udp 1677729535 192.168.1.2 56143 typ host ..."
  const parts = line.replace(/^a=/, '').split(' ');
  const typeIndex = parts.indexOf('typ');
  return {
    protocol: (parts[2] ?? '').toLowerCase(),
    address: parts[4] ?? '',
    type: typeIndex > -1 ? parts[typeIndex + 1] : 'desconocido',
  };
}

const isMdns = (address) => address.endsWith('.local');

function gatherCandidates(pc) {
  return new Promise((resolve) => {
    const candidates = [];
    const finish = () => {
      clearTimeout(timer);
      resolve(candidates);
    };
    const timer = setTimeout(finish, GATHER_TIMEOUT);
    pc.onicecandidate = (event) => {
      if (event.candidate?.candidate) candidates.push(event.candidate.candidate);
      else if (!event.candidate) finish();
    };
  });
}

export default [
  {
    id: 'webrtc',
    category: 'network',
    name: 'WebRTC (IPs locales)',
    // Los nombres mDNS son aleatorios en cada visita.
    stable: false,
    async run() {
      const PeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;
      if (!PeerConnection) return { supported: false };

      const pc = new PeerConnection({ iceServers: [] });
      try {
        const gathering = gatherCandidates(pc);
        pc.createDataChannel('ghostless');
        await pc.setLocalDescription(await pc.createOffer());
        const candidates = (await gathering).map(parseCandidate);

        const unique = [...new Set(candidates.map((c) => c.address))];
        const hidden = unique.filter(isMdns);
        const exposed = unique.filter((a) => a && !isMdns(a));
        const raw = {
          candidates: candidates.length,
          types: [...new Set(candidates.map((c) => `${c.type}/${c.protocol}`))].sort(),
          mdns: hidden.length,
          exposed,
        };

        let value;
        if (!candidates.length) value = 'sin candidatos: tu navegador no revela direcciones locales';
        else if (exposed.length) value = `IP local visible: ${exposed.join(', ')}`;
        else value = `${hidden.length} dirección${hidden.length === 1 ? '' : 'es'} oculta${hidden.length === 1 ? '' : 's'} tras un nombre mDNS aleatorio`;
        return { supported: true, value, raw };
      } finally {
        pc.close();
      }
    },
  },
];
