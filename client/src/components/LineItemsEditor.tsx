import { Plus, Trash2 } from "lucide-react";
import styles from "./LineItemsEditor.module.css";

export interface LineItem {
    id?: number;
    description: string;
    quantity: string;
    rate: string;
    amount: string;
}

interface LineItemsEditorProps {
    items: LineItem[];
    onChange: (items: LineItem[]) => void;
}

export default function LineItemsEditor({ items, onChange }: LineItemsEditorProps) {
    const addItem = () => {
        onChange([...items, { description: "", quantity: "1", rate: "0", amount: "0" }]);
    };

    const removeItem = (index: number) => {
        onChange(items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: keyof LineItem, value: string) => {
        const updated = [...items];
        updated[index] = { ...updated[index], [field]: value };

        if (field === "quantity" || field === "rate") {
            const qty = parseFloat(updated[index].quantity) || 0;
            const rate = parseFloat(updated[index].rate) || 0;
            updated[index].amount = (qty * rate).toFixed(2);
        }

        onChange(updated);
    };

    const total = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <span className={styles.colDescription}>Description</span>
                <span className={styles.colQty}>Qty</span>
                <span className={styles.colRate}>Rate (€)</span>
                <span className={styles.colAmount}>Amount</span>
                <span className={styles.colAction}></span>
            </div>

            <div className={styles.items}>
                {items.map((item, index) => (
                    <div key={index} className={styles.row}>
                        <input
                            type="text"
                            className={styles.inputDescription}
                            placeholder="Item description..."
                            value={item.description}
                            onChange={(e) => updateItem(index, "description", e.target.value)}
                        />
                        <input
                            type="number"
                            className={styles.inputQty}
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", e.target.value)}
                            min="0"
                            step="1"
                        />
                        <input
                            type="number"
                            className={styles.inputRate}
                            value={item.rate}
                            onChange={(e) => updateItem(index, "rate", e.target.value)}
                            min="0"
                            step="0.01"
                        />
                        <div className={styles.amount}>€{item.amount}</div>
                        <button
                            type="button"
                            className={styles.deleteBtn}
                            onClick={() => removeItem(index)}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>

            <button type="button" className={styles.addBtn} onClick={addItem}>
                <Plus size={16} />
                Add Line Item
            </button>

            <div className={styles.totalRow}>
                <span>Subtotal</span>
                <strong>€{total.toFixed(2)}</strong>
            </div>
        </div>
    );
}
