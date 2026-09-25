import type { CSSProperties } from "react";
import { Icon, type IconProps } from "../core/Icon";

export interface SaveIndicatorProps {
	status?: "saved" | "saving" | "unsaved" | "error";
	/** Override text, e.g. "Сохранено в 14:32" */
	label?: string;
	style?: CSSProperties;
}

const S: Record<
	NonNullable<SaveIndicatorProps["status"]>,
	[IconProps["name"] | null, string, string]
> = {
	saved: ["check", "var(--fg-3)", "Сохранено"],
	saving: ["loader-circle", "var(--fg-3)", "Сохранение…"],
	unsaved: [null, "var(--fg-3)", "Есть изменения"],
	error: ["circle-alert", "var(--fg-danger)", "Не сохранено"],
};

export function SaveIndicator({
	status = "saved",
	label,
	style,
}: SaveIndicatorProps) {
	const [ic, c, t] = S[status] || S.saved;
	return (
		<span
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: 4,
				color: c,
				font: "var(--type-label)",
				whiteSpace: "nowrap",
				...style,
			}}
		>
			{ic ? (
				<Icon
					name={ic}
					size={12}
					strokeWidth={2}
					style={
						status === "saving"
							? { animation: "cutline-spin 1s linear infinite" }
							: undefined
					}
				/>
			) : (
				<span
					style={{
						width: 6,
						height: 6,
						borderRadius: 3,
						background: "var(--amber-500)",
					}}
				/>
			)}
			{label ?? t}
			{status === "saving" && (
				<style>{"@keyframes cutline-spin{to{transform:rotate(360deg)}}"}</style>
			)}
		</span>
	);
}
