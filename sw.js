/* Service worker del dossier Garda.
 *
 * Il documento e' uno solo e contiene tutto, quindi metterlo in cache basta
 * a farlo aprire sul lago anche senza campo.
 *
 * Strategia deliberatamente asimmetrica:
 *  - la PAGINA va presa dalla rete quando c'e', con un tetto di 4 secondi:
 *    e' un documento di prezzi, servire una copia vecchia mentre il telefono
 *    ha campo sarebbe un danno, non una comodita';
 *  - le ICONE e il manifest dalla cache: non cambiano mai.
 *
 * La cache porta la data della revisione nel nome: pubblicare una versione
 * nuova butta via la precedente invece di stratificarla.
 */
const CACHE = 'garda-2026-v5';
const ESSENZIALI = [
  './',
  './index.html',
  './archivio.html',
  './manifest.webmanifest',
  './icona-192.png',
  './icona-512.png',
  './icona-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ESSENZIALI))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((chiavi) => Promise.all(
        chiavi.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

function conTetto(richiesta, ms) {
  return new Promise((risolvi, rifiuta) => {
    const timer = setTimeout(() => rifiuta(new Error('rete lenta')), ms);
    fetch(richiesta).then(
      (r) => { clearTimeout(timer); risolvi(r); },
      (err) => { clearTimeout(timer); rifiuta(err); }
    );
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   /* Booking, Maps e Airbnb non si toccano */

  /* Il collaudo non entra in cache. E' uno strumento di diagnosi, non serve
     offline, e servirne una copia vecchia significa collaudare il codice di
     ieri credendo di collaudare quello di oggi: e' gia' successo. */
  if (url.pathname.indexOf('collaudo') >= 0) return;

  const eDocumento = req.mode === 'navigate' ||
        (req.headers.get('accept') || '').includes('text/html');

  if (eDocumento) {
    e.respondWith(
      conTetto(req, 4000)
        .then((risposta) => {
          const copia = risposta.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copia));
          return risposta;
        })
        .catch(() => caches.match('./index.html').then((c) => c || caches.match('./')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((c) => c || fetch(req).then((r) => {
      if (r.ok) {
        const copia = r.clone();
        caches.open(CACHE).then((cc) => cc.put(req, copia));
      }
      return r;
    }))
  );
});
