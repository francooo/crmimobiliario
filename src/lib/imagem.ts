// Redução e compressão de fotos NO NAVEGADOR antes do envio (o servidor não processa imagem:
// economiza CPU do Worker e espaço no Neon). WebP quando o navegador suporta; senão JPEG (Safari).

export const LIMITE = { lado: 1280, ladoMini: 400, maxBytes: 290_000, maxMiniBytes: 55_000 };

export type FotoPronta = { imagem: string; miniatura: string; hash: string; bytes: number; previewUrl: string };

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function render(bitmap: ImageBitmap, lado: number, maxBytes: number): Promise<Blob> {
  const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height));
  let w = Math.round(bitmap.width * escala);
  let h = Math.round(bitmap.height * escala);
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Seu navegador não permite processar imagens.");
    ctx.drawImage(bitmap, 0, 0, w, h);
    for (const q of [0.78, 0.68, 0.58, 0.48]) {
      let blob = await toBlob(canvas, "image/webp", q);
      if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", q); // Safari
      if (blob && blob.size <= maxBytes) return blob;
    }
    w = Math.round(w * 0.8);
    h = Math.round(h * 0.8);
  }
  throw new Error("Não foi possível reduzir a foto o suficiente.");
}

async function base64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = "";
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}

export async function prepararFoto(file: File): Promise<FotoPronta> {
  if (!file.type.startsWith("image/")) throw new Error(`"${file.name}" não é uma imagem.`);
  if (file.size > 25 * 1024 * 1024) throw new Error(`"${file.name}" tem mais de 25 MB.`);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(`Não foi possível abrir "${file.name}". Use JPG, PNG ou WebP (fotos HEIC do iPhone: exporte como JPG).`);
  }
  try {
    const grande = await render(bitmap, LIMITE.lado, LIMITE.maxBytes);
    const mini = await render(bitmap, LIMITE.ladoMini, LIMITE.maxMiniBytes);
    const digest = await crypto.subtle.digest("SHA-256", await grande.arrayBuffer());
    const hash = [...new Uint8Array(digest)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
    return {
      imagem: await base64(grande),
      miniatura: await base64(mini),
      hash,
      bytes: grande.size + mini.size,
      previewUrl: URL.createObjectURL(mini),
    };
  } finally {
    bitmap.close();
  }
}

export const fotoUrl = (f: { id: number; hash: string }, mini = false) => `/api/fotos/${f.id}/${f.hash}${mini ? "-mini" : ""}.webp`;
