import type { MediaAsset, MediaType } from "@/media/types";

export const SUPPORTS_AUDIO: readonly MediaType[] = ["audio", "video"];

export function mediaSupportsAudio({
	media,
}: {
	media: MediaAsset | null | undefined;
}): boolean {
	if (!media) return false;
	return SUPPORTS_AUDIO.includes(media.type);
}

// Extension → media type fallback for files that arrive with an empty or
// non-standard MIME type (common for HEIC and for .mov exported straight from
// Photos, where the OS sometimes reports no type at all).
const EXTENSION_MEDIA_TYPE: Readonly<Record<string, MediaType>> = {
	heic: "image",
	heif: "image",
	jpg: "image",
	jpeg: "image",
	png: "image",
	gif: "image",
	webp: "image",
	avif: "image",
	bmp: "image",
	mov: "video",
	mp4: "video",
	m4v: "video",
	webm: "video",
	mkv: "video",
	avi: "video",
	mp3: "audio",
	wav: "audio",
	m4a: "audio",
	aac: "audio",
	ogg: "audio",
	flac: "audio",
};

export function getFileExtension({ name }: { name: string }): string {
	const dot = name.lastIndexOf(".");
	return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

/** File name without its extension, e.g. "IMG_6453.HEIC" → "IMG_6453". */
export function getFileStem({ name }: { name: string }): string {
	const dot = name.lastIndexOf(".");
	return dot === -1 ? name : name.slice(0, dot);
}

// A MIME type we shouldn't trust over the file extension: empty, or the generic
// "binary blob" type the OS hands out for HEIC/MOV downloaded or dragged from
// some sources.
function isGenericMimeType(type: string): boolean {
	return type === "" || type === "application/octet-stream";
}

/**
 * Detect HEIC/HEIF stills. Browsers can't decode these in an <img>, so callers
 * must convert them to a web-friendly format before use (see media/heic.ts).
 * The extension is authoritative when the MIME type is missing or generic.
 */
export function isHeicFile({ file }: { file: File }): boolean {
	const type = file.type.toLowerCase();
	if (type === "image/heic" || type === "image/heif") return true;
	const ext = getFileExtension({ name: file.name });
	return (ext === "heic" || ext === "heif") && isGenericMimeType(type);
}

export function isQuickTimeFile({ file }: { file: File }): boolean {
	const type = file.type.toLowerCase();
	if (type === "video/quicktime") return true;
	return getFileExtension({ name: file.name }) === "mov" && isGenericMimeType(type);
}

export const getMediaTypeFromFile = ({
	file,
}: {
	file: File;
}): MediaType | null => {
	const { type } = file;

	if (type.startsWith("image/")) {
		return "image";
	}
	if (type.startsWith("video/")) {
		return "video";
	}
	if (type.startsWith("audio/")) {
		return "audio";
	}

	// Empty / unknown MIME — fall back to the file extension.
	return EXTENSION_MEDIA_TYPE[getFileExtension({ name: file.name })] ?? null;
};
