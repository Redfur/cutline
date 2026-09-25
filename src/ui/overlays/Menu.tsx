import {
	type CSSProperties,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";
import { Icon, type IconProps } from "../core/Icon";

export interface MenuItem {
	label?: string;
	icon?: IconProps["name"];
	shortcut?: string;
	/** Right-aligned secondary text, e.g. sample value */
	hint?: string;
	checked?: boolean;
	danger?: boolean;
	disabled?: boolean;
	mono?: boolean;
	separator?: boolean;
	/** Renders a small section heading instead of an item */
	section?: string;
	onSelect?: () => void;
}

export interface MenuProps {
	/** Clickable element that toggles the menu. Omit to render the list statically. */
	trigger?: ReactNode;
	items: MenuItem[];
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	align?: "left" | "right";
	width?: number;
	style?: CSSProperties;
}

function Item({
	it,
	onPick,
}: {
	it: MenuItem;
	onPick: (it: MenuItem) => void;
}) {
	const [h, setH] = useState(false);
	if (it.separator) {
		return (
			<div
				style={{ height: 1, background: "var(--border-1)", margin: "4px 0" }}
			/>
		);
	}
	if (it.section) {
		return (
			<div
				style={{
					padding: "6px 10px 2px",
					font: "var(--type-section)",
					color: "var(--fg-3)",
				}}
			>
				{it.section}
			</div>
		);
	}
	return (
		<button
			type="button"
			disabled={it.disabled}
			onMouseEnter={() => setH(true)}
			onMouseLeave={() => setH(false)}
			onClick={() => {
				it.onSelect?.();
				onPick(it);
			}}
			style={{
				display: "flex",
				alignItems: "center",
				gap: 8,
				width: "100%",
				height: 26,
				padding: "0 10px",
				border: 0,
				borderRadius: "var(--radius-1)",
				background: h && !it.disabled ? "var(--bg-hover)" : "transparent",
				color: it.disabled
					? "var(--fg-disabled)"
					: it.danger
						? "var(--fg-danger)"
						: "var(--fg-1)",
				font: it.mono ? "var(--type-mono)" : "var(--type-body)",
				textAlign: "left",
				cursor: it.disabled ? "default" : "pointer",
			}}
		>
			<span style={{ width: 16, color: it.danger ? "inherit" : "var(--fg-2)" }}>
				{it.icon && <Icon name={it.icon} size={14} />}
				{it.checked && <Icon name="check" size={14} />}
			</span>
			<span style={{ flex: 1, whiteSpace: "nowrap" }}>{it.label}</span>
			{it.hint && (
				<span style={{ font: "var(--type-label)", color: "var(--fg-3)" }}>
					{it.hint}
				</span>
			)}
			{it.shortcut && (
				<span style={{ font: "var(--type-mono)", color: "var(--fg-3)" }}>
					{it.shortcut}
				</span>
			)}
		</button>
	);
}

export function Menu({
	trigger,
	items = [],
	open,
	onOpenChange,
	align = "left",
	width = 200,
	style,
}: MenuProps) {
	const [o, setO] = useState(false);
	const isOpen = open ?? o;
	const ref = useRef<HTMLSpanElement>(null);
	const set = (v: boolean) => {
		setO(v);
		onOpenChange?.(v);
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: set пересоздаётся на каждый рендер — добавить её в зависимости значит пересоздавать подписку без надобности
	useEffect(() => {
		if (!isOpen) return;
		const f = (e: MouseEvent) => {
			if (
				ref.current &&
				e.target instanceof Node &&
				!ref.current.contains(e.target)
			)
				set(false);
		};
		document.addEventListener("mousedown", f);
		return () => document.removeEventListener("mousedown", f);
	}, [isOpen]);

	const list = (
		<div
			role="menu"
			style={{
				width,
				padding: 4,
				background: "var(--bg-panel)",
				borderRadius: "var(--radius-popover)",
				boxShadow: "var(--shadow-popover)",
				...(trigger
					? {
							position: "absolute" as const,
							top: "calc(100% + 4px)",
							[align]: 0,
							zIndex: "var(--z-popover)",
						}
					: {}),
				...style,
			}}
		>
			{items.map((it, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: список пунктов меню статичен на время открытия
				<Item key={i} it={it} onPick={() => set(false)} />
			))}
		</div>
	);
	if (!trigger) return list;
	return (
		<span ref={ref} style={{ position: "relative", display: "inline-flex" }}>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: обёртка вокруг произвольного trigger (обычно уже интерактивного Button/IconButton) — не дублировать роль/фокус поверх него */}
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: см. выше — тот же trigger */}
			<span onClick={() => set(!isOpen)} style={{ display: "inline-flex" }}>
				{trigger}
			</span>
			{isOpen && list}
		</span>
	);
}
