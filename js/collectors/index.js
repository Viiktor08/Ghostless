// Registro de todos los collectors. Para añadir una señal nueva basta con
// crear el módulo y sumarlo aquí: la UI se pinta sola.
import navigatorCollectors from './navigator.js';
import screenCollectors from './screen.js';
import canvasCollectors from './canvas.js';
import webglCollectors from './webgl.js';
import fontCollectors from './fonts.js';
import audioCollectors from './audio.js';
import localeCollectors from './locale.js';
import networkCollectors from './network.js';
import mediaCollectors from './media.js';
import webrtcCollectors from './webrtc.js';
import storageCollectors from './storage.js';
import capabilityCollectors from './capabilities.js';
import privacyCollectors from './privacy.js';

export default [
  ...navigatorCollectors,
  ...screenCollectors,
  ...canvasCollectors,
  ...webglCollectors,
  ...fontCollectors,
  ...audioCollectors,
  ...localeCollectors,
  ...networkCollectors,
  ...mediaCollectors,
  ...webrtcCollectors,
  ...storageCollectors,
  ...capabilityCollectors,
  ...privacyCollectors,
];
