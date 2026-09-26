import { serializeCsv } from "../data/csv";
import type { DataRecord, FieldDef } from "../model/document";
import { downloadBlob } from "./download";

// BOM нужен Excel: без него он открывает UTF-8 как 1251, и кириллица превращается
// в «кракозябры» — ровно то, от чего защищает импорт с другой стороны.
export function downloadCsv(
	fields: FieldDef[],
	records: DataRecord[],
	filename: string,
): void {
	downloadBlob(
		new Blob(["﻿", serializeCsv(fields, records)], {
			type: "text/csv;charset=utf-8",
		}),
		filename,
	);
}
