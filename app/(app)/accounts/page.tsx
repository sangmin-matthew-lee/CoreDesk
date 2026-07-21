"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface UserAccount {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  dept: "Sales" | "Management" | "Super Admin";
  blocked: number;
  approved: number;
  requires_password_change: number;
  created_at: string;
}

export default function AccountsPage() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ userId: number; dept: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"manage" | "create" | "applications">("manage");

  // Form State
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    dept: "Sales" as "Sales" | "Management" | "Super Admin",
  });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState<{
    email: string;
    tempPass: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const approvedUsers = users.filter((u) => u.approved !== 0);
  const pendingUsers = users.filter((u) => u.approved === 0);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (res.ok) {
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMe = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data);
      }
    } catch (err) {
      console.error("Error fetching current user:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchMe();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to create user");
        return;
      }

      setFormSuccess({
        email: form.email,
        tempPass: data.tempPassword,
      });

      // Clear form except dept
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        dept: "Sales",
      });

      fetchUsers();
    } catch {
      setFormError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const canManageUser = (user: UserAccount) => {
    if (user.id === currentUser?.userId) return false;
    if (user.dept === "Super Admin") return currentUser?.dept === "Super Admin";
    if (user.dept === "Management") return currentUser?.dept === "Super Admin";
    return currentUser?.dept === "Management" || currentUser?.dept === "Super Admin";
  };

  const handleToggleBlock = async (user: UserAccount) => {
    if (!canManageUser(user)) return;
    const shouldBlock = user.blocked === 0;

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocked: shouldBlock }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to update user status");
        return;
      }

      fetchUsers();
    } catch {
      alert("Something went wrong");
    }
  };

  const handleDeleteUser = async (user: UserAccount) => {
    if (!canManageUser(user)) return;
    if (!confirm(`Are you sure you want to delete ${user.first_name} ${user.last_name}'s account? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete user");
        return;
      }

      fetchUsers();
    } catch {
      alert("Something went wrong");
    }
  };

  const handleApproveUser = async (user: UserAccount) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: true }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to approve user");
        return;
      }

      fetchUsers();
    } catch {
      alert("Something went wrong");
    }
  };

  const handleRejectUser = async (user: UserAccount) => {
    if (!confirm(`Are you sure you want to reject and delete ${user.first_name} ${user.last_name}'s registration application?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to reject registration");
        return;
      }

      fetchUsers();
    } catch {
      alert("Something went wrong");
    }
  };

  const handleRoleChange = async (user: UserAccount, newDept: "Sales" | "Management" | "Super Admin") => {
    if (user.dept === newDept) return;
    if (!confirm(`Are you sure you want to change ${user.first_name} ${user.last_name}'s role from "${user.dept}" to "${newDept}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dept: newDept }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to update user role");
        return;
      }

      fetchUsers();
    } catch {
      alert("Something went wrong updating user role");
    }
  };

  const copyCredentials = () => {
    if (!formSuccess) return;
    const text = `CoreDesk Login Details\nEmail: ${formSuccess.email}\nTemporary Password: ${formSuccess.tempPass}`;
    navigator.clipboard.writeText(text);
    alert("Credentials copied to clipboard!");
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-500 text-sm">Loading accounts...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create, block, or delete staff accounts.</p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-gray-100 p-1 rounded-lg self-start md:self-auto border border-gray-200 gap-1">
          <button
            onClick={() => setActiveTab("manage")}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "manage"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Manage Accounts
          </button>
          <button
            onClick={() => setActiveTab("applications")}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors relative ${
              activeTab === "applications"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Pending Approvals
            {pendingUsers.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {pendingUsers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "create"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Create Account
          </button>
        </div>
      </div>

      {/* Success Notification Card for Created User */}
      {formSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 space-y-4 shadow-sm animate-fadeIn">
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-2">
              <span className="text-2xl">🎉</span>
              <div>
                <h3 className="font-semibold text-emerald-950">User Created Successfully!</h3>
                <p className="text-sm text-emerald-800 mt-1">
                  An email containing the login credentials has been sent to <strong className="font-semibold">{formSuccess.email}</strong>.
                </p>
                <div className="mt-3 bg-white border border-emerald-100 rounded-lg p-3 inline-block font-mono text-sm shadow-sm text-emerald-950">
                  <div className="flex flex-col gap-1">
                    <div><span className="text-gray-400">Email:</span> {formSuccess.email}</div>
                    <div><span className="text-gray-400">Temp Password:</span> <strong className="font-bold text-indigo-600">{formSuccess.tempPass}</strong></div>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => setFormSuccess(null)}
              className="text-emerald-500 hover:text-emerald-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={copyCredentials}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copy Credentials
            </button>
            <button
              onClick={() => setFormSuccess(null)}
              className="text-xs text-emerald-700 hover:text-emerald-900 font-medium transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Tab Content rendering */}
      {activeTab === "manage" ? (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="font-semibold text-gray-800 text-sm">Staff Directory</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">User Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Number</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Password</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {approvedUsers.map((acc) => {
                  const isSelf = acc.id === currentUser?.userId;
                  const isSuperAdmin = acc.dept === "Super Admin";
                  const isMgmt = acc.dept === "Management";

                  const isProtected =
                    isSelf ||
                    (isSuperAdmin && currentUser?.dept !== "Super Admin") ||
                    (isMgmt && currentUser?.dept !== "Super Admin");

                  return (
                    <tr key={acc.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSuperAdmin
                              ? "bg-amber-100 text-amber-800"
                              : isMgmt
                              ? "bg-purple-100 text-purple-700"
                              : "bg-indigo-100 text-indigo-700"
                          }`}>
                            {acc.first_name.charAt(0).toUpperCase()}
                          </span>
                          <div className="font-medium text-gray-900 flex items-center gap-1.5">
                            {acc.first_name} {acc.last_name}
                            {isSelf && (
                              <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                                You
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600 font-mono text-xs">
                        {acc.email}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                        {acc.phone || "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {currentUser?.dept === "Super Admin" && !isSelf ? (
                          <select
                            value={acc.dept}
                            onChange={(e) => handleRoleChange(acc, e.target.value as "Sales" | "Management" | "Super Admin")}
                            className={`px-2 py-1 rounded-md text-xs font-semibold border focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm transition-colors ${
                              isSuperAdmin
                                ? "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
                                : isMgmt
                                ? "bg-purple-50 text-purple-900 border-purple-300 hover:bg-purple-100"
                                : "bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100"
                            }`}
                          >
                            <option value="Sales">Sales</option>
                            <option value="Management">Management</option>
                            <option value="Super Admin">Super Admin</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            isSuperAdmin
                              ? "bg-amber-100 text-amber-800"
                              : isMgmt
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          }`}>
                            {acc.dept}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {acc.blocked === 1 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            Blocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {acc.requires_password_change === 1 ? (
                          <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                            ⚠️ Temp / Reset Required
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            ✓ Custom Set
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {isProtected ? (
                          <span className="text-xs text-gray-400 italic">Protected</span>
                        ) : (
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => handleToggleBlock(acc)}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors ${
                                acc.blocked === 1
                                  ? "bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                  : "bg-white text-amber-600 border-amber-200 hover:bg-amber-50"
                              }`}
                            >
                              {acc.blocked === 1 ? "Unblock" : "Block"}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(acc)}
                              className="px-2.5 py-1 text-xs font-semibold text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === "applications" ? (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h2 className="font-semibold text-gray-800 text-sm">Pending Registration Applications</h2>
            <span className="text-xs text-gray-500 font-medium">{pendingUsers.length} application(s)</span>
          </div>

          <div className="overflow-x-auto">
            {pendingUsers.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                No pending registration applications found.
              </div>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">User Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Applied Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingUsers.map((acc) => (
                    <tr key={acc.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {acc.first_name.charAt(0).toUpperCase()}
                          </span>
                          <div className="font-medium text-gray-900">
                            {acc.first_name} {acc.last_name}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600 font-mono text-xs">
                        {acc.email}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                        {acc.phone || "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {acc.dept}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs font-mono">
                        {new Date(acc.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleApproveUser(acc)}
                            className="px-3 py-1 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectUser(acc)}
                            className="px-3 py-1 text-xs font-semibold text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-xl bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
          <div>
            <h2 className="font-bold text-gray-900 text-base">Register New Account</h2>
            <p className="text-xs text-gray-500 mt-0.5">Register a user with a generated temp password.</p>
          </div>

          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {formError}
            </div>
          )}

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700">First Name</label>
              <input
                required
                type="text"
                value={form.firstName}
                onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                placeholder="Jane"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700">Last Name</label>
              <input
                required
                type="text"
                value={form.lastName}
                onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                placeholder="Smith"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700">Email Address</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="jane.smith@company.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700">Role / Department</label>
              {currentUser?.dept === "Super Admin" ? (
                <select
                  value={form.dept}
                  onChange={(e) => setForm((p) => ({ ...p, dept: e.target.value as "Sales" | "Management" | "Super Admin" }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Sales">Sales (CRM access only)</option>
                  <option value="Management">Management (Management Level Admin)</option>
                  <option value="Super Admin">Super Admin (Full Access & Admin Creation)</option>
                </select>
              ) : (
                <div>
                  <select
                    disabled
                    value="Sales"
                    className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-500 cursor-not-allowed"
                  >
                    <option value="Sales">Sales (CRM access only)</option>
                  </select>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Note: Management level admins can only register Sales accounts. Super Admin access is required to create Management level accounts.
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {submitting ? "Creating..." : "Create & Send Email"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

