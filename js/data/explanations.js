// Textos educativos por señal: qué es, por qué les importa a los trackers y
// cómo protegerte. Lenguaje llano, sin tecnicismos innecesarios.
export const EXPLANATIONS = {
  userAgent: {
    what: 'El texto con el que tu navegador se presenta en cada visita: nombre, versión, sistema operativo y arquitectura.',
    why: 'Es la señal más antigua del fingerprinting. Una combinación poco común de versión y sistema reduce mucho el grupo de gente entre la que te escondes.',
    protect: 'Mantén el navegador actualizado: las versiones viejas son minoría. Evita extensiones que inventan el User-Agent, porque un valor falso suele ser más raro que el real.',
  },
  clientHints: {
    what: 'La versión moderna del User-Agent en Chrome, Edge y compañía. Una web puede pedir la versión exacta del sistema, la arquitectura del procesador o el modelo del móvil.',
    why: 'Recupera el detalle que el User-Agent ya no da (por ejemplo, la versión exacta de Windows o macOS) sin avisarte de nada.',
    protect: 'Firefox y Safari no la implementan. En Chrome no se puede desactivar; Brave recorta parte de la información.',
  },
  platform: {
    what: 'Un campo antiguo que indica el sistema operativo: Win32, MacIntel, Linux x86_64…',
    why: 'Por sí solo aporta poco, pero sirve para cazar mentiras: si tu User-Agent dice Windows y esto dice Mac, has falseado algo.',
    protect: 'No lo cambies a mano. La incoherencia entre datos te delata más que el dato en sí.',
  },
  hardwareConcurrency: {
    what: 'Cuántos hilos de procesador tiene tu equipo.',
    why: 'Separa portátiles básicos de estaciones de trabajo. 4 u 8 es lo común; 12, 14 o 20 te vuelven más raro.',
    protect: 'Tor Browser y Firefox con resistFingerprinting devuelven siempre el mismo valor.',
  },
  deviceMemory: {
    what: 'La memoria RAM aproximada de tu equipo, redondeada a propósito.',
    why: 'Aunque esté redondeada, ayuda a separar equipos de gama baja y alta.',
    protect: 'Solo la exponen los navegadores basados en Chromium. Firefox y Safari no la dan.',
  },
  touch: {
    what: 'Si tu pantalla es táctil y cuántos dedos detecta a la vez.',
    why: 'Distingue móviles, tablets y portátiles táctiles de los ordenadores normales.',
    protect: 'Poco se puede hacer, pero es una señal de bajo impacto.',
  },
  languages: {
    what: 'Los idiomas que has configurado en el navegador, en orden de preferencia.',
    why: 'Un solo idioma común dice poco, pero una lista como «es-ES, ca, en-GB, de» es rarísima.',
    protect: 'Deja solo uno o dos idiomas habituales en los ajustes del navegador.',
  },
  privacyFlags: {
    what: 'Si aceptas cookies y si envías las señales «Do Not Track» (DNT) y «Global Privacy Control» (GPC).',
    why: 'Paradoja: activar DNT te hace más distinguible, porque lo usa poca gente y casi ninguna web lo respeta. GPC sí tiene valor legal en algunos lugares.',
    protect: 'Activa GPC si tu navegador lo permite. DNT está obsoleto: puedes dejarlo apagado.',
  },
  pdfViewer: {
    what: 'Si tu navegador trae un visor de PDF integrado.',
    why: 'Aporta muy poco, pero suma: está desactivado en algunos entornos corporativos y móviles.',
    protect: 'No merece la pena tocarlo.',
  },
  webdriver: {
    what: 'Una marca que se enciende cuando un programa controla el navegador (Selenium, Playwright, Puppeteer…).',
    why: 'Las webs la usan para detectar bots. Si sale activada siendo tú una persona, llamas mucho la atención.',
    protect: 'Solo aparece al automatizar el navegador. Si no lo esperabas, revisa qué software lo está controlando.',
  },
  screen: {
    what: 'La resolución de tu pantalla y su profundidad de color.',
    why: '1920×1080 es muy común; la resolución de un portátil concreto o de un monitor ultrapanorámico reduce mucho tu grupo.',
    protect: 'Tor Browser y Firefox con resistFingerprinting informan de un tamaño falso y estándar.',
  },
  pixelRatio: {
    what: 'Cuántos píxeles físicos hay por cada píxel de la web (pantallas Retina, escalado de Windows).',
    why: 'Junto a la resolución, apunta al modelo de pantalla o al escalado que usas. Cambia con el zoom, por eso no entra en tu hash.',
    protect: 'Navegar con el zoom al 100 % te acerca a la mayoría.',
  },
  availableScreen: {
    what: 'El espacio de pantalla que queda libre después de la barra de tareas o el Dock.',
    why: 'Revela el tamaño y la posición de tu barra de tareas, que depende de cómo tienes configurado el sistema.',
    protect: 'Firefox ya altera este dato por defecto (lo avisa en su consola de desarrollador).',
  },
  windowSize: {
    what: 'El tamaño de la ventana del navegador y de la zona visible de la página.',
    why: 'Una ventana no maximizada tiene medidas casi únicas. Cambia al redimensionar, pero sirve para seguirte durante una sesión.',
    protect: 'Tor Browser redondea la ventana a tamaños estándar («letterboxing»). Maximizar la ventana ayuda un poco.',
  },
  displayCaps: {
    what: 'Lo que tu pantalla es capaz de mostrar (gama de color, HDR) y si usas ratón o dedo para señalar.',
    why: 'Separa pantallas HDR o de gama P3 (típicas de Apple) y tipos de dispositivo.',
    protect: 'Son capacidades reales de tu hardware: poco que hacer.',
  },
  preferences: {
    what: 'Tus ajustes de accesibilidad y apariencia: modo oscuro, reducir movimiento, alto contraste…',
    why: 'Las opciones minoritarias, como el alto contraste o reducir transparencias, te hacen más distinguible.',
    protect: 'No renuncies a la accesibilidad por esto: compensa de sobra. Solo tenlo en cuenta.',
  },
  canvas: {
    what: 'Dibujamos texto, emoji y formas en un lienzo invisible y calculamos su hash. Tu tarjeta gráfica, sus drivers y tus fuentes lo pintan con diferencias mínimas.',
    why: 'Es una de las técnicas favoritas de los trackers: invisible, estable durante meses y muy distintiva.',
    protect: 'Brave, Safari y Firefox (con protección reforzada) añaden ruido; Tor Browser lo bloquea. Si aquí pone «con ruido añadido», tu navegador te está protegiendo.',
  },
  webgl: {
    what: 'El modelo de tu tarjeta gráfica, tal como lo cuenta WebGL, la API de gráficos 3D de la web.',
    why: 'Puede revelar el hardware exacto, por ejemplo «NVIDIA GeForce RTX 3060». Safari lo generaliza como «Apple GPU».',
    protect: 'Safari y Firefox con resistFingerprinting lo enmascaran. En Chrome no se puede ocultar sin extensiones.',
  },
  webglCaps: {
    what: 'Los límites técnicos y las extensiones que soporta tu GPU en WebGL.',
    why: 'Son decenas de parámetros que, juntos, forman un perfil de tu combinación de tarjeta, driver y navegador.',
    protect: 'Desactivar WebGL lo elimina, pero rompe mapas, juegos y visores 3D.',
  },
  webgpu: {
    what: 'La nueva API gráfica de la web. Indica el fabricante y la arquitectura de tu GPU y qué funciones soporta.',
    why: 'Da información de hardware aún más detallada que WebGL.',
    protect: 'Todavía no está en todos los navegadores, y Firefox la limita.',
  },
  fonts: {
    what: 'Comprobamos una lista de fuentes una a una, midiendo cómo se dibuja un texto con cada una.',
    why: 'Las fuentes que instalas (Office, Adobe, fuentes de programación) son muy personales. La lista delata tu sistema y tus programas.',
    protect: 'Safari y Firefox solo enseñan las fuentes del sistema. Tor Browser trae su propio juego de fuentes, igual para todos.',
  },
  audio: {
    what: 'Generamos un sonido sin reproducirlo y sumamos sus muestras. La pila de audio de tu sistema produce decimales ligeramente distintos.',
    why: 'Es estable e invisible. Los scripts de fingerprinting reales lo combinan con el canvas.',
    protect: 'Brave y Safari (en navegación privada) añaden ruido. Firefox con resistFingerprinting lo normaliza.',
  },
  speechVoices: {
    what: 'La lista de voces de texto a voz instaladas en tu sistema.',
    why: 'Depende del sistema operativo, de su versión y de los paquetes de idioma que hayas instalado. Muy distintiva.',
    protect: 'Tor Browser la oculta. En el resto de navegadores no se puede desactivar.',
  },
  timezone: {
    what: 'Tu zona horaria y su diferencia con la hora universal (UTC).',
    why: 'Te sitúa en una región del mundo sin necesidad de tu IP.',
    protect: 'Tor Browser y Firefox con resistFingerprinting fingen estar en UTC. Si usas VPN, una zona que no encaja con tu IP te delata.',
  },
  intlLocale: {
    what: 'Tu configuración regional: idioma de los formatos, calendario, sistema de numeración y reloj de 12 o 24 horas.',
    why: 'Confirma tu región y, combinada con los idiomas, afina todavía más.',
    protect: 'Usar la configuración por defecto de tu país te mezcla con más gente.',
  },
  intlFormats: {
    what: 'Cómo escribe tu navegador fechas, números y monedas.',
    why: 'Las pequeñas diferencias revelan la versión de la librería de idiomas del navegador y tu región.',
    protect: 'No se puede cambiar sin cambiar la configuración regional.',
  },
  connection: {
    what: 'El tipo y la calidad de tu conexión (4G, velocidad, latencia), según los navegadores Chromium.',
    why: 'Cambia con la red, así que no entra en tu hash, pero ayuda a relacionar visitas hechas desde el mismo sitio.',
    protect: 'Solo la exponen los navegadores Chromium. Firefox y Safari no.',
  },
  mediaDevices: {
    what: 'Cuántas cámaras, micrófonos y salidas de audio tienes, sin pedirte permiso.',
    why: 'Sin permiso no se ven los nombres y los navegadores modernos limitan el recuento, pero el número todavía suma.',
    protect: 'No des permiso de cámara o micrófono a webs en las que no confíes: con él verían los modelos exactos.',
  },
  gamepads: {
    what: 'Los mandos de juego conectados.',
    why: 'Solo se revelan después de pulsar un botón, pero un mando concreto es un dato muy poco común.',
    protect: 'Desconecta los mandos cuando no los uses.',
  },
  webrtc: {
    what: 'WebRTC, la tecnología de las videollamadas, puede revelar las direcciones IP de tu red local.',
    why: 'Durante años cualquier web veía tu IP local (192.168…). Hoy los navegadores la esconden tras un nombre aleatorio «.local» (mDNS). Aquí usamos WebRTC sin servidor externo, así que tu IP pública ni se consulta.',
    protect: 'Si aquí ves una IP local, actualiza el navegador o usa una extensión que limite WebRTC.',
  },
  storageQuota: {
    what: 'Cuánto espacio puede ocupar esta web para guardar datos en tu equipo.',
    why: 'En Chrome depende del tamaño de tu disco y del espacio libre: un número bastante personal.',
    protect: 'Firefox y Safari devuelven cuotas más genéricas.',
  },
  storageApis: {
    what: 'Qué sistemas de almacenamiento local están disponibles: localStorage, IndexedDB, caché… (no hemos escrito nada en ellos).',
    why: 'Si alguno está bloqueado, sugiere ajustes de privacidad estrictos o una ventana privada.',
    protect: 'Borrar los datos de los sitios al cerrar el navegador corta el rastreo por cookies, aunque no el fingerprinting.',
  },
  cssFeatures: {
    what: 'Qué funciones modernas de CSS entiende tu navegador.',
    why: 'Cada versión añade funciones nuevas: el perfil delata tu motor y tu versión aunque falsees el User-Agent.',
    protect: 'No se puede ocultar. Lo mejor es estar actualizado, como la mayoría.',
  },
  apis: {
    what: 'Qué APIs existen en tu navegador: Bluetooth, USB, IA integrada, Apple Pay…',
    why: 'Igual que el CSS, revela navegador y versión, y a veces también el sistema (Apple Pay → Safari).',
    protect: 'Mantener el navegador al día te agrupa con la mayoría.',
  },
  timerPrecision: {
    what: 'Cada cuánto «avanza» el reloj de alta precisión de tu navegador.',
    why: 'Los navegadores lo degradan a propósito para frenar ataques de temporización, y el nivel exacto delata navegador y ajustes.',
    protect: 'Firefox con resistFingerprinting lo empeora mucho a propósito: es buena señal de protección.',
  },
  adBlock: {
    what: 'Colocamos un «anuncio» cebo invisible y comprobamos si alguien lo oculta.',
    why: 'Usar bloqueador es cosa de una minoría, así que suma algo de información.',
    protect: 'Aun así, usa uno (por ejemplo uBlock Origin): evita muchos más rastreadores de los que te delata.',
  },
  antiFingerprinting: {
    what: 'Buscamos rastros de navegadores con protección: Brave, Tor Browser o Firefox con resistFingerprinting.',
    why: 'La protección funciona mejor cuanta más gente la use de la misma forma: un protegido raro también destaca.',
    protect: 'Tor Browser es la opción más fuerte. Brave y Firefox con protección reforzada son buenos equilibrios para el día a día.',
  },
};
