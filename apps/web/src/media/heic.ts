import { getFileStem } from "@/media/media-utils";

/**
 * Convert a HEIC/HEIF file into a browser-decodable JPEG `File`, preserving the
 * original base name and modified time. Browsers can't render HEIC in an <img>
 * or on a canvas (outside Safari), so we transcode on import and use the JPEG
 * everywhere downstream (thumbnail, preview, export).
 *
 * The decoder (libheif via `heic-to`) is loaded lazily so its WASM payload
 * never lands in the initial bundle — it's only fetched the first time someone
 * actually imports a HEIC.
 */
export async function convertHeicToJpeg({
	file,
	quality = 0.9,
}: {
	file: File;
	quality?: number;
}): Promise<File> {
	const { heicTo } = await import("heic-to/next");

	const jpegBlob = await heicTo({
		blob: file,
		type: "image/jpeg",
		quality,
	});

	return new File([jpegBlob], `${getFileStem({ name: file.name })}.jpg`, {
		type: "image/jpeg",
		lastModified: file.lastModified,
	});
}
