/**
 * Share codec: encode a {@link SymbiotDocument} into a URL-hash-safe string
 * (compact path) or an AES-256-GCM encrypted envelope (private path).
 *
 * Built on web-platform primitives — `CompressionStream` and `crypto.subtle` —
 * so the codec runs unchanged in browsers, Bun, and Node 22+. Use
 * {@link isShareSupported} to gate UI affordances at runtime.
 *
 * The compact path is JSON → deflate-raw → base64url. Deflate-raw is preferred
 * over gzip because it has no header/footer overhead, keeping the shareable URL
 * fragment short. The encrypted path wraps the compressed bytes in AES-GCM with
 * a per-share random 12-byte IV; the 32-byte key is intended to live in the
 * URL fragment so it never crosses the wire to a server.
 *
 * @example Compact share round-trip
 * ```ts
 * const hash = await serialize(doc);
 * const back = await deserialize(hash);
 * ```
 *
 * @example Encrypted share round-trip
 * ```ts
 * const key = crypto.getRandomValues(new Uint8Array(32));
 * const envelope = await encrypt(doc, key);
 * const back = await decrypt(envelope, key);
 * ```
 */

import type { AnnotationTuple, GlobalCommentEntry, PlateValue } from "./types.ts";

/**
 * Aggregate document carried by the share codec. Bundles the source markdown,
 * the live Plate value, the compact annotation tuples (already in wire form),
 * reviewer-attached global comments, and the plan-meta tuple the viewer top
 * bar reads. `annotations` is the {@link AnnotationTuple}[] output of
 * `encodeAnnotations` — the share codec does not re-encode it, so the tuple
 * wire format stays the single source of truth.
 */
export interface SymbiotDocument {
  /** Source markdown the editor was initialized with. */
  markdown: string;
  /** Live Plate editor value (post-deserialization, including authoring marks). */
  value: PlateValue;
  /** Compact tuple-form annotations — already on-wire; not re-encoded by the codec. */
  annotations: AnnotationTuple[];
  /** Reviewer-attached document-level comments. */
  globalComments: GlobalCommentEntry[];
  /** Plan-identifier tuple the viewer top bar consumes. */
  meta: SymbiotDocumentMeta;
}

/** Plan-meta fields embedded in a {@link SymbiotDocument}. */
export interface SymbiotDocumentMeta {
  /** Project slug derived from the cwd basename. */
  project: string;
  /** Plan slug derived from the first H1. */
  slug: string;
  /** Plan version (1-based). */
  version: number;
  /** Human-readable label rendered in the viewer top bar. */
  displayName: string;
}

/**
 * Output of {@link encrypt}. Both fields are base64url. AES-GCM appends the
 * 16-byte authentication tag to the ciphertext per WebCrypto spec, so callers
 * do not need a separate tag field.
 */
export interface EncryptedShare {
  /** Base64url of compressed bytes encrypted with AES-256-GCM (tag appended). */
  ciphertext: string;
  /** Base64url of the random 12-byte initialization vector. */
  iv: string;
}

const deflateRawFormat = "deflate-raw";
const aesGcmAlgo = "AES-GCM";
const aesKeyBytes = 32;
const aesIvBytes = 12;
const base64UrlChunkSize = 0x8000;

/**
 * Encode a document into a URL-hash-safe string via JSON → deflate-raw → base64url.
 */
export const serialize = async (doc: SymbiotDocument): Promise<string> => {
  const compressed = await compress(new TextEncoder().encode(JSON.stringify(doc)));
  return toBase64Url(compressed);
};

/**
 * Decode a URL-hash string back into a document. Throws on malformed base64url,
 * decompression failure, JSON parse failure, or schema mismatch — each surface
 * carries a descriptive `Error.message`.
 */
export const deserialize = async (hash: string): Promise<SymbiotDocument> => {
  const bytes = await decompress(fromBase64Url(hash));
  return validateSymbiotDocument(parseJson(new TextDecoder().decode(bytes)));
};

/**
 * Encrypt a document with AES-256-GCM. `key` must be a 32-byte buffer; the
 * caller owns its lifetime (WebCrypto provides no zeroize). Encrypts the
 * compressed bytes (not raw JSON) so encrypted payloads stay short enough to
 * fit alongside the key in a URL fragment for small documents.
 */
export const encrypt = async (doc: SymbiotDocument, key: Uint8Array): Promise<EncryptedShare> => {
  assertKey(key);
  const compressed = await compress(new TextEncoder().encode(JSON.stringify(doc)));
  const iv = crypto.getRandomValues(new Uint8Array(aesIvBytes));
  const cryptoKey = await importAesKey(key, "encrypt");
  const cipher = await crypto.subtle.encrypt(
    { name: aesGcmAlgo, iv },
    cryptoKey,
    toBuffer(compressed)
  );
  return { ciphertext: toBase64Url(new Uint8Array(cipher)), iv: toBase64Url(iv) };
};

/**
 * Decrypt an {@link EncryptedShare} back into a document. Throws on auth-tag
 * mismatch (wrong key or tampered ciphertext), malformed base64url, or schema
 * mismatch.
 */
export const decrypt = async (
  payload: EncryptedShare,
  key: Uint8Array
): Promise<SymbiotDocument> => {
  assertKey(key);
  const iv = toBuffer(fromBase64Url(payload.iv));
  const cipher = toBuffer(fromBase64Url(payload.ciphertext));
  const cryptoKey = await importAesKey(key, "decrypt");
  const compressed = await crypto.subtle.decrypt({ name: aesGcmAlgo, iv }, cryptoKey, cipher);
  const bytes = await decompress(new Uint8Array(compressed));
  return validateSymbiotDocument(parseJson(new TextDecoder().decode(bytes)));
};

/**
 * Feature-detect runtime support. Returns `true` only when every primitive the
 * codec needs is present — both compression directions, WebCrypto subtle, and
 * `getRandomValues`. Some sandboxed runtimes expose a subset; the codec
 * requires the full set.
 */
export const isShareSupported = (): boolean => hasCompressionStreams() && hasWebCrypto();

const hasCompressionStreams = (): boolean =>
  typeof CompressionStream === "function" && typeof DecompressionStream === "function";

const hasWebCrypto = (): boolean =>
  typeof globalThis.crypto?.subtle !== "undefined" &&
  typeof globalThis.crypto?.getRandomValues === "function";

const assertKey = (key: Uint8Array): void => {
  if (key.byteLength !== aesKeyBytes) {
    throw new Error(`Share key must be ${aesKeyBytes} bytes; got ${key.byteLength}`);
  }
};

const importAesKey = (key: Uint8Array, usage: "encrypt" | "decrypt"): Promise<CryptoKey> =>
  crypto.subtle.importKey("raw", toBuffer(key), { name: aesGcmAlgo }, false, [usage]);

const toBuffer = (u: Uint8Array): Uint8Array<ArrayBuffer> => {
  const ab = new ArrayBuffer(u.byteLength);
  const out = new Uint8Array(ab);
  out.set(u);
  return out;
};

const compress = (input: Uint8Array): Promise<Uint8Array> =>
  pipeBytes(input, new CompressionStream(deflateRawFormat));

const decompress = (input: Uint8Array): Promise<Uint8Array> =>
  pipeBytes(input, new DecompressionStream(deflateRawFormat));

const pipeBytes = async (
  input: Uint8Array,
  transform: CompressionStream | DecompressionStream
): Promise<Uint8Array> => {
  const stream = new Response(toBuffer(input)).body?.pipeThrough(transform);
  if (stream === undefined) throw new Error("share: web stream pipeline unavailable");
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

const toBase64Url = (bytes: Uint8Array): string => {
  let bin = "";
  for (let i = 0; i < bytes.length; i += base64UrlChunkSize) {
    bin += chunkToBinaryString(bytes.subarray(i, i + base64UrlChunkSize));
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const chunkToBinaryString = (chunk: Uint8Array): string =>
  String.fromCharCode.apply(null, Array.from(chunk));

const fromBase64Url = (s: string): Uint8Array => {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) {
    throw new Error("Share payload is not valid base64url");
  }
  const padded = padBase64(s.replace(/-/g, "+").replace(/_/g, "/"));
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const padBase64 = (s: string): string => {
  const remainder = s.length % 4;
  if (remainder === 0) return s;
  return s.padEnd(s.length + (4 - remainder), "=");
};

const parseJson = (s: string): unknown => {
  try {
    return JSON.parse(s);
  } catch (cause) {
    throw new Error("Share payload contains invalid JSON", { cause });
  }
};

const validateSymbiotDocument = (v: unknown): SymbiotDocument => {
  assertObject(v, "document");
  validateTopLevelFields(v);
  validateMeta(v["meta"]);
  validateAnnotationTuples(v["annotations"] as unknown[]);
  validateGlobalCommentList(v["globalComments"] as unknown[]);
  return v as unknown as SymbiotDocument;
};

const validateTopLevelFields = (v: Record<string, unknown>): void => {
  assertString(v, "markdown");
  assertArray(v, "value");
  assertArray(v, "annotations");
  assertArray(v, "globalComments");
};

const validateMeta = (m: unknown): void => {
  assertObject(m, "meta");
  assertString(m, "project");
  assertString(m, "slug");
  assertString(m, "displayName");
  if (typeof m["version"] !== "number") {
    throw new Error("share: meta.version must be number");
  }
};

const tupleArity: Record<string, [number, number]> = {
  C: [3, 5],
  G: [2, 4],
  D: [2, 4],
  I: [3, 5],
  R: [3, 5],
  T: [3, 4],
};

const validateAnnotationTuples = (arr: unknown[]): void => {
  for (const t of arr) validateAnnotationTuple(t);
};

const validateAnnotationTuple = (t: unknown): void => {
  const arr = ensureArrayTuple(t);
  const [discriminator] = arr;
  const arity = lookupTupleArity(discriminator);
  ensureTupleArity(arr, arity, discriminator as string);
  validateTuplePayload(arr, discriminator as string, arity[0]);
};

const ensureArrayTuple = (t: unknown): unknown[] => {
  if (!Array.isArray(t)) throw new Error("share: annotation tuple must be array");
  return t;
};

const lookupTupleArity = (d: unknown): [number, number] => {
  if (typeof d !== "string") {
    throw new Error("share: annotation tuple discriminator must be string");
  }
  const arity = tupleArity[d];
  if (arity === undefined) {
    throw new Error(`share: unknown annotation discriminator "${d}"`);
  }
  return arity;
};

const ensureTupleArity = (t: unknown[], arity: [number, number], d: string): void => {
  const [min, max] = arity;
  if (t.length < min || t.length > max) {
    throw new Error(`share: tuple ${d} has invalid arity ${t.length}`);
  }
};

const validateTuplePayload = (t: unknown[], d: string, min: number): void => {
  validateRequiredStrings(t, d, min);
  validateOptionalAuthor(t, d, min);
  validateOptionalImages(t, d, min);
};

const validateRequiredStrings = (t: unknown[], d: string, min: number): void => {
  for (let i = 1; i < min; i++) {
    if (typeof t[i] !== "string") {
      throw new Error(`share: ${d}[${i}] must be string`);
    }
  }
};

const validateOptionalAuthor = (t: unknown[], d: string, min: number): void => {
  if (t.length < min + 1) return;
  if (typeof t[min] !== "string") {
    throw new Error(`share: ${d} author field must be string`);
  }
};

const validateOptionalImages = (t: unknown[], d: string, min: number): void => {
  if (t.length !== min + 2) return;
  validateImages(t[min + 1], d);
};

const validateImages = (v: unknown, d: string): void => {
  if (!Array.isArray(v)) throw new Error(`share: ${d} images field must be array`);
  for (const img of v) {
    if (typeof img !== "string") {
      throw new Error(`share: ${d} image entry must be string`);
    }
  }
};

const validateGlobalCommentList = (arr: unknown[]): void => {
  for (const g of arr) validateGlobalCommentShape(g);
};

const validateGlobalCommentShape = (g: unknown): void => {
  assertObject(g, "globalComment");
  assertString(g, "id");
  assertString(g, "body");
  if (g["author"] !== undefined && typeof g["author"] !== "string") {
    throw new Error("share: globalComment.author must be string when present");
  }
  if (g["images"] !== undefined) validateImages(g["images"], "globalComment");
};

function assertObject(v: unknown, label: string): asserts v is Record<string, unknown> {
  if (v === null || typeof v !== "object" || Array.isArray(v)) {
    throw new Error(`share: ${label} must be object`);
  }
}

const assertString = (o: Record<string, unknown>, k: string): void => {
  if (typeof o[k] !== "string") throw new Error(`share: ${k} must be string`);
};

const assertArray = (o: Record<string, unknown>, k: string): void => {
  if (!Array.isArray(o[k])) throw new Error(`share: ${k} must be array`);
};
