// «i» у неочевидной настройки: вместо подсказки в интерфейсе — справка, открытая
// на нужном пункте. Основной интерфейс не обрастает пояснениями
import { type HelpTopic, topicTitle } from "../../help/content";
import { IconButton } from "../../ui/forms/IconButton";
import { useHelp } from "../lib/help";

export interface HelpButtonProps {
	topic: HelpTopic;
}

export function HelpButton({ topic }: HelpButtonProps) {
	const help = useHelp();
	return (
		<IconButton
			icon="info"
			size="sm"
			label={`Подробнее: ${topicTitle(topic) ?? "справка"}`}
			onClick={() => help.open(topic)}
		/>
	);
}
