import { useEffect, useMemo, useState } from "react";
import Card from "../../components/ui/Card";
import Table from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import FormField, { fieldInputClass } from "../../components/ui/FormField";
import PageHeader from "../../components/ui/PageHeader";
import ActionButton from "../../components/ui/ActionButton";
import { createClient, createUser, deleteUser, getClients, getRoles, getUsers, updateClient, updateUser } from "../../services/api";

const roleAccess = {
  admin: ["Everything", "Settings", "Audit Logs", "Users & Roles", "Backups"],
  manager: ["Dashboard", "Clients", "Projects", "Project Board", "Daily Tasks", "Photos", "Documents", "Finance", "Invoices", "Quotations", "Inventory", "Reports"],
  finance: ["Dashboard", "Finance", "Invoices", "Expenses", "Payments", "Reports", "Inventory view", "Payroll view"],
  hr: ["Dashboard", "HR Management", "Employee Directory", "Departments", "Attendance", "Leave", "Holidays", "Payroll", "Reviews", "Goals"],
  designer: ["Dashboard", "Projects", "Photos", "Documents", "Quotations", "Client Work"],
  staff: ["Dashboard", "Projects", "Daily Tasks", "Photos", "Documents", "Inventory stock actions", "Notifications"],
  viewer: ["Dashboard", "Notifications only"],
};

const emptyForm = { name: "", email: "", password: "", role_ids: [] };
const emptyClientForm = { client_id: "", name: "", email: "", phone: "", location: "", portal_password: "" };

export default function UsersRoles() {
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [roles, setRoles] = useState([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [clientForm, setClientForm] = useState(emptyClientForm);
  const [editingUser, setEditingUser] = useState(null);
  const [activeMenu, setActiveMenu] = useState("Users List");
  const [status, setStatus] = useState("loading");
  const [notice, setNotice] = useState("");

  const loadData = () => Promise.all([getUsers(), getRoles(), getClients()]).then(([userData, roleData, clientData]) => {
    setUsers(userData);
    setRoles(roleData);
    setClients(clientData);
    setForm((current) => ({ ...current, role_ids: current.role_ids.length ? current.role_ids : defaultRoleIds(roleData) }));
    setStatus("connected");
  }).catch(() => setStatus("error"));

  useEffect(() => {
    loadData();
  }, []);

  const filteredUsers = useMemo(() => {
    const needle = query.toLowerCase();
    return users.filter((user) => [user.name, user.email, user.role, ...(user.roles || []).map((role) => role.name)].join(" ").toLowerCase().includes(needle));
  }, [users, query]);

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const toggleRole = (roleId) => {
    setForm((current) => ({
      ...current,
      role_ids: current.role_ids.includes(roleId) ? current.role_ids.filter((id) => id !== roleId) : [...current.role_ids, roleId],
    }));
  };

  const submitUser = async (event) => {
    event.preventDefault();
    const selectedRoles = roles.filter((role) => form.role_ids.includes(role.id));
    if (selectedRoles.length === 0) {
      setNotice("Please choose at least one access permission.");
      return;
    }
    const payload = {
      name: form.name,
      email: form.email,
      role: selectedRoles[0]?.name || "viewer",
      role_ids: form.role_ids,
    };
    if (form.password) payload.password = form.password;
    editingUser ? await updateUser(editingUser.id, payload) : await createUser({ ...payload, password: form.password });
    setForm({ ...emptyForm, role_ids: defaultRoleIds(roles) });
    setEditingUser(null);
    setNotice(editingUser ? "User permissions updated." : "User created with selected permissions.");
    setActiveMenu("Users List");
    loadData();
  };

  const editUser = (user) => {
    setEditingUser(user);
    setActiveMenu("Add User");
    setForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role_ids: (user.roles || []).map((role) => role.id),
    });
    setNotice("Editing " + user.name + ". Tick the access boxes this user should see.");
  };

  const removeUser = async (user) => {
    if (!window.confirm(`Delete ${user.name}?`)) return;
    await deleteUser(user.id);
    loadData();
  };

  const selectClient = (clientId) => {
    const client = clients.find((item) => String(item.id) === String(clientId));
    setClientForm(client ? {
      client_id: client.id,
      name: client.name || "",
      email: client.email === "-" ? "" : client.email || "",
      phone: client.phone === "-" ? "" : client.phone || "",
      location: client.location === "-" ? "" : client.location || "",
      portal_password: "",
    } : emptyClientForm);
  };

  const submitClientAccess = async (event) => {
    event.preventDefault();
    if (!clientForm.email || !clientForm.portal_password) {
      setNotice("Client email and portal password are required.");
      return;
    }
    const payload = {
      name: clientForm.name,
      email: clientForm.email,
      phone: clientForm.phone,
      location: clientForm.location,
      portal_password: clientForm.portal_password,
    };
    if (clientForm.client_id) {
      await updateClient(clientForm.client_id, payload);
      setNotice("Client portal login updated. The client can use this email and password at Client Login.");
    } else {
      await createClient(payload);
      setNotice("Client portal login created. The client can use this email and password at Client Login.");
    }
    setClientForm(emptyClientForm);
    setActiveMenu("Client Access");
    loadData();
  };

  return <div className="space-y-4">
    <PageHeader eyebrow="Admin" title="Users & Roles" description="Manage staff access and client portal logins." action={<Button type="button" onClick={() => {
      setEditingUser(null);
      setForm({ ...emptyForm, role_ids: defaultRoleIds(roles) });
      setActiveMenu("Add User");
    }}>Add User</Button>} />
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card className="min-h-[96px] p-4"><p className="text-xs font-bold uppercase tracking-wide text-brand-muted">Users</p><b className="mt-1 block text-2xl">{users.length}</b></Card>
      <Card className="min-h-[96px] p-4"><p className="text-xs font-bold uppercase tracking-wide text-brand-muted">Access Roles</p><b className="mt-1 block text-2xl">{roles.length}</b></Card>
      <Card className="min-h-[96px] p-4"><p className="text-xs font-bold uppercase tracking-wide text-brand-muted">Clients With Portal</p><b className="mt-1 block text-2xl">{clients.filter((client) => client.hasPortalAccess).length}</b></Card>
    </section>

    {notice && <p className="rounded-xl bg-brand-soft p-3 text-sm font-semibold text-brand-primary">{notice}</p>}

    {activeMenu === "Users List" && <section>
      <Card className="p-4">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold">Users & Roles</h2>
            <p className="text-sm text-brand-muted">Choose exactly what access each staff user should see.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users..." className="h-11 rounded-xl border border-brand-border px-4 text-sm outline-none" />
            <Button type="button" variant="outline" onClick={() => setActiveMenu("Client Access")}>Add Client Login</Button>
          </div>
        </div>
        <Table
          columns={[
            { key: "name", label: "Name", render: (user) => <b>{user.name}</b> },
            { key: "email", label: "Email" },
            { key: "role", label: "Primary Role" },
            { key: "roles", label: "What User Can See", render: (user) => user.roles?.map((role) => role.label || role.name).join(", ") || "-" },
            { key: "actions", label: "Actions", render: (user) => <div className="flex gap-2"><ActionButton onClick={() => editUser(user)}>Edit</ActionButton><ActionButton className="text-brand-danger" onClick={() => removeUser(user)}>Delete</ActionButton></div> },
          ]}
          rows={filteredUsers}
          empty="No users found."
        />
      </Card>
    </section>}

    {activeMenu === "Client Access" && <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_28rem]">
      <Card className="p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold">Client Portal Access</h3>
            <p className="mt-1 text-sm text-brand-muted">Give a client an email and password for the Client Login page.</p>
          </div>
          <Button type="button" variant="outline" onClick={() => setActiveMenu("Users List")}>Back to Users</Button>
        </div>
        <form onSubmit={submitClientAccess} className="space-y-4">
          <FormField label="Existing client (optional)">
            <select value={clientForm.client_id} onChange={(event) => selectClient(event.target.value)} className={fieldInputClass}>
              <option value="">Create new client login</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.name} {client.email !== "-" ? `- ${client.email}` : ""}</option>)}
            </select>
          </FormField>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <FormField label="Client name"><input value={clientForm.name} onChange={(event) => setClientForm((current) => ({ ...current, name: event.target.value }))} required className={fieldInputClass} /></FormField>
            <FormField label="Client email / username"><input type="email" value={clientForm.email} onChange={(event) => setClientForm((current) => ({ ...current, email: event.target.value }))} required className={fieldInputClass} /></FormField>
            <FormField label="Phone"><input value={clientForm.phone} onChange={(event) => setClientForm((current) => ({ ...current, phone: event.target.value }))} className={fieldInputClass} /></FormField>
            <FormField label="Location"><input value={clientForm.location} onChange={(event) => setClientForm((current) => ({ ...current, location: event.target.value }))} className={fieldInputClass} /></FormField>
          </div>
          <FormField label={clientForm.client_id ? "New client portal password" : "Client portal password"}>
            <input type="password" value={clientForm.portal_password} onChange={(event) => setClientForm((current) => ({ ...current, portal_password: event.target.value }))} required minLength={6} className={fieldInputClass} />
          </FormField>
          <Button className="w-full">{clientForm.client_id ? "Update Client Login" : "Create Client Login"}</Button>
        </form>
      </Card>

      <Card className="p-4 md:p-5">
        <h3 className="font-bold">Client Login Guide</h3>
        <p className="mt-1 text-sm text-brand-muted">Client portal accounts are for `/client-login`. Staff users and role permissions stay on the normal Add User form.</p>
        <div className="mt-4 space-y-3 text-sm">
          {clients.slice(0, 8).map((client) => <div key={client.id} className="rounded-2xl bg-brand-soft p-3">
            <b className="text-brand-primary">{client.name}</b>
            <p className="mt-1 text-brand-muted">{client.email === "-" ? "No email set" : client.email}</p>
            <p className="mt-1 text-xs font-bold text-brand-primary">{client.hasPortalAccess ? "Portal login active" : "No portal password yet"}</p>
          </div>)}
        </div>
      </Card>
    </section>}

    {activeMenu === "Add User" && <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_26rem]">
      <Card className="p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold">{editingUser ? "Edit User Access" : "Add User"}</h3>
            <p className="mt-1 text-sm text-brand-muted">Tick the permissions/access areas this user should see in the system.</p>
          </div>
          <Button type="button" variant="outline" onClick={() => { setEditingUser(null); setActiveMenu("Users List"); }}>Back to List</Button>
        </div>
        <form onSubmit={submitUser} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <FormField label="Name"><input name="name" value={form.name} onChange={updateField} required className={fieldInputClass} /></FormField>
            <FormField label="Email"><input name="email" type="email" value={form.email} onChange={updateField} required className={fieldInputClass} /></FormField>
          </div>
          <FormField label={editingUser ? "New Password (optional)" : "Password"}><input name="password" type="password" value={form.password} onChange={updateField} required={!editingUser} className={fieldInputClass} /></FormField>

          <div>
            <p className="mb-3 text-sm font-bold text-brand-primary">Access Checklist</p>
            <div className="space-y-3">
              {roles.map((role) => {
                const checked = form.role_ids.includes(role.id);
                return <label key={role.id} className={`block cursor-pointer rounded-2xl border p-3 transition ${checked ? "border-brand-primary bg-brand-soft" : "border-brand-border bg-white hover:bg-brand-soft/50"}`}>
                  <div className="flex items-start gap-3">
                    <input type="checkbox" checked={checked} onChange={() => toggleRole(role.id)} className="mt-1 h-5 w-5 rounded border-brand-border accent-brand-primary" />
                    <div>
                      <div className="font-bold text-brand-primary">{role.label || role.name}</div>
                      <div className="mt-1 text-xs text-brand-muted">{(roleAccess[role.name] || (role.permissions || []).map((permission) => permission.label || permission.name) || ["Custom access"]).join(" | ")}</div>
                    </div>
                  </div>
                </label>;
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1">{editingUser ? "Update Access" : "Create User"}</Button>
            {editingUser && <Button type="button" variant="outline" onClick={() => { setEditingUser(null); setForm({ ...emptyForm, role_ids: defaultRoleIds(roles) }); setActiveMenu("Users List"); }}>Cancel</Button>}
          </div>
        </form>
      </Card>

      <Card className="p-4 md:p-5">
        <h3 className="font-bold">Access Guide</h3>
        <p className="mt-1 text-sm text-brand-muted">Use these checks to control the sidebar and protected pages this user can open.</p>
        <div className="mt-4 space-y-3 text-sm">
          {roles.map((role) => <div key={role.id} className="rounded-2xl bg-brand-soft p-3">
            <b className="text-brand-primary">{role.label || role.name}</b>
            <p className="mt-1 text-brand-muted">{(roleAccess[role.name] || ["Custom access"]).join(" | ")}</p>
          </div>)}
        </div>
      </Card>
    </section>}
  </div>;
}

function defaultRoleIds(roles) {
  const viewer = roles.find((role) => role.name === "viewer");
  return viewer ? [viewer.id] : [];
}
