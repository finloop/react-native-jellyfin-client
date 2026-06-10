import Document from './DocumentPolyfill';
import Element from './ElementPolyfill';
import TextDecoderPolyfill from './TextDecoderPolyfill';
import W3CMediaPolyfill from './W3CMediaPolyfill';
import MiscPolyfill from './MiscPolyfill';

/**
 * Installs all browser/W3C polyfills required by hls.js before the player runs.
 */
export function installPolyfills() {
  Document.install();
  Element.install();
  TextDecoderPolyfill.install();
  W3CMediaPolyfill.install();
  MiscPolyfill.install();
}
