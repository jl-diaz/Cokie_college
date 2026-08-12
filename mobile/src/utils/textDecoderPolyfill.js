// Polyfill for TextDecoder & TextEncoder in React Native / Expo Hermes engine
// Prevents startup crashes when libraries like fast-png / jspdf / html2canvas reference TextDecoder/TextEncoder

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = class TextDecoderPolyfill {
    constructor(encoding = 'utf-8') {
      this.encoding = encoding ? String(encoding).toLowerCase() : 'utf-8';
    }

    decode(buffer) {
      if (!buffer) return '';
      const arr = new Uint8Array(buffer);
      let str = '';
      for (let i = 0; i < arr.length; i++) {
        str += String.fromCharCode(arr[i]);
      }
      return str;
    }
  };
} else {
  try {
    new global.TextDecoder('latin1');
  } catch (e) {
    const NativeTextDecoder = global.TextDecoder;
    global.TextDecoder = class TextDecoderPolyfill {
      constructor(encoding = 'utf-8') {
        this.encoding = encoding ? String(encoding).toLowerCase() : 'utf-8';
        try {
          this.nativeDecoder = new NativeTextDecoder(this.encoding);
        } catch (err) {
          try {
            this.nativeDecoder = new NativeTextDecoder('utf-8');
          } catch (e2) {
            this.nativeDecoder = null;
          }
        }
      }

      decode(buffer, options) {
        if (this.encoding === 'latin1' || this.encoding === 'iso-8859-1') {
          if (!buffer) return '';
          let str = '';
          const arr = new Uint8Array(buffer);
          for (let i = 0; i < arr.length; i++) {
            str += String.fromCharCode(arr[i]);
          }
          return str;
        }
        return this.nativeDecoder ? this.nativeDecoder.decode(buffer, options) : '';
      }
    };
  }
}

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = class TextEncoderPolyfill {
    constructor() {
      this.encoding = 'utf-8';
    }

    encode(str) {
      if (typeof str !== 'string') str = String(str || '');
      const arr = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i++) {
        arr[i] = str.charCodeAt(i) & 0xff;
      }
      return arr;
    }
  };
}
