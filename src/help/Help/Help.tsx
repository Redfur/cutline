// Справка — отдельная страница (help.html), открывается из редактора в новой
// вкладке. Раскладка — по «Cutline Help» из проекта cutline, текст — src/help/content.ts
import { useEffect } from "react";
import { INTRO, SECTIONS, STEPS } from "../content";
import styles from "./Help.module.css";
import { Keys } from "./Keys";
import { RichText } from "./RichText";

export function Help() {
	// браузер ищет #якорь, когда разделов ещё нет — их рисует React после загрузки.
	// Ссылка «Все функции — в справке» открывала бы страницу с начала
	useEffect(() => {
		const id = decodeURIComponent(window.location.hash.slice(1));
		if (id) document.getElementById(id)?.scrollIntoView();
	}, []);

	return (
		<div className={styles.page}>
			<header className={styles.header}>
				<div className={styles.brand}>Cutline</div>
				<div className={styles.divider} />
				<div className={styles.title}>Справка</div>
				<div className={styles.spacer} />
				<a className={styles.back} href={import.meta.env.BASE_URL}>
					Открыть редактор
				</a>
			</header>

			<div className={styles.layout}>
				<nav className={styles.nav} aria-label="Разделы">
					<div className={styles.navLabel}>Разделы</div>
					<a className={styles.navLink} href="#start">
						Как это работает
					</a>
					{SECTIONS.map((s) => (
						<a key={s.id} className={styles.navLink} href={`#${s.id}`}>
							{s.title}
						</a>
					))}
				</nav>

				<main className={styles.main}>
					<section id="start" className={styles.section}>
						<h1 className={styles.h1}>Как это работает</h1>
						<p className={styles.intro}>
							<RichText text={INTRO} />
						</p>
						<ol className={styles.steps}>
							{STEPS.map((step, i) => (
								<li key={step.title} className={styles.step}>
									<span className={styles.stepNumber}>{i + 1}</span>
									<span className={styles.itemTitle}>{step.title}</span>
									<span className={styles.stepText}>{step.text}</span>
								</li>
							))}
						</ol>
					</section>

					{SECTIONS.map((s) => (
						<section key={s.id} id={s.id} className={styles.section}>
							<h2 className={styles.h2}>{s.title}</h2>
							{s.intro && (
								<p className={styles.intro}>
									<RichText text={s.intro} />
								</p>
							)}
							<div className={styles.card}>
								{s.items?.map((item) => (
									<div key={item.title} className={styles.item}>
										<span className={styles.itemTitle}>{item.title}</span>
										<span className={styles.itemText}>
											<RichText text={item.text} />
										</span>
										{item.example && (
											<code className={styles.example}>{item.example}</code>
										)}
									</div>
								))}
								{s.keys?.map((k) => (
									<div key={k.action} className={styles.keyRow}>
										<span className={styles.keyAction}>{k.action}</span>
										<Keys keys={k.keys} />
									</div>
								))}
							</div>
						</section>
					))}
				</main>
			</div>
		</div>
	);
}
