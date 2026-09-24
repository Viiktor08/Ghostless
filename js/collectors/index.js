// Registro de todos los collectors. Para añadir una señal nueva basta con
// crear el módulo y sumarlo aquí: la UI se pinta sola.
import navigatorCollectors from './navigator.js';
import screenCollectors from './screen.js';
import localeCollectors from './locale.js';
import storageCollectors from './storage.js';

export default [...navigatorCollectors, ...screenCollectors, ...localeCollectors, ...storageCollectors];
