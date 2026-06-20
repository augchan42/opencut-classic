import { heicTo } from "heic-to/next";

export type HeicWorkerMessage = {
	id: number;
	blob: Blob;
	quality: number;
};

export type HeicWorkerResponse =
	| { id: number; blob: Blob }
	| { id: number; error: string };

// Decoding HEVC + rendering to a JPEG runs single-threaded unless the page is
// cross-origin isolated (it isn't), so doing it here keeps that work off the
// main thread and the editor responsive during import.
self.onmessage = async (event: MessageEvent<HeicWorkerMessage>) => {
	const { id, blob, quality } = event.data;
	try {
		const jpeg = await heicTo({ blob, type: "image/jpeg", quality });
		self.postMessage({ id, blob: jpeg } satisfies HeicWorkerResponse);
	} catch (error) {
		self.postMessage({
			id,
			error: error instanceof Error ? error.message : "HEIC decode failed",
		} satisfies HeicWorkerResponse);
	}
};
