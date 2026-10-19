(function () {
  'use strict';
  if (!localStorage.getItem('device_id')) {
    var id = typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Array.from(crypto.getRandomValues(new Uint8Array(16)), function (byte) {
          return byte.toString(16).padStart(2, '0');
        }).join('');
    localStorage.setItem('device_id', 'android-' + id);
  }
}());
