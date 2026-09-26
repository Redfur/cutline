/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	test: {
		// тестируется только чистая логика (геометрия, fit, история) — DOM не нужен;
		// где модулю нужен canvas (measure.ts), он стабится в самом тесте
		environment: "node",
	},
});
