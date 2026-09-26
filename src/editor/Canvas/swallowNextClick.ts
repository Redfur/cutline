// После настоящего драга браузер всё равно шлёт click — на общего предка элементов,
// где были mousedown и mouseup. При резайзе тянущийся край всегда под курсором, и
// mouseup попадает то на оверлей, то на SVG карточки под ним; во втором случае click
// уходил на саму карточку, и она снимала выделение. Гасим этот один click на window
// в фазе перехвата — раньше корня React, — а если его не будет (отпустили за окном),
// снимаем перехватчик на следующем тике, чтобы не съесть чужой настоящий клик.
export function swallowNextClick() {
	const swallow = (e: MouseEvent) => e.stopPropagation();
	window.addEventListener("click", swallow, { capture: true, once: true });
	setTimeout(() => {
		window.removeEventListener("click", swallow, { capture: true });
	}, 0);
}
