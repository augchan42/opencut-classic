import { useState, useMemo, useCallback, useEffect } from "react";
import {
	getCachedFontAtlas,
	loadFontAtlas,
	clearFontAtlasCache,
} from "@/fonts/google-fonts";
import type { FontAtlas } from "@/fonts/types";
import { SYSTEM_FONTS } from "@/fonts/system-fonts";
import { FONT_ALIAS_NAMES } from "@/fonts/font-aliases";

type Status = "idle" | "loading" | "error";

export function useFontAtlas({ open }: { open: boolean }) {
	const [atlas, setAtlas] = useState<FontAtlas | null>(() =>
		getCachedFontAtlas(),
	);
	const [hasError, setHasError] = useState(false);

	// Status is derived rather than stored, so the effect never sets state
	// synchronously (all setState happens in the async load callbacks).
	const status: Status = atlas ? "idle" : hasError ? "error" : "loading";

	const runLoad = useCallback(() => {
		loadFontAtlas().then((data) => {
			if (data) {
				setAtlas(data);
				setHasError(false);
			} else {
				setHasError(true);
			}
		});
	}, []);

	useEffect(() => {
		if (!open || atlas) return;
		runLoad();
	}, [open, atlas, runLoad]);

	const retry = useCallback(() => {
		clearFontAtlasCache();
		setHasError(false);
		runLoad();
	}, [runLoad]);

	const fontNames = useMemo(() => {
		if (!atlas) return [];
		return [
			...Object.keys(atlas.fonts),
			...SYSTEM_FONTS,
			...FONT_ALIAS_NAMES,
		].sort();
	}, [atlas]);

	return { atlas, status, fontNames, retry };
}
