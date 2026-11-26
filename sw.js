const CACHE_NAME = "arruda-barber-android-v38";

const ARQUIVOS = [
  "./",
  "./index.html",
  "./style.css?v=21",
  "./script.js?v=40",
  "./manifest.json",
  "./profissionais.html",
  "./staff.js?v=10",
  "./staff.css",
  "./arruda-logo-site.webp",
  "./C8550C37-53E1-4B14-92D8-B2CDCC5E32BE.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Um arquivo secundário indisponível não deve impedir o site inteiro de abrir.
      await Promise.all(ARQUIVOS.map(async arquivo => {
        try {
          const resposta = await fetch(arquivo, { cache: "reload" });
          if (resposta && resposta.ok) await cache.put(arquivo, resposta);
        } catch (erro) {
          console.warn("Não foi possível armazenar em cache:", arquivo, erro);
        }
      }));
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(chaves =>
      Promise.all(chaves
        .filter(chave => chave.startsWith("arruda-barber-") && chave !== CACHE_NAME)
        .map(chave => caches.delete(chave))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Arruda Barber";
  const options = {
    body: data.body || "Você tem uma atualização de agendamento.",
    icon: "./arruda-logo-site.webp",
    badge: "./arruda-logo-site.webp",
    tag: data.tag || "arruda-barber-notification",
    data: { url: data.url || "./" },
    renotify: false
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = event.notification.data && event.notification.data.url || "./";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(async list => {
    for (const client of list) {
      if ("focus" in client) {
        const focused = await client.focus();
        if ("navigate" in focused) await focused.navigate(new URL(target, self.location.href).href);
        return focused;
      }
    }
    return clients.openWindow(new URL(target, self.location.href).href);
  }));
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Não intercepta bibliotecas externas/CDNs; evita bloquear a abertura em Android.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request).then(resposta => {
      if (resposta && resposta.ok) {
        const copia = resposta.clone();
        event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(event.request, copia)));
      }
      return resposta;
    }).catch(async () => {
      const armazenada = await caches.match(event.request);
      if (armazenada) return armazenada;
      if (event.request.mode === "navigate") {
        const inicio = await caches.match("./index.html");
        if (inicio) return inicio;
      }
      return Response.error();
    })
  );
});
