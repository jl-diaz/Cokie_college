// Polyfill for TextDecoder to support latin1 in React Native / Expo environment
// This prevents crashes when libraries like fast-png / jspdf try to instantiate TextDecoder with 'latin1'
const originalTextDecoder = global.TextDecoder;

if (originalTextDecoder) {
  try {
    new originalTextDecoder('latin1');
  } catch (e) {
    // If 'latin1' is not supported, we polyfill it
    global.TextDecoder = class TextDecoderPolyfill {
      constructor(encoding) {
        this.encoding = encoding ? encoding.toLowerCase() : 'utf-8';
        try {
          this.decoder = new originalTextDecoder(this.encoding);
        } catch (err) {
          // Fallback to utf-8 if the specific encoding is not supported by the native TextDecoder
          this.decoder = new originalTextDecoder('utf-8');
        }
      }

      decode(buffer, options) {
        if (this.encoding === 'latin1' || this.encoding === 'iso-8859-1') {
          let str = '';
          const arr = new Uint8Array(buffer);
          // Convert byte by byte
          for (let i = 0; i < arr.length; i++) {
            str += String.fromCharCode(arr[i]);
          }
          return str;
        }
        return this.decoder ? this.decoder.decode(buffer, options) : '';
      }
    };
  }
}
