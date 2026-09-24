import { shortHash } from '../hash.js';

const PARAMS_WEBGL1 = [
  'MAX_TEXTURE_SIZE',
  'MAX_CUBE_MAP_TEXTURE_SIZE',
  'MAX_RENDERBUFFER_SIZE',
  'MAX_VIEWPORT_DIMS',
  'MAX_VERTEX_ATTRIBS',
  'MAX_VERTEX_UNIFORM_VECTORS',
  'MAX_FRAGMENT_UNIFORM_VECTORS',
  'MAX_VARYING_VECTORS',
  'MAX_TEXTURE_IMAGE_UNITS',
  'MAX_VERTEX_TEXTURE_IMAGE_UNITS',
  'MAX_COMBINED_TEXTURE_IMAGE_UNITS',
  'ALIASED_LINE_WIDTH_RANGE',
  'ALIASED_POINT_SIZE_RANGE',
  'SUBPIXEL_BITS',
];

const PARAMS_WEBGL2 = [
  'MAX_3D_TEXTURE_SIZE',
  'MAX_ARRAY_TEXTURE_LAYERS',
  'MAX_DRAW_BUFFERS',
  'MAX_COLOR_ATTACHMENTS',
  'MAX_SAMPLES',
  'MAX_UNIFORM_BUFFER_BINDINGS',
  'MAX_UNIFORM_BLOCK_SIZE',
  'MAX_COMBINED_UNIFORM_BLOCKS',
  'MAX_TEXTURE_LOD_BIAS',
  'MAX_VERTEX_OUTPUT_COMPONENTS',
  'MAX_FRAGMENT_INPUT_COMPONENTS',
];

// Renderers que no dicen nada del hardware real.
const GENERIC_RENDERER = /^(mozilla|webkit webgl|generic renderer|disabled|apple gpu)$/i;

function readParam(gl, name) {
  const value = gl.getParameter(gl[name]);
  return value && typeof value === 'object' && 'length' in value ? Array.from(value) : value;
}

function readWebGL() {
  const canvas = document.createElement('canvas');
  let gl = null;
  let version = null;
  for (const [type, v] of [['webgl2', 2], ['webgl', 1], ['experimental-webgl', 1]]) {
    try {
      gl = canvas.getContext(type);
    } catch {
      gl = null;
    }
    if (gl) {
      version = v;
      break;
    }
  }
  if (!gl) return null;

  let vendor = gl.getParameter(gl.VENDOR);
  let renderer = gl.getParameter(gl.RENDERER);
  let unmasked = false;
  // Chrome y Safari devuelven "WebKit WebGL" y esconden el dato real tras
  // una extensión. Firefox ya lo da en RENDERER (y avisa si pides la
  // extensión), así que solo se pide cuando hace falta.
  if (/webkit/i.test(`${vendor} ${renderer}`)) {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) {
      vendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL);
      renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
      unmasked = true;
    }
  }

  const params = {};
  for (const name of version === 2 ? [...PARAMS_WEBGL1, ...PARAMS_WEBGL2] : PARAMS_WEBGL1) {
    if (gl[name] !== undefined) params[name] = readParam(gl, name);
  }
  const precision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);

  return {
    version,
    vendor,
    renderer,
    unmasked,
    glVersion: gl.getParameter(gl.VERSION),
    shadingLanguage: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
    antialias: gl.getContextAttributes()?.antialias ?? null,
    precision: precision ? [precision.rangeMin, precision.rangeMax, precision.precision] : null,
    params,
    extensions: [...(gl.getSupportedExtensions() ?? [])].sort(),
  };
}

// Las dos señales de WebGL comparten un único contexto.
let webglInfo;
const getWebGLInfo = () => (webglInfo ??= Promise.resolve().then(readWebGL));

const WEBGPU_LIMITS = [
  'maxTextureDimension2D',
  'maxBindGroups',
  'maxComputeWorkgroupSizeX',
  'maxComputeInvocationsPerWorkgroup',
  'maxStorageBufferBindingSize',
  'maxBufferSize',
];

export default [
  {
    id: 'webgl',
    category: 'render',
    name: 'Tarjeta gráfica (WebGL)',
    async run() {
      const info = await getWebGLInfo();
      if (!info) return { supported: false };
      const masked = GENERIC_RENDERER.test(String(info.renderer).trim());
      const raw = { vendor: info.vendor, renderer: info.renderer };
      const value = `${info.renderer} · ${info.vendor}${masked ? ' (genérico/enmascarado)' : ''}`;
      return { supported: true, value, raw, details: { masked, unmasked: info.unmasked } };
    },
  },
  {
    id: 'webglCaps',
    category: 'render',
    name: 'Capacidades WebGL',
    async run() {
      const info = await getWebGLInfo();
      if (!info) return { supported: false };
      const { version, glVersion, shadingLanguage, antialias, precision, params, extensions } = info;
      const raw = { version, glVersion, shadingLanguage, antialias, precision, params, extensions };
      const value = `WebGL ${version} · ${extensions.length} extensiones · ${params.MAX_TEXTURE_SIZE}px máx. textura · ${await shortHash(JSON.stringify(raw))}`;
      return { supported: true, value, raw };
    },
  },
  {
    id: 'webgpu',
    category: 'render',
    name: 'Tarjeta gráfica (WebGPU)',
    async run() {
      if (!navigator.gpu?.requestAdapter) return { supported: false };
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return { supported: true, value: 'API presente, sin adaptador disponible', raw: 'no-adapter' };

      const info = adapter.info ?? {};
      const limits = {};
      for (const name of WEBGPU_LIMITS) limits[name] = adapter.limits?.[name] ?? null;
      const raw = {
        vendor: info.vendor ?? null,
        architecture: info.architecture ?? null,
        device: info.device ?? null,
        description: info.description ?? null,
        fallback: adapter.isFallbackAdapter ?? info.isFallbackAdapter ?? null,
        features: [...adapter.features].sort(),
        limits,
      };
      const label = [...new Set([raw.vendor, raw.architecture, raw.description].filter(Boolean))].join(' · ') || 'sin detalles';
      return { supported: true, value: `${label} · ${raw.features.length} features`, raw };
    },
  },
];
