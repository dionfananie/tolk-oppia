// pdf-client.ts — Browser-only PDF text extraction via pdfjs-dist.
// Imported lazily (and only on the client) so the heavy pdf.js code and its
// worker asset never enter the Cloudflare worker bundle.

import { PdfEncryptedError, PdfUnreadableError } from "./document-extract";

// pdf.js needs its worker module at runtime. Load it from a CDN so we don't
// ship the 1.4 MB worker file into the Cloudflare worker bundle; the main
// pdf.js code is still bundled and lazy-loaded by the client.
const WORKER_CDNS = [
	"https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs",
	"https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs",
];

export async function extractPdfText(file: File): Promise<string> {
	const pdfjs = await import("pdfjs-dist");
	const anyPdfjs = pdfjs as { GlobalWorkerOptions?: { workerSrc?: string } };
	if (!anyPdfjs.GlobalWorkerOptions?.workerSrc) {
		anyPdfjs.GlobalWorkerOptions!.workerSrc = WORKER_CDNS[0];
	}

	const buffer = await file.arrayBuffer();
	let doc: import("pdfjs-dist").PDFDocumentProxy | undefined;
	let lastError: unknown = null;
	for (let attempt = 0; attempt < WORKER_CDNS.length; attempt += 1) {
		anyPdfjs.GlobalWorkerOptions!.workerSrc = WORKER_CDNS[attempt];
		try {
			doc = await pdfjs.getDocument({ data: buffer }).promise;
			break;
		} catch (cause) {
			if (cause instanceof Error && cause.name === "PasswordException") {
				throw new PdfEncryptedError();
			}
			lastError = cause;
		}
	}
	if (!doc) {
		throw lastError instanceof Error
			? lastError
			: new Error("Could not load the PDF reader.");
	}

	const pages: string[] = [];
	try {
		for (let i = 1; i <= doc.numPages; i += 1) {
			try {
				const page = await doc.getPage(i);
				const content = await page.getTextContent();
				let lastY: number | null = null;
				let line = "";
				for (const item of content.items) {
					if (!("str" in item)) continue;
					const text = item.str as string;
					const y = "transform" in item ? (item.transform as number[])[5] : null;
					if (lastY !== null && y !== null && Math.abs(y - lastY) > 2 && line) {
						pages.push(line);
						line = "";
					}
					lastY = y ?? lastY;
					line += text;
				}
				if (line) pages.push(line);
			} catch {
				// Skip a broken page rather than failing the whole document.
			}
		}
	} finally {
		await doc.destroy();
	}

	const text = pages.join("\n");
	if (text.replace(/\s+/g, "").length < 40) {
		throw new PdfUnreadableError();
	}
	return text;
}
