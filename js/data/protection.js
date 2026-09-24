// Consejos de protección. Las rutas de menú cambian entre versiones:
// revisarlas de vez en cuando.

export const GOLDEN_RULES = [
  'Parecerse a la mayoría protege más que esconderse: cada ajuste raro te hace más único.',
  'Mantén el navegador actualizado: las versiones antiguas son minoría y destacan.',
  'Instala pocas extensiones. Algunas se detectan y te diferencian; un bloqueador como uBlock Origin sí compensa.',
  'Separa usos: un navegador o perfil para tus cuentas y otro para navegar por ahí.',
  'Borra las cookies al cerrar. El fingerprinting no las necesita, pero los trackers suelen combinar ambas cosas.',
  'No concedas permisos (cámara, micrófono, ubicación) si no hacen falta: con ellos se ven muchos más datos.',
];

export const BROWSERS = [
  {
    id: 'chrome',
    name: 'Chrome',
    level: 'baja',
    summary: 'Chrome no incluye protección contra el fingerprinting: casi todo lo que ves arriba lo puede leer cualquier web.',
    tips: [
      'Configuración → Privacidad y seguridad → Cookies de terceros → «Bloquear cookies de terceros».',
      'Instala uBlock Origin Lite: bloquea muchos scripts de rastreo conocidos, que son los que suelen calcular las huellas.',
      'Configuración → Privacidad y seguridad → Configuración de sitios: revisa qué webs tienen permiso de cámara, micrófono y ubicación.',
      'Si la privacidad es prioritaria, Brave usa el mismo motor y las mismas extensiones, pero añade ruido a tu huella.',
    ],
  },
  {
    id: 'edge',
    name: 'Edge',
    level: 'media',
    summary: 'Edge comparte motor con Chrome, así que su huella es igual de rica, pero puede bloquear rastreadores conocidos.',
    tips: [
      'Configuración → Privacidad, búsqueda y servicios → Prevención de seguimiento → «Estricta». Bloquea más rastreadores, incluidos scripts de fingerprinting conocidos.',
      'Instala uBlock Origin Lite desde la tienda de complementos de Edge.',
      'Revisa los permisos de sitio en Configuración → Cookies y permisos del sitio.',
      'No añade ruido a canvas ni audio: la huella de tu equipo sigue siendo muy visible.',
    ],
  },
  {
    id: 'firefox',
    name: 'Firefox',
    level: 'media-alta',
    summary: 'Firefox bloquea fingerprinters conocidos por defecto y tiene protecciones más fuertes a un par de clics.',
    tips: [
      'Ajustes → Privacidad & Seguridad → Protección mejorada contra rastreo → «Estricta». Bloquea fingerprinters conocidos y sospechosos.',
      'En esa misma página, activa la opción de Global Privacy Control («decir a los sitios web que no vendan ni compartan mis datos»).',
      'Máxima protección: en about:config pon privacy.resistFingerprinting a true. Iguala muchas señales con las de Tor Browser (hora UTC, ventana estándar…), aunque rompe algunas webs.',
      'Instala uBlock Origin: en Firefox sigue funcionando la versión completa.',
      'Las ventanas privadas ya traen protección extra contra el fingerprinting.',
    ],
  },
  {
    id: 'safari',
    name: 'Safari',
    level: 'media-alta',
    summary: 'Safari ya recorta mucho: GPU genérica («Apple GPU»), solo fuentes del sistema y nada de Client Hints.',
    tips: [
      'Mac: Safari → Ajustes → Avanzado → «Usar protección avanzada contra rastreo y huellas digitales» en toda la navegación (por defecto solo en la privada).',
      'iPhone y iPad: Ajustes → Safari (en iOS 18, Ajustes → Apps → Safari) → Avanzado → «Protección avanzada contra rastreo y huellas digitales» → toda la navegación.',
      'Con iCloud+, activa Relay privado de iCloud y «Ocultar dirección IP» para que los rastreadores no vean tu IP real.',
      'Es la protección por defecto de los iPhone: mucha gente comparte exactamente la misma huella.',
    ],
  },
  {
    id: 'brave',
    name: 'Brave',
    level: 'alta',
    summary: 'Brave añade ruido aleatorio («farbling») a canvas, audio y WebGL: tu huella cambia en cada sesión y en cada web.',
    tips: [
      'En los Escudos (el león de la barra de direcciones), mantén activado el bloqueo de huellas digitales.',
      'brave://settings/shields: sube el bloqueo de rastreadores y anuncios a «Agresivo» si no te rompe las webs que usas.',
      'Si vienes de Chrome es el cambio con menos esfuerzo: mismo motor y mismas extensiones.',
      'Aquí lo notarás en el test de estabilidad: tu hash cambiará al reiniciar el navegador.',
    ],
  },
  {
    id: 'tor',
    name: 'Tor Browser',
    level: 'máxima',
    summary: 'La protección más fuerte: todos los usuarios de Tor Browser intentan tener exactamente la misma huella.',
    tips: [
      'No cambies el tamaño de la ventana a mano: el «letterboxing» la redondea para que coincida con la de otros usuarios.',
      'No instales extensiones ni cambies ajustes: cualquier diferencia te separa del grupo.',
      'Nivel de seguridad «Más seguro» o «El más seguro» para desactivar funciones que amplían la huella.',
      'Es más lento y algunas webs lo bloquean: úsalo cuando el anonimato importe de verdad.',
    ],
  },
];
