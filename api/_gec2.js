// Token nuevo (v2) que Microsoft exige desde octubre 2026 para sus voces gratis.
// Traducido de edge-tts 7.3 (drm.py). Funciona igual en el navegador y en Vercel.
(function (root) {
  'use strict';
  var TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
  var INIT = [0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A, 0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19];
  var STATE = [0xFD9FBEA2, 0x91243CE7, 0xBE499094, 0xCD2E1E0A, 0x6C006F49, 0x04BD35AB, 0xFEB0A7E4, 0x03EFFBD2];
  var SCHED = [0xEB24BF9E, 0x1558691F, 0xA0C09EE2, 0x0CFA32BA, 0xA622EE8C, 0xD1DD9491, 0xC0DD25A0, 0xF9E70AB6, 0xF0C31573, 0x7058CE4E, 0x7188E606, 0x00E5AB33, 0xD258B060, 0x72766564];
  var K = [0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5, 0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5, 0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3, 0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174, 0xE49B69C1, 0xEFBE4786, 0x0FC19DC6, 0x240CA1CC, 0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA, 0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7, 0xC6E00BF3, 0xD5A79147, 0x06CA6351, 0x14292967, 0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13, 0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85, 0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3, 0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070, 0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5, 0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3, 0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208, 0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2];
  var ADJ = 0xC9DC06A7, KB = K.slice(0, 14).concat([ADJ], K.slice(15));
  var S0ADJ = 0x059C0B80, S1ADJ = 0x000B92C0;
  var CS = [[0xE82E91B1, 0xB32700D0], [0x44DE24C6, 0x88DFF51D], [0x3BEB65BC, 0x29514038], [0xC89C5933, 0xB328CBDF], [0x8D1EC211, 0xD405B4D5], [0x314EF5D5, 0x26E55F3C], [0xE92491B1, 0x607801C6], [0xF0A5B9D5, 0x82B2C1FB], [0x06064CF3, 0xFA51A3DA], [0xDA79FA60, 0x207CC464], [0xBED20560, 0x3C3C74F3], [0x89F9C9F8, 0xD2D14B61], [0x35FA38C6, 0xBB04A2C1], [0xCB49E3C6, 0xC5626167]];
  var CSF = 0x82893933, CSA0 = 0xF2F90B1A, CSA1 = 0x0B1A0000;

  function u(x) { return x >>> 0; }
  function mul(a, b) { return Math.imul(a, b) >>> 0; }
  function rotr(x, n) { return ((x >>> n) | (x << (32 - n))) >>> 0; }
  function rol16(x) { x = x >>> 0; return ((x << 16) | (x >>> 16)) >>> 0; }
  function sg0(x) { return (rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3)) >>> 0; }
  function sg1(x) { return (rotr(x, 17) ^ rotr(x, 19) ^ (x >>> 10)) >>> 0; }
  function expand(w, first) { for (var i = first; i < 64; i++) w[i] = u(sg1(w[i - 2]) + w[i - 7] + sg0(w[i - 15]) + w[i - 16]); }
  function rounds(st, w, first) {
    var a = st[0], b = st[1], c = st[2], d = st[3], e = st[4], f = st[5], g = st[6], h = st[7];
    var k = first === 14 ? KB : K;
    for (var i = first; i < 64; i++) {
      var t1 = u(h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((g ^ (e & (f ^ g))) >>> 0) + k[i] + w[i]);
      var t2 = u(((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0) + (((a & b) | (c & (a | b))) >>> 0));
      h = g; g = f; f = e; e = u(d + t1); d = c; c = b; b = a; a = u(t1 + t2);
    }
    return [a, b, c, d, e, f, g, h];
  }
  function be(bytes, o, n) { var v = 0; for (var i = 0; i < n; i++) v = v * 256 + bytes[o + i]; return v >>> 0; }
  function shaInit(d) {
    var w = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, be(d, 0, 3), be(d, 3, 4)];
    for (var i = 16; i < 30; i++) {
      var v = SCHED[i - 16];
      if (i - 2 >= 14) v += i === 16 ? ((sg1(w[i - 2]) ^ S1ADJ) >>> 0) : sg1(w[i - 2]);
      if (i - 7 >= 14) v += w[i - 7];
      if (i - 15 >= 14) v += i === 29 ? ((sg0(w[i - 15]) ^ S0ADJ) >>> 0) : sg0(w[i - 15]);
      w[i] = u(v);
    }
    w[30] = u(sg1(w[28]) + w[23] + sg0(w[15]) + w[14] + ADJ - K[14]);
    expand(w, 31);
    var r = rounds(STATE, w, 14);
    return INIT.map(function (x, j) { return u(x + r[j]); });
  }
  function sha(d) {
    var len = 57 + d.length, pad = [];
    for (var i = 7; i < d.length; i++) pad.push(d[i]);
    pad.push(0x80);
    var z = ((55 - len) % 64 + 64) % 64; for (i = 0; i < z; i++) pad.push(0);
    var bits = len * 8; for (i = 7; i >= 0; i--) pad.push(Math.floor(bits / Math.pow(2, 8 * i)) & 255);
    var st = shaInit(d);
    for (var o = 0; o < pad.length; o += 64) {
      var w = []; for (i = 0; i < 16; i++) w.push(be(pad, o + i * 4, 4));
      expand(w, 16);
      var r = rounds(st, w, 0);
      st = st.map(function (x, j) { return u(x + r[j]); });
    }
    var out = []; st.forEach(function (x) { out.push((x >>> 24) & 255, (x >>> 16) & 255, (x >>> 8) & 255, x & 255); });
    return out;
  }
  function le(bytes, o) { return u(bytes[o] | (bytes[o + 1] << 8) | (bytes[o + 2] << 16) | (bytes[o + 3] << 24)); }
  function cs64(d, dg) {
    var ka = le(dg, 0) | 1, kb = le(dg, 4) | 1; ka >>>= 0; kb >>>= 0;
    var fac = [mul(ka, CSF), mul(kb, CSF)];
    var terms = CS.map(function (c, i) { return mul(c[0], fac[i % 2]); });
    var offs = CS.map(function (c) { return c[1]; });
    var data = [0].concat(d); while (data.length % 4) data.push(0);
    var words = []; for (var i = 0; i < data.length; i += 4) words.push(le(data, i));
    if (words.length % 2) words.push(0);
    words.forEach(function (wd, i) {
      var term = mul(wd, i % 2 === 0 ? ka : kb), off = mul(rol16(wd), i % 2 === 0 ? 0xEF0569FB : 0xC31713DB);
      if (i === 0) { term = u(term + mul(CSA0, fac[0])); off = u(off + CSA1); }
      terms.push(term); offs.push(off);
    });
    var sa = 0, sl = 0, st = 0, acc = 0;
    for (i = 0; i < terms.length; i += 2) {
      var x = terms[i], y = terms[i + 1];
      var t = rol16(u(offs[i] + x)), q = mul(t, 0x76F50F34);
      sa = u(sa + u(mul(rol16(q), 0xC3EFEA97) + q));
      t = rol16(u(offs[i + 1] + y)); q = mul(t, 0x1881CE3C);
      sl = u(mul(rol16(q), 0x35BD1EC9) + q);
      sa = u(sa + sl);
      st = u(mul(st, ka) + x);
      st = mul(rol16(st), 0xCF98B111); st = mul(rol16(st), 0x87085B9F); st = mul(rol16(st), 0x12CEB96D); st = mul(rol16(st), 0x257E1D83);
      acc = u(acc + st);
      t = u(mul(st, kb) + y);
      t = mul(rol16(t), 0xA27416F5); t = mul(rol16(t), 0xD38396FF);
      st = mul(rol16(mul(rol16(t), 0x7C932B89)), 0xBFA49F69);
      acc = u(acc + st);
    }
    return [u(sl ^ st), u(sa ^ acc)];
  }
  function hex(bytes) { return bytes.map(function (b) { return (b < 16 ? '0' : '') + b.toString(16); }).join('').toUpperCase(); }
  function u32le(x) { return [x & 255, (x >>> 8) & 255, (x >>> 16) & 255, (x >>> 24) & 255]; }
  // unixSeconds: hora actual en segundos (con la corrección de reloj ya sumada)
  function gec2(unixSeconds) {
    var s = Math.floor(unixSeconds) + 11644473600; s -= s % 300;
    var str = (BigInt(s) * 10000000n).toString() + TOKEN, d = [];
    for (var i = 0; i < str.length; i++) d.push(str.charCodeAt(i));
    var dg = sha(d), c = cs64(d, dg);
    return hex(u32le(c[0]).concat(u32le(c[1]))) + '-' + hex(dg);
  }
  root.EdgeGec2 = { gec2: gec2, VERSION: '2-143.0.3650.75' };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.EdgeGec2;
})(typeof window !== 'undefined' ? window : globalThis);
