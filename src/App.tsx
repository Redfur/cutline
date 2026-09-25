import { useState } from "react";
import { downloadDocument, openDocumentFile } from "./export/document";
import { downloadPng } from "./export/png";
import { downloadSvg } from "./export/svg";
import type { CutlineDocument, DataRecord } from "./model/document";
import { badgeDocument } from "./render/fixtures/badge";
import { render, renderedSize } from "./render/render";

// Рабочий стенд для ручной проверки render()/экспорта/сохранения в браузере
// (Этап 1 роадмапа) — не редактор. Настоящий интерфейс соберётся на Этапе 2 по
// мокапам Cutline Design System (см. CLAUDE.md). Компонент будет удалён, когда
// появится реальный UI.

const RENDER_OPTS = { outlines: false, bleed: false, marks: false };

function slug(text: string): string {
	return (text || "badge")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^\wа-яё-]/gi, "");
}

function BadgeCard({
	doc,
	record,
}: {
	doc: CutlineDocument;
	record: DataRecord;
}) {
	const svg = render(doc, record, RENDER_OPTS);
	const { widthMm, heightMm } = renderedSize(doc.canvas, RENDER_OPTS);
	const name = slug(record.name ?? "");

	return (
		<div style={{ width: `${doc.canvas.w * 3}px` }}>
			<div
				className="badge-preview-card"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: render() выдаёт доверенный SVG из собственной фикстуры
				dangerouslySetInnerHTML={{ __html: svg }}
			/>
			<div style={{ display: "flex", gap: 8, marginTop: 8 }}>
				<button type="button" onClick={() => downloadSvg(svg, `${name}.svg`)}>
					Скачать SVG
				</button>
				<button
					type="button"
					onClick={() =>
						downloadPng(svg, widthMm, heightMm, 300, `${name}@300dpi.png`)
					}
				>
					Скачать PNG
				</button>
			</div>
		</div>
	);
}

function App() {
	const [doc, setDoc] = useState<CutlineDocument>(badgeDocument);

	const handleOpen = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;
		openDocumentFile(file)
			.then(setDoc)
			.catch((err: unknown) => {
				alert(err instanceof Error ? err.message : String(err));
			});
	};

	return (
		<div style={{ padding: 24 }}>
			<div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
				<button
					type="button"
					onClick={() => downloadDocument(doc, "cutline-badge.json")}
				>
					Сохранить документ
				</button>
				<label
					style={{
						border: "1px solid #ccc",
						padding: "4px 8px",
						cursor: "pointer",
					}}
				>
					Загрузить документ…
					<input
						type="file"
						accept="application/json"
						onChange={handleOpen}
						style={{ display: "none" }}
					/>
				</label>
			</div>
			<div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
				{doc.records.map((record, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: фикстура статична, порядок не меняется
					<BadgeCard key={i} doc={doc} record={record} />
				))}
			</div>
		</div>
	);
}

export default App;
