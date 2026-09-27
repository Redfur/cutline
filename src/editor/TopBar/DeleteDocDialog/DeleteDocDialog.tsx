// Подтверждение удаления документа (DeleteDocDialog в макете). Спрашиваем, в отличие
// от «Нового документа»: удаление из списка не отменяется Ctrl+Z.
import { Button } from "../../../ui/forms/Button";
import { Dialog } from "../../../ui/overlays/Dialog";
import styles from "./DeleteDocDialog.module.css";

export interface DeleteDocDialogProps {
	name: string;
	onCancel: () => void;
	onConfirm: () => void;
}

export function DeleteDocDialog({
	name,
	onCancel,
	onConfirm,
}: DeleteDocDialogProps) {
	return (
		<Dialog
			title="Удалить документ?"
			width={400}
			onClose={onCancel}
			footer={
				<>
					<Button onClick={onCancel}>Отмена</Button>
					<Button variant="danger" icon="trash-2" onClick={onConfirm}>
						Удалить
					</Button>
				</>
			}
		>
			<div className={styles.text}>
				Документ <b className={styles.name}>«{name}»</b> будет удалён вместе с
				макетом и таблицей данных. Отменить удаление нельзя.
			</div>
		</Dialog>
	);
}
