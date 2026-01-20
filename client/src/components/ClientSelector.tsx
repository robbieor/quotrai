import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Plus, User } from "lucide-react";
import type { Client } from "../types";
import styles from "./ClientSelector.module.css";

interface ClientSelectorProps {
    value: number | null;
    onChange: (clientId: number | null, client?: Client) => void;
    onCreateNew?: () => void;
}

export default function ClientSelector({ value, onChange, onCreateNew }: ClientSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");

    const { data: clients = [] } = useQuery<Client[]>({
        queryKey: ["/api/clients"],
    });

    const selectedClient = clients.find(c => c.id === value);

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
    );

    const handleSelect = (client: Client) => {
        onChange(client.id, client);
        setIsOpen(false);
        setSearch("");
    };

    return (
        <div className={styles.container}>
            <button
                type="button"
                className={styles.trigger}
                onClick={() => setIsOpen(!isOpen)}
            >
                {selectedClient ? (
                    <div className={styles.selectedClient}>
                        <div className={styles.avatar}>
                            <User size={14} />
                        </div>
                        <div className={styles.clientInfo}>
                            <span className={styles.clientName}>{selectedClient.name}</span>
                            {selectedClient.email && (
                                <span className={styles.clientEmail}>{selectedClient.email}</span>
                            )}
                        </div>
                    </div>
                ) : (
                    <span className={styles.placeholder}>Select a client...</span>
                )}
                <ChevronDown size={18} className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`} />
            </button>

            {isOpen && (
                <div className={styles.dropdown}>
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Search clients..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />

                    <div className={styles.clientList}>
                        {filteredClients.length === 0 ? (
                            <div className={styles.empty}>No clients found</div>
                        ) : (
                            filteredClients.map(client => (
                                <button
                                    key={client.id}
                                    type="button"
                                    className={`${styles.clientOption} ${client.id === value ? styles.selected : ""}`}
                                    onClick={() => handleSelect(client)}
                                >
                                    <div className={styles.avatar}>
                                        <User size={14} />
                                    </div>
                                    <div className={styles.clientInfo}>
                                        <span className={styles.clientName}>{client.name}</span>
                                        {client.email && (
                                            <span className={styles.clientEmail}>{client.email}</span>
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    {onCreateNew && (
                        <button
                            type="button"
                            className={styles.createNewBtn}
                            onClick={() => {
                                setIsOpen(false);
                                onCreateNew();
                            }}
                        >
                            <Plus size={16} />
                            Create New Client
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
