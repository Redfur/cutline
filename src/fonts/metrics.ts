// Вертикальные метрики встроенных шрифтов — доля кегля, из самих файлов (hhea
// ascender/descender ÷ unitsPerEm; у всех совпадают с OS/2 typo, и у всех начертаний
// семейства одинаковые — тест сверяет с файлами). Таблица, а не canvas: Chromium отдаёт
// fontBoundingBoxAscent целыми px, а кегль в модели — мм порядка 3–10, и базовая линия
// скакала ступеньками по миллиметру. Отдельный файл без импорта шрифтов: таблицей
// пользуется и миграция схемы, и node-тесты.

export interface VerticalMetrics {
	ascent: number;
	descent: number;
}

export const BUNDLED_METRICS: Record<string, VerticalMetrics> = {
	"Golos Text": { ascent: 0.98, descent: 0.22 },
	Manrope: { ascent: 1.066, descent: 0.3 },
	"PT Serif": { ascent: 1.039, descent: 0.286 },
	"JetBrains Mono": { ascent: 1.02, descent: 0.3 },
};

// Системный шрифт в миграции, где мерить нечем: типичные пропорции. На экране системный
// шрифт мерит canvas (render/measure.ts), так что это только оценка сдвига при миграции
export const TYPICAL_METRICS: VerticalMetrics = { ascent: 0.95, descent: 0.25 };

export function bundledMetrics(family: string): VerticalMetrics | undefined {
	return BUNDLED_METRICS[family];
}
