const CACHE_NAME = 'elo-final-v3';

const arquivosPrincipais = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
];

const icones = [
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Arquivos essenciais: se algum deles falhar, a instalação não deve ser considerada concluída.
    await cache.addAll(arquivosPrincipais);

    // Ícones opcionais: podem ser adicionados depois, sem bloquear a instalação do PWA.
    await Promise.all(
      icones.map(arquivo =>
        cache.add(arquivo).catch(() => {
          console.log('Ícone ainda não disponível:', arquivo);
        })
      )
    );

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const chaves = await caches.keys();

    await Promise.all(
      chaves
        .filter(chave => chave.startsWith('elo-') && chave !== CACHE_NAME)
        .map(chave => caches.delete(chave))
    );

    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const salvo = await caches.match(event.request);
    if (salvo) return salvo;

    try {
      const resposta = await fetch(event.request);

      if (resposta && resposta.ok) {
        const copia = resposta.clone();
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, copia);
      }

      return resposta;
    } catch (erro) {
      // Sem internet: páginas de navegação retornam o shell do aplicativo.
      if (event.request.mode === 'navigate') {
        return (await caches.match('./index.html')) || Response.error();
      }
      return Response.error();
    }
  })());
});
