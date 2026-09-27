// Справка — панель поверх любого экрана (HelpPanel). Её состояние живёт в Workspace,
// над стартовым экраном и редактором: при смене документа она не закрывается.
// Остальным компонентам — только этот контекст, без пропов через всё дерево.
import { createContext, useContext } from "react";

export interface HelpApi {
	// topic — раздел или пункт справки: панель раскроет и подсветит его
	open: (topic?: string) => void;
	toggle: () => void;
	close: () => void;
	// пока открыта панель экспорта, справки не видно (как в макете): она ушла бы под затемнение
	setHidden: (hidden: boolean) => void;
}

const noop = () => {};

export const HelpContext = createContext<HelpApi>({
	open: noop,
	toggle: noop,
	close: noop,
	setHidden: noop,
});

export function useHelp(): HelpApi {
	return useContext(HelpContext);
}
