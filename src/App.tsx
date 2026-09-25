import { badgeDocument } from "./render/fixtures/badge";
import { render } from "./render/render";

// Рабочий стенд для ручной проверки render() в браузере (Этап 1 роадмапа) — не редактор.
// Настоящий интерфейс соберётся на Этапе 2 по мокапам Cutline Design System (см. CLAUDE.md).
// Этот компонент будет удалён, когда появится реальный UI.

const RENDER_OPTS = { outlines: false, bleed: false, marks: false };

function App() {
	return (
		<div style={{ display: "flex", gap: 24, padding: 24, flexWrap: "wrap" }}>
			{badgeDocument.records.map((record, i) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: фикстура статична, порядок не меняется
					key={i}
					style={{ width: `${badgeDocument.canvas.w * 3}px` }}
					// biome-ignore lint/security/noDangerouslySetInnerHtml: render() выдаёт доверенный SVG из собственной фикстуры
					dangerouslySetInnerHTML={{
						__html: render(badgeDocument, record, RENDER_OPTS),
					}}
				/>
			))}
		</div>
	);
}

export default App;
