"use client";

import { useState, useEffect } from "react";
import { PlusIcon, TrashIcon, SaveIcon } from "./AdminIcons";

interface TeamSettingsProps {
  tenantId: string;
  userRole: string;
}

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: "owner" | "admin" | "staff";
  created_at: string;
}

export default function TeamSettings({ tenantId, userRole }: TeamSettingsProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMember, setNewMember] = useState({
    email: "",
    name: "",
    password: "",
    role: "staff" as "admin" | "staff",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const canManageTeam = userRole === "owner" || userRole === "admin";

  useEffect(() => {
    fetchTeam();
  }, [tenantId]);

  const fetchTeam = async () => {
    try {
      const response = await fetch(`/api/admin/team?tenantId=${tenantId}`);
      if (response.ok) {
        const result = await response.json();
        setMembers(result.members || []);
      }
    } catch (error) {
      console.error("Failed to fetch team:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMember.email || !newMember.password) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, ...newMember }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Team member added!" });
        setShowAddModal(false);
        setNewMember({ email: "", name: "", password: "", role: "staff" });
        fetchTeam();
      } else {
        const data = await response.json();
        setMessage({ type: "error", text: data.error || "Failed to add member" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Remove this team member?")) return;

    try {
      const response = await fetch(`/api/admin/team?id=${memberId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMembers(members.filter((m) => m.id !== memberId));
        setMessage({ type: "success", text: "Member removed" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to remove member" });
    }
  };

  if (isLoading) {
    return <div className="text-[var(--text-secondary)]">Loading...</div>;
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Team</h2>
          <p className="text-[var(--text-secondary)] mt-1">
            Manage who can access the admin dashboard
          </p>
        </div>
        {canManageTeam && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
          >
            <PlusIcon className="w-5 h-5" />
            Add Member
          </button>
        )}
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm ${
            message.type === "success"
              ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
              : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Team Members List */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left px-6 py-4 text-sm font-medium text-[var(--text-secondary)]">
                Member
              </th>
              <th className="text-left px-6 py-4 text-sm font-medium text-[var(--text-secondary)]">
                Role
              </th>
              {canManageTeam && (
                <th className="text-right px-6 py-4 text-sm font-medium text-[var(--text-secondary)]">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">
                      {member.name || member.email}
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">{member.email}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      member.role === "owner"
                        ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                        : member.role === "admin"
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {member.role}
                  </span>
                </td>
                {canManageTeam && (
                  <td className="px-6 py-4 text-right">
                    {member.role !== "owner" && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Remove member"
                      >
                        <TrashIcon className="w-4 h-4 text-red-500" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role Descriptions */}
      <div className="mt-8 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Role Permissions</h3>
        <div className="space-y-3 text-sm">
          <div className="flex gap-4">
            <span className="font-medium text-[var(--text-primary)] w-20">Owner</span>
            <span className="text-[var(--text-secondary)]">
              Full access. Can manage billing, delete account, and manage all team members.
            </span>
          </div>
          <div className="flex gap-4">
            <span className="font-medium text-[var(--text-primary)] w-20">Admin</span>
            <span className="text-[var(--text-secondary)]">
              Can manage branding, topics, knowledge base, and add/remove staff.
            </span>
          </div>
          <div className="flex gap-4">
            <span className="font-medium text-[var(--text-primary)] w-20">Staff</span>
            <span className="text-[var(--text-secondary)]">
              Can view settings and manage knowledge base content only.
            </span>
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--background)] rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-[var(--border)]">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Add Team Member
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text-primary)]"
                  placeholder="team@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text-primary)]"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Temporary Password
                </label>
                <input
                  type="text"
                  value={newMember.password}
                  onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text-primary)]"
                  placeholder="Create a temporary password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Role
                </label>
                <select
                  value={newMember.role}
                  onChange={(e) =>
                    setNewMember({ ...newMember, role: e.target.value as "admin" | "staff" })
                  }
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text-primary)]"
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-[var(--border)] flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--surface)] rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={isSaving || !newMember.email || !newMember.password}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSaving ? "Adding..." : "Add Member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
