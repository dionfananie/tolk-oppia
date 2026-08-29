// crypto.ts — AES-GCM encryption/decryption utk simpan API key server-side (Web Crypto).
// KEY_STORE_MASTER = secret (wrangler secret put), raw string → derive 256-bit key via SHA-256.
// Format stored: enc_key (base64 ciphertext) + iv (base64) di tabel api_keys.

const enc = new TextEncoder();

function bytesToBase64(bytes: Uint8Array): string {
	let bin = "";
	for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
	return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
	const bin = atob(b64);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

/**
 * Derive an AES-256-GCM key from the master secret string.
 * We hash the secret with SHA-256 to get a fixed 32-byte key material,
 * so we don't need to store a per-row salt.
 */
async function getKey(master: string): Promise<CryptoKey> {
	const keyMaterial = await crypto.subtle.digest(
		"SHA-256",
		enc.encode(master),
	);
	return crypto.subtle.importKey(
		"raw",
		keyMaterial,
		{ name: "AES-GCM" },
		false,
		["encrypt", "decrypt"],
	);
}

/** Encrypt a plaintext (API key). Returns `{ encKey, iv }` base64 strings. */
export async function encryptKey(
	plaintext: string,
	master: string,
): Promise<{ encKey: string; iv: string }> {
	const key = await getKey(master);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const cipher = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv: iv as BufferSource },
		key,
		enc.encode(plaintext),
	);
	return {
		encKey: bytesToBase64(new Uint8Array(cipher)),
		iv: bytesToBase64(iv),
	};
}

/** Decrypt a ciphertext (API key) previously encrypted with encryptKey. */
export async function decryptKey(
	encKey: string,
	iv: string,
	master: string,
): Promise<string> {
	const key = await getKey(master);
	const plain = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv: base64ToBytes(iv) as BufferSource },
		key,
		base64ToBytes(encKey) as BufferSource,
	);
	return new TextDecoder().decode(plain);
}
