// document-extract.ts — Client-side plain-text extraction from uploaded files.
// Runs entirely in the browser: the extracted text is sent (as text) to the
// user's AI provider for personalization and is never stored by TOLK.
//
// Supported: .txt, .md, .pdf (via pdfjs-dist, lazy-loaded), .docx (native ZIP
// + DEFLATE reader — no dependency).

export type ExtractError =
	| "unsupported"
	| "empty"
	| "encrypted"
	| "too-large"
	| "unreadable";

export type ExtractResult =
	| { ok: true; text: string }
	| { ok: false; error: ExtractError };

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_CHARS = 40_000;

const EXT_TO_MIME: Record<string, string> = {
	txt: "text/plain",
	md: "text/markdown",
	pdf: "application/pdf",
	docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export function fileNameFor(file: File): string {
	return file.name || "document";
}

export function fileKindLabel(fileName: string): string {
	const ext = fileName.toLowerCase().split(".").pop() ?? "";
	return (EXT_TO_MIME[ext] ? ext.toUpperCase() : fileName).slice(0, 24);
}

function extOf(fileName: string): string {
	return fileName.toLowerCase().split(".").pop() ?? "";
}

function sliceMax(text: string): string {
	return text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text;
}

function stripMarkdown(md: string): string {
	return md
		.replace(/```[\s\S]*?```/g, " ") // fenced code blocks
		.replace(/`([^`]*)`/g, "$1") // inline code
		.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // images
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links
		.replace(/^#{1,6}\s*/gm, "") // headings
		.replace(/^>\s?/gm, "") // blockquotes
		.replace(/^[\s]*[-*+]\s+/gm, "") // list bullets
		.replace(/^[\s]*\d+[.)]\s+/gm, "") // numbered lists
		.replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, "$1") // emphasis
		.replace(/\|/g, " ") // tables
		.replace(/[ \t]{2,}/g, " ")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

function readAsText(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result ?? ""));
		reader.onerror = () => reject(reader.error ?? new Error("read failed"));
		reader.readAsText(file, "utf-8");
	});
}

// ── PDF via pdfjs-dist (lazy, browser-only) ───────────────────────────────
// The actual pdf.js code lives in pdf-client.ts and is loaded only from the
// client, so the Cloudflare worker bundle never includes pdf.js or its worker.
async function extractPdf(file: File): Promise<string> {
	if (import.meta.env.SSR) {
		throw new Error("PDF reading is only available in the browser.");
	}
	const { extractPdfText } = await import("./pdf-client");
	return extractPdfText(file);
}

export class PdfEncryptedError extends Error {}
export class PdfUnreadableError extends Error {}

// ── DOCX: minimal ZIP reader (central directory) + DEFLATE for document.xml ─
function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
	return new Promise((resolve, reject) => {
		const copy = new Uint8Array(bytes);
		const stream = new Blob([copy.buffer]).stream().pipeThrough(
			new DecompressionStream("deflate-raw"),
		);
		new Response(stream)
			.arrayBuffer()
			.then((buffer) => resolve(new Uint8Array(buffer)))
			.catch((error) => reject(error));
	});
}

function u16(view: DataView, offset: number): number {
	return view.getUint16(offset, true);
}

function u32(view: DataView, offset: number): number {
	return view.getUint32(offset, true);
}

const ZIP_EOCD = 0x06054b50;
const ZIP_CENTRAL = 0x02014b50;
const ZIP_LOCAL = 0x04034b50;
const DOCX_TARGET = "word/document.xml";

async function extractDocx(file: File): Promise<string> {
	if (typeof DecompressionStream === "undefined") {
		throw new Error(
			"DOCX reading is not supported in this browser. Save the file as .txt or .md instead.",
		);
	}
	const buffer = await file.arrayBuffer();
	const bytes = new Uint8Array(buffer);
	const view = new DataView(buffer);
	const decoder = new TextDecoder("utf-8");

	// Locate the end-of-central-directory record (searched from the end).
	let eocd = -1;
	const tailStart = Math.max(0, bytes.length - 65_557);
	for (let i = bytes.length - 22; i >= tailStart; i -= 1) {
		if (u32(view, i) === ZIP_EOCD) {
			eocd = i;
			break;
		}
	}
	if (eocd === -1) throw new Error("This file is not a valid DOCX archive.");
	const centralOffset = u32(view, eocd + 16);
	const centralCount = u16(view, eocd + 10);

	// Walk the central directory to find word/document.xml.
	let dataOffset = -1;
	let compressedSize = 0;
	let method = 0;
	let entry = centralOffset;
	for (let i = 0; i < centralCount; i += 1) {
		if (u32(view, entry) !== ZIP_CENTRAL) break;
		const comp = u16(view, entry + 10);
		const compSize = u32(view, entry + 20);
		const nameLen = u16(view, entry + 28);
		const extraLen = u16(view, entry + 30);
		const commentLen = u16(view, entry + 32);
		const localOffset = u32(view, entry + 42);
		const name = decoder.decode(bytes.subarray(entry + 46, entry + 46 + nameLen));
		if (name === DOCX_TARGET) {
			method = comp;
			compressedSize = compSize;
			// Local header offset + 30 header bytes + name + extra = data start.
			if (u32(view, localOffset) !== ZIP_LOCAL) {
				throw new Error("This DOCX archive is malformed.");
			}
			const localNameLen = u16(view, localOffset + 26);
			const localExtraLen = u16(view, localOffset + 28);
			dataOffset = localOffset + 30 + localNameLen + localExtraLen;
			break;
		}
		entry += 46 + nameLen + extraLen + commentLen;
	}

	if (dataOffset === -1) {
		throw new Error("This DOCX has no readable document body.");
	}
	const raw = bytes.subarray(dataOffset, dataOffset + compressedSize);
	const xmlBytes = method === 8 ? await inflateRaw(raw) : raw;
	const xml = decoder.decode(xmlBytes);
	const dom = new DOMParser().parseFromString(xml, "application/xml");
	if (dom.getElementsByTagName("parsererror").length > 0) {
		throw new Error("This DOCX document body is not readable.");
	}

	const ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
	const paragraphs = dom.getElementsByTagNameNS(ns, "p");
	const lines: string[] = [];
	for (const para of Array.from(paragraphs)) {
		let text = "";
		const runs = para.getElementsByTagNameNS(ns, "t");
		for (const run of Array.from(runs)) {
			text += run.textContent ?? "";
		}
		if (text.trim()) lines.push(text);
	}
	const result = lines.join("\n");
	if (result.replace(/\s+/g, "").length < 20) {
		throw new Error("No text found in this DOCX. It may contain only images.");
	}
	return result;
}

export async function extractDocumentText(file: File): Promise<ExtractResult> {
	if (file.size > MAX_BYTES) {
		return { ok: false, error: "too-large" };
	}
	const ext = extOf(file.name);
	try {
		let text: string;
		if (ext === "txt" || ext === "text" || file.type === "text/plain") {
			text = stripMarkdown(await readAsText(file));
		} else if (ext === "md" || ext === "markdown" || file.type === "text/markdown") {
			text = stripMarkdown(await readAsText(file));
		} else if (ext === "pdf" || file.type === "application/pdf") {
			text = await extractPdf(file);
		} else if (
			ext === "docx" ||
			file.type ===
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document"
		) {
			text = await extractDocx(file);
		} else {
			return { ok: false, error: "unsupported" };
		}
		if (!text.trim()) return { ok: false, error: "empty" };
		return { ok: true, text: sliceMax(text) };
	} catch (cause) {
		if (cause instanceof PdfEncryptedError) return { ok: false, error: "encrypted" };
		return { ok: false, error: "unreadable" };
	}
}

export const SUPPORTED_FILE_HINT = "PDF, Word (.docx), .txt, or Markdown (.md) · up to 5 MB";
