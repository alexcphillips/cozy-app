import { useState, useMemo, useEffect } from "react";
import { api } from "@/lib/api";
import Table, { type Column } from "@/components/Table/Table";
import styles from "./ManageUsersTab.module.css";

interface UserData {
    id: number;
    username: string;
    email: string;
    is_admin: boolean;
}

export default function ManageUsersTab() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userIdSearch, setUserIdSearch] = useState("");
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<Partial<UserData>>({});

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await api.get<UserData[]>("/users");
                setUsers(response);
            } catch (err) {
                console.error("Failed to load user list panel:", err);
                setError("Could not load user records from database.");
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    async function handleSave(id: number) {
        try {
            await api.patch(`/user/${id}`, editForm);
            setUsers((prev) =>
                prev.map((user) =>
                    user.id === id ? { ...user, ...editForm } : user,
                ),
            );
            setEditingId(null);
        } catch (err) {
            console.error("Failed to update user row cell modifications:", err);
            alert(
                "Failed to save changes. Please check server connections and retry.",
            );
        }
    }

    async function handleDelete(id: number, username: string) {
        const confirmed = window.confirm(
            `Are you sure you want to remove user "${username}" (ID: #${id}) from the system?`,
        );
        if (!confirmed) return;

        try {
            await api.delete(`/user/${id}`);

            setUsers((prev) => prev.filter((user) => user.id !== id));

            if (editingId === id) {
                setEditingId(null);
            }
        } catch (err) {
            console.error("Failed to remove user account record:", err);
            alert(
                "Failed to delete user. Please check your credentials and connection permissions.",
            );
        }
    }

    function startEditing(user: UserData) {
        setEditingId(user.id);
        setEditForm(user);
    }

    const filteredUsers = useMemo(() => {
        if (!userIdSearch.trim()) return users;
        return users.filter((u) => String(u.id).includes(userIdSearch.trim()));
    }, [userIdSearch, users]);

    const tableColumns: Column<UserData>[] = [
        { key: "id", label: "User ID", sortable: true },
        {
            key: "username",
            label: "Username",
            sortable: true,
            render: (row) =>
                editingId === row.id ? (
                    <input
                        className={styles["inline-input"]}
                        value={editForm.username || ""}
                        onChange={(e) =>
                            setEditForm({
                                ...editForm,
                                username: e.target.value,
                            })
                        }
                    />
                ) : (
                    row.username
                ),
        },
        {
            key: "email",
            label: "Email Address",
            sortable: true,
            render: (row) =>
                editingId === row.id ? (
                    <input
                        className={styles["inline-input"]}
                        type="email"
                        value={editForm.email || ""}
                        onChange={(e) =>
                            setEditForm({ ...editForm, email: e.target.value })
                        }
                    />
                ) : (
                    row.email
                ),
        },
        {
            key: "is_admin",
            label: "Role",
            sortable: true,
            render: (row) =>
                editingId === row.id ? (
                    <select
                        className={styles["inline-select"]}
                        value={String(editForm.is_admin)}
                        onChange={(e) =>
                            setEditForm({
                                ...editForm,
                                is_admin: e.target.value === "true",
                            })
                        }
                    >
                        <option value="true">Admin</option>
                        <option value="false">User</option>
                    </select>
                ) : row.is_admin ? (
                    <span className={styles["badge-admin"]}>Admin</span>
                ) : (
                    <span className={styles["badge-user"]}>User</span>
                ),
        },
        {
            key: "id",
            label: "Actions",
            render: (row) => (
                <div className={styles["actions-cell"]}>
                    {editingId === row.id ? (
                        <>
                            <button
                                className={styles["btn-save"]}
                                onClick={() => handleSave(row.id)}
                            >
                                Save
                            </button>
                            <button
                                className={styles["btn-cancel"]}
                                onClick={() => setEditingId(null)}
                            >
                                Cancel
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                className={styles["btn-edit"]}
                                onClick={() => startEditing(row)}
                            >
                                Edit
                            </button>
                            <button
                                className={styles["btn-delete"]}
                                onClick={() =>
                                    handleDelete(row.id, row.username)
                                }
                            >
                                Delete
                            </button>
                        </>
                    )}
                </div>
            ),
        },
    ];

    if (error) return <div className={styles["error-banner"]}>{error}</div>;

    return (
        <div className={styles["manage-container"]}>
            <div className={styles["search-row"]}>
                <div className={styles["input-group"]}>
                    <label htmlFor="user-id-search">Search by User ID:</label>
                    <input
                        id="user-id-search"
                        type="number"
                        placeholder="Type ID number..."
                        value={userIdSearch}
                        onChange={(e) => setUserIdSearch(e.target.value)}
                        disabled={loading}
                    />
                </div>
            </div>
            <div className={styles["table-wrapper"]}>
                {loading ? (
                    <div className={styles["empty-state"]}>
                        {" "}
                        Syncing database records...{" "}
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className={styles["empty-state"]}>
                        {" "}
                        No matching users found inside database registry.{" "}
                    </div>
                ) : (
                    <Table data={filteredUsers} columns={tableColumns} />
                )}
            </div>
        </div>
    );
}
