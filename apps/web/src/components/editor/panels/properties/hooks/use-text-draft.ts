import { useEffect, useRef, useState } from "react";

/**
 * Keeps a local draft for free-text inputs (text content, font family) so
 * keystrokes render instantly instead of round-tripping through global editor
 * state + a full canvas re-render on every character. The expensive `onPreview`
 * (which repaints the canvas) is debounced while typing and flushed on blur.
 *
 * Without this, controlled inputs bound directly to editor state feel laggy:
 * the typed character only appears after the canvas finishes re-rendering.
 */
export function useTextDraft({
	value,
	onPreview,
	onCommit,
	onCommitValue,
	debounceMs = 80,
}: {
	value: string;
	onPreview: (value: string) => void;
	onCommit: () => void;
	/** Runs once on blur with the final value (e.g. to load a chosen font). */
	onCommitValue?: (value: string) => void;
	debounceMs?: number;
}) {
	const [isEditing, setIsEditing] = useState(false);
	const [draft, setDraft] = useState(value);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const latestRef = useRef(value);

	const clearTimer = () => {
		if (timerRef.current !== null) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	};

	useEffect(() => clearTimer, []);

	return {
		value: isEditing ? draft : value,
		onFocus: () => {
			setIsEditing(true);
			setDraft(value);
			latestRef.current = value;
		},
		onChange: (next: string) => {
			setDraft(next);
			latestRef.current = next;
			clearTimer();
			timerRef.current = setTimeout(() => {
				timerRef.current = null;
				onPreview(latestRef.current);
			}, debounceMs);
		},
		onBlur: () => {
			clearTimer();
			onPreview(latestRef.current);
			onCommit();
			onCommitValue?.(latestRef.current);
			setIsEditing(false);
		},
	};
}
