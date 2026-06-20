import type { TActionWithOptionalArgs } from "./types";

/**
 * Alt is also regarded as macOS OPTION (⌥) key
 * Ctrl is also regarded as macOS COMMAND (⌘) key (NOTE: this differs from HTML Keyboard spec where COMMAND is Meta key!)
 */
export type ModifierKeys =
	| "ctrl"
	| "alt"
	| "shift"
	| "ctrl+shift"
	| "alt+shift"
	| "ctrl+alt"
	| "ctrl+alt+shift";

const KEYS = [
	"a", "b", "c", "d", "e", "f", "g", "h", "i", "j",
	"k", "l", "m", "n", "o", "p", "q", "r", "s", "t",
	"u", "v", "w", "x", "y", "z",
	"0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
	"up", "down", "left", "right",
	"/", "?", ".",
	"enter", "tab", "space", "escape", "esc",
	"backspace", "delete", "home", "end",
] as const;

export type Key = (typeof KEYS)[number];

const KEY_SET: ReadonlySet<string> = new Set(KEYS);

export function isKey(value: string): value is Key {
	return KEY_SET.has(value);
}

export type ModifierBasedShortcutKey = `${ModifierKeys}+${Key}`;
// Singular keybindings (these will be disabled when an input-ish area has been focused)
export type SingleCharacterShortcutKey = `${Key}`;

export type ShortcutKey = ModifierBasedShortcutKey | SingleCharacterShortcutKey;

const MODIFIER_KEY_SET: ReadonlySet<string> = new Set<ModifierKeys>([
	"ctrl",
	"alt",
	"shift",
	"ctrl+shift",
	"alt+shift",
	"ctrl+alt",
	"ctrl+alt+shift",
]);

/**
 * Runtime guard for `ShortcutKey`. A valid shortcut is either a bare key
 * (e.g. "a", "/", "enter") or a modifier combination followed by a key
 * (e.g. "ctrl+shift+a"). Used when decoding persisted/imported keybindings,
 * which arrive as untrusted strings.
 */
export function isShortcutKey(value: string): value is ShortcutKey {
	const lastPlus = value.lastIndexOf("+");
	// No modifier prefix → must be a bare key. (lastPlus === 0 means the string
	// starts with "+", which is never valid.)
	if (lastPlus <= 0) {
		return isKey(value);
	}
	const modifiers = value.slice(0, lastPlus);
	const key = value.slice(lastPlus + 1);
	return MODIFIER_KEY_SET.has(modifiers) && isKey(key);
}

export type KeybindingConfig = {
	[key in ShortcutKey]?: TActionWithOptionalArgs;
};
