import { useState } from "react";

export function useHover(): [
	boolean,
	boolean,
	{
		onMouseEnter: () => void;
		onMouseLeave: () => void;
		onMouseDown: () => void;
		onMouseUp: () => void;
	},
] {
	const [h, setH] = useState(false);
	const [p, setP] = useState(false);
	return [
		h,
		p,
		{
			onMouseEnter: () => setH(true),
			onMouseLeave: () => {
				setH(false);
				setP(false);
			},
			onMouseDown: () => setP(true),
			onMouseUp: () => setP(false),
		},
	];
}
