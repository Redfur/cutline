import type { CSSProperties } from "react";
import { iconPaths } from "./icons-data";

export interface IconProps {
	name: keyof typeof iconPaths;
	size?: number;
	strokeWidth?: number;
	color?: string;
	style?: CSSProperties;
	title?: string;
}

export function Icon({
	name,
	size = 16,
	strokeWidth,
	color = "currentColor",
	style,
	title,
}: IconProps) {
	const inner = iconPaths[name];
	const sw = strokeWidth ?? (size <= 14 ? 1.6 : 1.5);
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke={color}
			strokeWidth={sw}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden={title ? undefined : true}
			role={title ? "img" : undefined}
			style={{ display: "block", flex: "none", ...style }}
			// biome-ignore lint/security/noDangerouslySetInnerHtml: разметка идёт из icons-data.ts — локально собранный доверенный источник, не пользовательский ввод
			dangerouslySetInnerHTML={{
				__html: (title ? `<title>${title}</title>` : "") + (inner || ""),
			}}
		/>
	);
}
