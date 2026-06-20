"use client";

import { useSyncExternalStore } from "react";
import { Button } from "./ui/button";
import { useTheme } from "next-themes";
import { cn } from "@/utils/ui";
import { Sun03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

interface ThemeToggleProps {
	className?: string;
	iconClassName?: string;
	onToggle?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

// Hydration-safe client flag: matches the server snapshot (false) during
// hydration, then re-renders to true on the client — without setState in an
// effect. The resolved theme is only known on the client, so theme-dependent
// text must wait for mount to avoid a server/client mismatch.
function subscribe() {
	return () => {
		/* no external store to unsubscribe from */
	};
}

export function ThemeToggle({
	className,
	iconClassName,
	onToggle,
}: ThemeToggleProps) {
	const { resolvedTheme, setTheme } = useTheme();
	const mounted = useSyncExternalStore(
		subscribe,
		() => true,
		() => false,
	);
	const isDark = resolvedTheme === "dark";

	return (
		<Button
			size="icon"
			variant="ghost"
			className={cn("size-8", className)}
			onClick={(e) => {
				setTheme(isDark ? "light" : "dark");
				onToggle?.(e);
			}}
		>
			<HugeiconsIcon
				icon={Sun03Icon}
				className={cn("!size-[1.1rem]", iconClassName)}
			/>
			<span className="sr-only">
				{mounted ? (isDark ? "Light" : "Dark") : "Toggle theme"}
			</span>
		</Button>
	);
}
