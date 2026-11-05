// Ciclo de fotos: envio, exibição, capa, permissões, limites. Requer imóveis IMV-102/IMV-103 (dados de exemplo).
import { createHash, randomBytes } from "node:crypto";
import { api, B, check, CORRETOR, prepararCorretor, resumo, sessao } from "./_util.mjs";

console.log("Fotos");
await prepararCorretor();
const webp = (n) => { const b = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBPVP8 "), randomBytes(n - 16)]); b.writeUInt32LE(n - 8, 4); return b; };
const payload = (img, mini) => ({ imagem: img.toString("base64"), miniatura: mini.toString("base64"), hash: createHash("sha256").update(img).digest("hex").slice(0, 16) });
const get = (path, email = "andrewsfranco93@gmail.com") => fetch(B + path, { headers: { cookie: `imobi_sessao=${sessao(email)}` } });

const img = webp(150_000), mini = webp(20_000);
let r = await api("POST", "/api/imoveis/IMV-102/fotos", { body: payload(img, mini) });
const f1 = await r.json();
check("Sócio envia → 201 e 1ª vira capa", r.status === 201 && f1.capa === true, JSON.stringify(f1));
r = await get(`/api/fotos/${f1.id}/${f1.hash}.webp`);
check("foto servida idêntica, com cache imutável", r.status === 200 && Buffer.from(await r.arrayBuffer()).equals(img) && /immutable/.test(r.headers.get("cache-control") ?? ""));
check("miniatura servida", Buffer.from(await (await get(`/api/fotos/${f1.id}/${f1.hash}-mini.webp`)).arrayBuffer()).equals(mini));
check("hash errado → 404", (await get(`/api/fotos/${f1.id}/${"0".repeat(16)}.webp`)).status === 404);
check("sem login → 401", (await fetch(`${B}/api/fotos/${f1.id}/${f1.hash}.webp`)).status === 401);

r = await api("POST", "/api/imoveis/IMV-102/fotos", { email: CORRETOR, body: payload(webp(120_000), webp(15_000)) });
const f2 = await r.json();
check("Corretor envia 2ª (não é capa)", r.status === 201 && f2.capa === false);
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), randomBytes(5000)]);
r = await api("POST", "/api/imoveis/IMV-102/fotos", { body: { imagem: jpeg.toString("base64"), miniatura: jpeg.toString("base64"), hash: "ab".repeat(8) } });
const f3 = await r.json();
check("JPEG (Safari) aceito e servido como image/jpeg", r.status === 201 && (await get(`/api/fotos/${f3.id}/${f3.hash}.webp`)).headers.get("content-type") === "image/jpeg");
check("PNG disfarçado → 400", (await api("POST", "/api/imoveis/IMV-102/fotos", { body: { ...payload(img, mini), imagem: Buffer.from("\x89PNG\r\n\x1a\nxxxx").toString("base64") } })).status === 400);
check("> 300 KB → 413", (await api("POST", "/api/imoveis/IMV-102/fotos", { body: payload(webp(400_000), mini) })).status === 413);
check("imóvel inexistente → 404", (await api("POST", "/api/imoveis/NAO-EXISTE/fotos", { body: payload(img, mini) })).status === 404);
check("outra origem (CSRF) → 403", (await api("POST", "/api/imoveis/IMV-102/fotos", { body: payload(img, mini), origin: "https://evil.example" })).status === 403);
check("Corretor não exclui foto de outra pessoa", (await api("DELETE", `/api/fotos/${f1.id}`, { email: CORRETOR })).status === 404);
check("trocar capa", (await api("POST", `/api/fotos/${f2.id}/capa`)).status === 200);
let d = await (await api("GET", "/api/imoveis/IMV-102")).json();
check("detalhe: 3 fotos e capa = 2ª", d.fotos.length === 3 && d.fotos[0].id === f2.id && d.fotos[0].capa);
check("Corretor exclui a própria (capa)", (await api("DELETE", `/api/fotos/${f2.id}`, { email: CORRETOR })).status === 200);
d = await (await api("GET", "/api/imoveis/IMV-102")).json();
check("capa passa para outra foto", d.fotos.length === 2 && d.fotos.filter((f) => f.capa).length === 1);
for (const f of d.fotos) await api("DELETE", `/api/fotos/${f.id}`);

const ids = [];
for (let i = 0; i < 15; i++) ids.push((await (await api("POST", "/api/imoveis/IMV-103/fotos", { body: payload(webp(2_000), webp(500)) })).json()).id);
check("16ª foto do imóvel → 409", (await api("POST", "/api/imoveis/IMV-103/fotos", { body: payload(webp(2_000), webp(500)) })).status === 409);
for (const id of ids) await api("DELETE", `/api/fotos/${id}`);
check("limpeza", (await (await api("GET", "/api/imoveis/IMV-103")).json()).fotos.length === 0);
resumo("Fotos");
