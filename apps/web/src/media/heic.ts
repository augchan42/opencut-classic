import { getFileStem } from "@/media/media-utils";
import type { HeicWorkerResponse } from "@/media/heic.worker";

/**
 * Convert a HEIC/HEIF file into a browser-decodable JPEG `File`, preserving the
 * original base name and modified time. Browsers can't render HEIC in an <img>
 * or on a canvas (outside Safari), so we transcode on import and use the JPEG
 * everywhere downstream (thumbnail, preview, export).
 *
 * The decode runs in a dedicated Web Worker so the (effectively single-threaded
 * — the page isn't cross-origin isolated) HEVC decode + JPEG encode never block
 * the editor's main thread. The decoder's WASM is loaded lazily inside the
 * worker, so it's only fetched the first time someone imports a HEIC. If the
 * worker can't be created (older browser, bundling issue), we fall back to
 * decoding on the main thread.
 */

let worker: Worker | null = null;
let nextRequestId = 0;
const pending = new Map<
	number,
	{ resolve: (blob: Blob) => void; reject: (error: Error) => void }
>();

function supportsWorkerDecode(): boolean {
	return (
		typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined"
	);
}

function getWorker(): Worker {
	if (worker) return worker;

	worker = new Worker(new URL("./heic.worker.ts", import.meta.url), {
		type: "module",
	});

	worker.onmessage = (event: MessageEvent<HeicWorkerResponse>) => {
		const response = event.data;
		const entry = pending.get(response.id);
		if (!entry) return;
		pending.delete(response.id);
		if ("blob" in response) {
			entry.resolve(response.blob);
		} else {
			entry.reject(new Error(response.error));
		}
	};

	worker.onerror = (event) => {
		// The worker crashed (e.g. a bundling problem). Fail everything in flight
		// and drop it so the next call recreates it — or falls back to the main
		// thread if creation keeps failing.
		const error = new Error(event.message || "HEIC worker crashed");
		for (const entry of pending.values()) entry.reject(error);
		pending.clear();
		worker?.terminate();
		worker = null;
	};

	return worker;
}

function decodeInWorker({
	file,
	quality,
}: {
	file: File;
	quality: number;
}): Promise<Blob> {
	return new Promise<Blob>((resolve, reject) => {
		const id = nextRequestId++;
		pending.set(id, { resolve, reject });
		try {
			getWorker().postMessage({ id, blob: file, quality });
		} catch (error) {
			// Creating the worker or posting failed synchronously — drop the entry
			// so it doesn't leak, and reject so the caller can fall back.
			pending.delete(id);
			reject(
				error instanceof Error
					? error
					: new Error("Failed to start HEIC worker"),
			);
		}
	});
}

async function decodeOnMainThread({
	file,
	quality,
}: {
	file: File;
	quality: number;
}): Promise<Blob> {
	const { heicTo } = await import("heic-to/next");
	return heicTo({ blob: file, type: "image/jpeg", quality });
}

export async function convertHeicToJpeg({
	file,
	quality = 0.9,
}: {
	file: File;
	quality?: number;
}): Promise<File> {
	let jpegBlob: Blob;
	if (supportsWorkerDecode()) {
		try {
			jpegBlob = await decodeInWorker({ file, quality });
		} catch {
			// Worker path unavailable/failed — fall back to the main thread so the
			// import still succeeds (it just won't be off-thread).
			jpegBlob = await decodeOnMainThread({ file, quality });
		}
	} else {
		jpegBlob = await decodeOnMainThread({ file, quality });
	}

	return new File([jpegBlob], `${getFileStem({ name: file.name })}.jpg`, {
		type: "image/jpeg",
		lastModified: file.lastModified,
	});
}
