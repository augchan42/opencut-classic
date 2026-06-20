export interface FontAlias {
	/** Name shown in the picker and stored on the element. */
	family: string;
	/** Real, loadable font family that is actually downloaded and rendered. */
	resolvesTo: string;
	/** Short note shown in the UI to make the substitution clear. */
	note: string;
}

/**
 * Aliases surface a recognizable name for a face we can't ship the real files
 * for (e.g. a licensed typeface) and transparently substitute the closest
 * available match. The alias name is stored on the element, but every font
 * load and canvas render resolves it to `resolvesTo`, so we paint with the
 * real, available glyphs while keeping the recognizable label in the UI.
 */
export const FONT_ALIASES: FontAlias[] = [
	{
		family: "Cardone",
		resolvesTo: "Playfair Display",
		note: "Playfair Display substitute — not the licensed Cardone",
	},
];

const aliasByFamily = new Map(
	FONT_ALIASES.map((alias) => [alias.family, alias]),
);

export const FONT_ALIAS_NAMES = FONT_ALIASES.map((alias) => alias.family);

export function getFontAlias(family: string): FontAlias | undefined {
	return aliasByFamily.get(family);
}

export function isFontAlias(family: string): boolean {
	return aliasByFamily.has(family);
}

/** Resolve an alias to its real font family; pass-through for everything else. */
export function resolveFontFamily(family: string): string {
	return aliasByFamily.get(family)?.resolvesTo ?? family;
}
