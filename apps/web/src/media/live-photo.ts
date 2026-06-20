import {
	getFileStem,
	isHeicFile,
	isQuickTimeFile,
} from "@/media/media-utils";

export interface LivePhotoPairing {
	/** Lowercased base names that have both a HEIC still and a .MOV motion clip. */
	pairedStems: Set<string>;
	/** The .MOV files that are the motion half of a Live Photo. */
	motionFiles: Set<File>;
}

/**
 * Detect Apple Live Photo pairs in a dropped/selected file batch.
 *
 * Apple never embeds the motion video inside the HEIC — a Live Photo is a HEIC
 * still plus a *separate* .MOV, linked by a content-identifier in metadata and,
 * for files exported together, a shared base name (IMG_6453.HEIC + IMG_6453.MOV).
 * We pair on base name here: it's reliable for Photos exports and avoids parsing
 * the HEIC's Apple maker note in the browser. (Content-id matching can harden
 * this later if renamed files become a problem.)
 *
 * A lone HEIC (no companion .MOV in the batch) simply isn't a pair — its motion
 * was dropped on export and is unrecoverable, so it imports as a still.
 */
export function detectLivePhotoPairs({
	files,
}: {
	files: File[];
}): LivePhotoPairing {
	const stillStems = new Set<string>();
	for (const file of files) {
		if (isHeicFile({ file })) {
			stillStems.add(getFileStem({ name: file.name }).toLowerCase());
		}
	}

	const pairedStems = new Set<string>();
	const motionFiles = new Set<File>();
	for (const file of files) {
		if (!isQuickTimeFile({ file })) continue;
		const stem = getFileStem({ name: file.name }).toLowerCase();
		if (stillStems.has(stem)) {
			pairedStems.add(stem);
			motionFiles.add(file);
		}
	}

	return { pairedStems, motionFiles };
}
