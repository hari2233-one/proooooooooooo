import { useState, useEffect, useCallback } from "react";
import type { CSSProperties, FormEvent } from "react";
// ---------------------------------------------------------------------------
// Types - mirror the backend's Pydantic schemas (app/schemas.py) and enums
// (app/models.py) exactly, so a backend contract change surfaces here as a
// compile error instead of a silent runtime bug.
// ---------------------------------------------------------------------------

type Role = "founder" | "manager" | "telecaller" | "staff";

type CallOutcome = "interested" | "not_interested" | "not_answered";
type InterestedSubOutcome = "callback" | "sales";

interface LoginResponse {
  access_token: string;
  token_type: string;
  role: Role;
  employee_id: string | null;
}

interface MeResponse {
  user_id: string;
  username: string;
  role: Role;
  employee_id: string | null;
}

interface AuthSession extends LoginResponse {
  username?: string;
}

interface EmployeeOut {
  id: string;
  employee_code: string;
  full_name: string;
  designation: string | null;
  is_active: boolean;
}

interface CustomerOut {
  id: string;
  full_name: string;
  phone: string;
  village: string | null;
  crop_type: string | null;
  owner_employee_id: string | null;
}

interface CallOut {
  id: string;
  customer_id: string;
  agent_employee_id: string;
  called_at: string;
  outcome: CallOutcome;
  sub_outcome: InterestedSubOutcome | null;
  callback_datetime: string | null;
  notes: string | null;
}

interface CallCreatePayload {
  customer_id: string;
  agent_employee_id: string;
  outcome: CallOutcome;
  sub_outcome?: InterestedSubOutcome;
  callback_datetime?: string;
  transferred_to_employee_id?: string;
  notes?: string;
}

interface KnowledgeBaseOut {
  id: string;
  crop_type: string;
  problem_description: string;
  recommended_product_id: string | null;
  notes: string | null;
}

interface AuditLogEntry {
  id: string;
  actor_user_id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

interface AttendanceOut {
  id: string;
  employee_id: string;
  attendance_date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
}

interface LeaveTypeOut {
  id: string;
  name: string;
  default_annual_quota: number;
}

interface LeaveRequestOut {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
}

interface PayrollRecordOut {
  id: string;
  employee_id: string;
  effective_from: string;
  basic_salary: number;
  hra: number;
  other_allowances: number;
  pf_deduction: number;
  esi_deduction: number;
  tds_deduction: number;
  remarks: string | null;
  created_at: string;
}

interface PayrollRecordCreatePayload {
  employee_id: string;
  effective_from: string;
  basic_salary: number;
  hra?: number;
  other_allowances?: number;
  pf_deduction?: number;
  esi_deduction?: number;
  tds_deduction?: number;
  remarks?: string;
}

interface LeaveRequestCreatePayload {
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  reason?: string;
}

type SubScreen = "interested_choice" | "callback" | "sales" | null;

// ---------------------------------------------------------------------------
// Design tokens - agri-business ops tool, not a consumer app.
// ---------------------------------------------------------------------------
const colors = {
  bg: "#F6F4EF",
  surface: "#FFFFFF",
  ink: "#201F1B",
  inkMuted: "#6B6A63",
  border: "#E4E1D6",
  green: "#24463A",
  greenDark: "#152B23",
  amber: "#C68A1F",
  amberLight: "#F5E6C8",
  success: "#3F7D52",
  successBg: "#E7F1E9",
  danger: "#A6432E",
  dangerBg: "#F6E7E3",
  neutralBg: "#EFECE2",
} as const;

const ROLE_LABELS: Record<Role, string> = {
  founder: "Founder",
  manager: "Manager",
  telecaller: "Telecaller",
  staff: "Staff",
};

// ---------------------------------------------------------------------------
// Typed API client
// ---------------------------------------------------------------------------
interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  token?: string;
  body?: unknown;
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function apiRequest<T>(baseUrl: string, path: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", token, body } = options;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* empty body is fine, e.g. some 204s */
  }

  if (!res.ok) {
    const detail = (data as { detail?: unknown } | null)?.detail;
    const message = typeof detail === "string" ? detail : detail ? JSON.stringify(detail) : `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }
  return data as T;
}

async function loginRequest(baseUrl: string, username: string, password: string): Promise<LoginResponse> {
  const body = new URLSearchParams();
  body.set("username", username);
  body.set("password", password);
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new ApiError(data.detail || "Login failed", res.status);
  return data as LoginResponse;
}

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 12px",
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  fontSize: 14,
  outline: "none",
  fontFamily: "inherit",
};

const outcomeBtnStyle: CSSProperties = {
  flex: 1,
  padding: "12px 0",
  borderRadius: 8,
  border: "none",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
};

// ---------------------------------------------------------------------------
// Login screen
// ---------------------------------------------------------------------------
interface LoginScreenProps {
  baseUrl: string;
  setBaseUrl: (url: string) => void;
  onLogin: (session: LoginResponse) => void;
}

function LoginScreen({ baseUrl, setBaseUrl, onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Enter username and password.");
      return;
    }
    setError("");
    setLoading(true);
    loginRequest(baseUrl, username.trim(), password)
      .then(onLogin)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: colors.bg,
        fontFamily: "Inter, system-ui, sans-serif",
        color: colors.ink,
      }}
    >
      <div style={{ width: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              background: colors.green,
              margin: "0 auto 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.amberLight,
              fontWeight: 600,
              fontSize: 20,
            }}
          >
            G
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.2 }}>GROTEC FarmerOS</div>
          <div style={{ fontSize: 13, color: colors.inkMuted, marginTop: 4 }}>Sign in to continue</div>
        </div>

        <form
          onSubmit={submit}
          style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 24 }}
        >
          <label style={{ fontSize: 13, color: colors.inkMuted, display: "block", marginBottom: 6 }}>Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="priya" style={inputStyle} />

          <label style={{ fontSize: 13, color: colors.inkMuted, display: "block", margin: "14px 0 6px" }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={inputStyle}
          />

          {error && <div style={{ color: colors.danger, fontSize: 13, marginTop: 12 }}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 18,
              width: "100%",
              padding: "10px 0",
              borderRadius: 8,
              border: "none",
              background: colors.green,
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button
            type="button"
            onClick={() => setShowSettings((s) => !s)}
            style={{ background: "none", border: "none", color: colors.inkMuted, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}
          >
            API endpoint settings
          </button>
        </div>

        {showSettings && (
          <div style={{ marginTop: 10 }}>
            <label style={{ fontSize: 12, color: colors.inkMuted, display: "block", marginBottom: 4 }}>
              Backend base URL (run the FastAPI server locally, then point this here)
            </label>
            <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} style={{ ...inputStyle, fontSize: 12 }} />
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: colors.inkMuted }}>
          Demo accounts: priya / priya123 (telecaller) · arun / arun123 (manager) · karthik / karthik123 (founder)
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------
interface SidebarItem {
  id: string;
  label: string;
  roles: Role[];
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "workspace", label: "Agent workspace", roles: ["founder", "manager", "telecaller"] },
  { id: "customers", label: "Customers", roles: ["founder", "manager", "telecaller"] },
  { id: "callbacks", label: "My callbacks", roles: ["founder", "manager", "telecaller"] },
  { id: "employees", label: "Employees", roles: ["founder", "manager", "staff"] },
  { id: "payroll", label: "Payroll", roles: ["founder", "manager", "staff"] },
  { id: "attendance", label: "Attendance", roles: ["founder", "manager", "staff"] },
  { id: "leave", label: "Leave requests", roles: ["founder", "manager", "staff"] },
  { id: "audit", label: "Audit log", roles: ["founder"] },
];

interface SidebarProps {
  role: Role;
  active: string;
  setActive: (id: string) => void;
  username: string;
  onLogout: () => void;
}

function Sidebar({ role, active, setActive, username, onLogout }: SidebarProps) {
  const visible = SIDEBAR_ITEMS.filter((i) => i.roles.includes(role));

  return (
    <div style={{ width: 220, background: colors.greenDark, color: "#fff", display: "flex", flexDirection: "column", padding: "20px 14px", boxSizing: "border-box" }}>
      <div style={{ fontSize: 15, fontWeight: 600, padding: "0 8px 24px", letterSpacing: -0.2 }}>GROTEC FarmerOS</div>
      <div style={{ flex: 1 }}>
        {visible.map((item) => (
          <div
            key={item.id}
            onClick={() => setActive(item.id)}
            style={{
              padding: "9px 12px",
              borderRadius: 7,
              fontSize: 14,
              cursor: "pointer",
              marginBottom: 2,
              background: active === item.id ? "rgba(255,255,255,0.12)" : "transparent",
              color: active === item.id ? "#fff" : "rgba(255,255,255,0.75)",
            }}
          >
            {item.label}
          </div>
        ))}
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{username}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 10 }}>{ROLE_LABELS[role] ?? role}</div>
        <button
          onClick={onLogout}
          style={{ width: "100%", padding: "7px 0", borderRadius: 7, border: "1px solid rgba(255,255,255,0.25)", background: "transparent", color: "#fff", fontSize: 13, cursor: "pointer" }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Agent Workspace - the PRD's #1 priority screen.
// Dial -> view customer -> record outcome -> next step.
// ---------------------------------------------------------------------------
interface AgentWorkspaceProps {
  baseUrl: string;
  token: string;
  employeeId: string;
  employees: EmployeeOut[];
}

function AgentWorkspace({ baseUrl, token, employeeId, employees }: AgentWorkspaceProps) {
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<CustomerOut[]>([]);
  const [selected, setSelected] = useState<CustomerOut | null>(null);
  const [history, setHistory] = useState<CallOut[]>([]);
  const [kbResults, setKbResults] = useState<KnowledgeBaseOut[]>([]);
  const [notes, setNotes] = useState("");
  const [subScreen, setSubScreen] = useState<SubScreen>(null);
  const [callbackTime, setCallbackTime] = useState("");
  const [rmId, setRmId] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const loadCustomers = useCallback(() => {
    apiRequest<CustomerOut[]>(baseUrl, `/customers${search ? `?search=${encodeURIComponent(search)}` : ""}`, { token })
      .then(setCustomers)
      .catch((err: Error) => setError(err.message));
  }, [baseUrl, token, search]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const selectCustomer = (cust: CustomerOut) => {
    setSelected(cust);
    setSubScreen(null);
    setNotes("");
    setStatus("");
    setError("");
    apiRequest<CallOut[]>(baseUrl, `/customers/${cust.id}/calls`, { token })
      .then(setHistory)
      .catch((err: Error) => setError(err.message));
    if (cust.crop_type) {
      apiRequest<KnowledgeBaseOut[]>(baseUrl, `/knowledge-base/search?crop_type=${encodeURIComponent(cust.crop_type)}`, { token })
        .then(setKbResults)
        .catch(() => setKbResults([]));
    } else {
      setKbResults([]);
    }
  };

  const recordCall = (outcome: CallOutcome, subOutcome?: InterestedSubOutcome) => {
    if (!selected) return;
    setError("");

    if (outcome === "interested" && subOutcome === "callback" && !callbackTime) {
      setError("Pick a callback date and time first.");
      return;
    }
    if (outcome === "interested" && subOutcome === "sales" && !rmId) {
      setError("Choose which relationship manager to transfer to.");
      return;
    }

    const payload: CallCreatePayload = {
      customer_id: selected.id,
      agent_employee_id: employeeId,
      outcome,
      notes: notes || undefined,
    };
    if (outcome === "interested" && subOutcome) {
      payload.sub_outcome = subOutcome;
      if (subOutcome === "callback") payload.callback_datetime = new Date(callbackTime).toISOString();
      if (subOutcome === "sales") payload.transferred_to_employee_id = rmId;
    }

    setLoading(true);
    apiRequest<CallOut>(baseUrl, "/calls", { method: "POST", token, body: payload })
      .then(() => {
        setStatus("Call recorded.");
        setSubScreen(null);
        setNotes("");
        setCallbackTime("");
        setRmId("");
        selectCustomer(selected);
        loadCustomers();
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  return (
    <div style={{ display: "flex", height: "100%" }}>
      {/* Customer list / dial queue */}
      <div style={{ width: 300, borderRight: `1px solid ${colors.border}`, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 16, borderBottom: `1px solid ${colors.border}` }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or phone" style={inputStyle} />
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {customers.map((c) => (
            <div
              key={c.id}
              onClick={() => selectCustomer(c)}
              style={{
                padding: "12px 16px",
                cursor: "pointer",
                borderBottom: `1px solid ${colors.border}`,
                background: selected?.id === c.id ? colors.amberLight : "transparent",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 500 }}>{c.full_name}</div>
              <div style={{ fontSize: 12, color: colors.inkMuted }}>
                {c.phone} {c.crop_type ? `· ${c.crop_type}` : ""}
              </div>
            </div>
          ))}
          {customers.length === 0 && <div style={{ padding: 16, fontSize: 13, color: colors.inkMuted }}>No customers found.</div>}
        </div>
      </div>

      {/* Full-screen calling workspace */}
      <div style={{ flex: 1, padding: 28, overflowY: "auto" }}>
        {!selected ? (
          <div style={{ color: colors.inkMuted, fontSize: 14 }}>Pick a customer from the list to start the call.</div>
        ) : (
          <div style={{ maxWidth: 640 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 600 }}>{selected.full_name}</div>
                <div style={{ fontSize: 14, color: colors.inkMuted, marginTop: 2 }}>
                  {selected.phone} · {selected.village || "No village on file"} · {selected.crop_type || "Crop not set"}
                </div>
              </div>
              <div style={{ padding: "6px 14px", borderRadius: 20, background: colors.successBg, color: colors.success, fontSize: 13, fontWeight: 500 }}>
                Connected
              </div>
            </div>

            {kbResults.length > 0 && (
              <div style={{ marginTop: 20, background: colors.amberLight, border: `1px solid ${colors.amber}`, borderRadius: 8, padding: "12px 16px" }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: colors.amber, marginBottom: 4 }}>
                  Suggested for {selected.crop_type}
                </div>
                {kbResults.map((k) => (
                  <div key={k.id} style={{ fontSize: 13, marginBottom: 4 }}>
                    {k.problem_description} — {k.notes}
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: colors.inkMuted, marginBottom: 8 }}>Call history</div>
              {history.length === 0 ? (
                <div style={{ fontSize: 13, color: colors.inkMuted }}>No previous calls.</div>
              ) : (
                history.map((h) => (
                  <div key={h.id} style={{ padding: "8px 0", borderBottom: `1px solid ${colors.border}`, fontSize: 13, display: "flex", justifyContent: "space-between" }}>
                    <span>
                      {h.outcome}
                      {h.sub_outcome ? ` → ${h.sub_outcome}` : ""}
                      {h.notes ? ` — ${h.notes}` : ""}
                    </span>
                    <span style={{ color: colors.inkMuted }}>{new Date(h.called_at).toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>

            <div style={{ marginTop: 20 }}>
              <label style={{ fontSize: 13, color: colors.inkMuted, display: "block", marginBottom: 6 }}>Notes for this call</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
            </div>

            {error && <div style={{ color: colors.danger, fontSize: 13, marginTop: 12 }}>{error}</div>}
            {status && <div style={{ color: colors.success, fontSize: 13, marginTop: 12 }}>{status}</div>}

            {!subScreen && (
              <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
                <button disabled={loading} onClick={() => setSubScreen("interested_choice")} style={{ ...outcomeBtnStyle, background: colors.success, color: "#fff" }}>
                  Interested
                </button>
                <button disabled={loading} onClick={() => recordCall("not_interested")} style={{ ...outcomeBtnStyle, background: colors.dangerBg, color: colors.danger }}>
                  Not interested
                </button>
                <button disabled={loading} onClick={() => recordCall("not_answered")} style={{ ...outcomeBtnStyle, background: colors.neutralBg, color: colors.ink }}>
                  Not answered
                </button>
              </div>
            )}

            {subScreen === "interested_choice" && (
              <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: 13, color: colors.inkMuted, marginBottom: 10 }}>Interested — what's next?</div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setSubScreen("callback")} style={{ ...outcomeBtnStyle, background: colors.green, color: "#fff" }}>
                    Schedule callback
                  </button>
                  <button onClick={() => setSubScreen("sales")} style={{ ...outcomeBtnStyle, background: colors.green, color: "#fff" }}>
                    Transfer to sales
                  </button>
                </div>
              </div>
            )}

            {subScreen === "callback" && (
              <div style={{ marginTop: 20 }}>
                <label style={{ fontSize: 13, color: colors.inkMuted, display: "block", marginBottom: 6 }}>Callback date and time</label>
                <input type="datetime-local" value={callbackTime} onChange={(e) => setCallbackTime(e.target.value)} style={inputStyle} />
                <button disabled={loading} onClick={() => recordCall("interested", "callback")} style={{ ...outcomeBtnStyle, marginTop: 12, background: colors.green, color: "#fff" }}>
                  Confirm callback
                </button>
              </div>
            )}

            {subScreen === "sales" && (
              <div style={{ marginTop: 20 }}>
                <label style={{ fontSize: 13, color: colors.inkMuted, display: "block", marginBottom: 6 }}>Relationship manager to receive this lead</label>
                <select value={rmId} onChange={(e) => setRmId(e.target.value)} style={inputStyle}>
                  <option value="">Choose an RM</option>
                  {employees
                    .filter((e) => e.id !== employeeId)
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.full_name} ({e.designation || "Employee"})
                      </option>
                    ))}
                </select>
                <button disabled={loading} onClick={() => recordCall("interested", "sales")} style={{ ...outcomeBtnStyle, marginTop: 12, background: colors.green, color: "#fff" }}>
                  Confirm transfer
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Customers list (browse, not calling)
// ---------------------------------------------------------------------------
function CustomersScreen({ baseUrl, token }: { baseUrl: string; token: string }) {
  const [customers, setCustomers] = useState<CustomerOut[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<CustomerOut[]>(baseUrl, "/customers", { token }).then(setCustomers).catch((e: Error) => setError(e.message));
  }, [baseUrl, token]);

  return (
    <div style={{ padding: 28 }}>
      <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Customers</div>
      {error && <div style={{ color: colors.danger, fontSize: 13 }}>{error}</div>}
      <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10 }}>
        {customers.map((c, i) => (
          <div key={c.id} style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", borderBottom: i < customers.length - 1 ? `1px solid ${colors.border}` : "none" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{c.full_name}</div>
              <div style={{ fontSize: 12, color: colors.inkMuted }}>{c.phone}</div>
            </div>
            <div style={{ fontSize: 13, color: colors.inkMuted }}>{c.crop_type || "-"}</div>
          </div>
        ))}
        {customers.length === 0 && <div style={{ padding: 16, fontSize: 13, color: colors.inkMuted }}>No customers yet.</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Callbacks screen
// ---------------------------------------------------------------------------
function CallbacksScreen({ baseUrl, token, employeeId }: { baseUrl: string; token: string; employeeId: string }) {
  const [callbacks, setCallbacks] = useState<CallOut[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<CallOut[]>(baseUrl, `/agents/${employeeId}/callbacks`, { token }).then(setCallbacks).catch((e: Error) => setError(e.message));
  }, [baseUrl, token, employeeId]);

  return (
    <div style={{ padding: 28 }}>
      <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>My upcoming callbacks</div>
      {error && <div style={{ color: colors.danger, fontSize: 13 }}>{error}</div>}
      {callbacks.length === 0 ? (
        <div style={{ fontSize: 13, color: colors.inkMuted }}>Nothing scheduled.</div>
      ) : (
        callbacks.map((c) => (
          <div key={c.id} style={{ padding: "12px 16px", background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8, marginBottom: 8, fontSize: 13 }}>
            {c.callback_datetime ? new Date(c.callback_datetime).toLocaleString() : "No time set"} — {c.notes || "No notes"}
          </div>
        ))
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Audit log screen (founder only - enforced by backend, and by sidebar visibility)
// ---------------------------------------------------------------------------
function AuditScreen({ baseUrl, token }: { baseUrl: string; token: string }) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<AuditLogEntry[]>(baseUrl, "/audit-logs", { token }).then(setLogs).catch((e: Error) => setError(e.message));
  }, [baseUrl, token]);

  return (
    <div style={{ padding: 28 }}>
      <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Audit log</div>
      {error && <div style={{ color: colors.danger, fontSize: 13 }}>{error}</div>}
      {logs.length === 0 ? (
        <div style={{ fontSize: 13, color: colors.inkMuted }}>No audit entries yet.</div>
      ) : (
        logs.map((l) => (
          <div key={l.id} style={{ fontSize: 13, padding: "8px 0", borderBottom: `1px solid ${colors.border}` }}>
            {l.action} — {new Date(l.created_at).toLocaleString()}
          </div>
        ))
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Employees list (HRMS) - a picker for the Payroll/Attendance screens below.
// ---------------------------------------------------------------------------
interface EmployeesScreenProps {
  baseUrl: string;
  token: string;
  onSelect: (emp: EmployeeOut) => void;
  selectedId: string | null;
}

function EmployeesScreen({ baseUrl, token, onSelect, selectedId }: EmployeesScreenProps) {
  const [employees, setEmployees] = useState<EmployeeOut[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<EmployeeOut[]>(baseUrl, "/employees", { token }).then(setEmployees).catch((e: Error) => setError(e.message));
  }, [baseUrl, token]);

  return (
    <div style={{ padding: 28 }}>
      <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 6 }}>Employees</div>
      <div style={{ fontSize: 13, color: colors.inkMuted, marginBottom: 16 }}>
        Pick an employee, then open Payroll or Attendance to see their records.
      </div>
      {error && <div style={{ color: colors.danger, fontSize: 13 }}>{error}</div>}
      <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10 }}>
        {employees.map((e, i) => (
          <div
            key={e.id}
            onClick={() => onSelect(e)}
            style={{
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              cursor: "pointer",
              background: selectedId === e.id ? colors.amberLight : "transparent",
              borderBottom: i < employees.length - 1 ? `1px solid ${colors.border}` : "none",
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{e.full_name}</div>
              <div style={{ fontSize: 12, color: colors.inkMuted }}>{e.employee_code}</div>
            </div>
            <div style={{ fontSize: 13, color: colors.inkMuted }}>{e.designation || "-"}</div>
          </div>
        ))}
        {employees.length === 0 && <div style={{ padding: 16, fontSize: 13, color: colors.inkMuted }}>No employees yet.</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payroll - version-wise. Every revision is shown, nothing is ever overwritten.
// ---------------------------------------------------------------------------
interface PayrollScreenProps {
  baseUrl: string;
  token: string;
  employees: EmployeeOut[];
  selectedEmployee: EmployeeOut | null;
  onSelectEmployee: (emp: EmployeeOut) => void;
}

function PayrollScreen({ baseUrl, token, employees, selectedEmployee, onSelectEmployee }: PayrollScreenProps) {
  const [history, setHistory] = useState<PayrollRecordOut[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [basicSalary, setBasicSalary] = useState("");
  const [hra, setHra] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  const loadHistory = useCallback(
    (empId: string) => {
      apiRequest<PayrollRecordOut[]>(baseUrl, `/employees/${empId}/payroll`, { token })
        .then(setHistory)
        .catch((e: Error) => {
          setHistory([]);
          setError(e.message);
        });
    },
    [baseUrl, token]
  );

  useEffect(() => {
    if (selectedEmployee) {
      setError("");
      loadHistory(selectedEmployee.id);
    }
  }, [selectedEmployee, loadHistory]);

  const submitRevision = () => {
    if (!selectedEmployee) return;
    const salary = parseFloat(basicSalary);
    if (!effectiveFrom || isNaN(salary) || salary < 0) {
      setError("Enter a valid effective date and a non-negative basic salary.");
      return;
    }
    const payload: PayrollRecordCreatePayload = {
      employee_id: selectedEmployee.id,
      effective_from: effectiveFrom,
      basic_salary: salary,
      hra: hra ? parseFloat(hra) : 0,
      remarks: remarks || undefined,
    };
    setSaving(true);
    setError("");
    apiRequest<PayrollRecordOut>(baseUrl, `/employees/${selectedEmployee.id}/payroll`, { method: "POST", token, body: payload })
      .then(() => {
        setStatus("New payroll revision saved — this is a new row, the old one is preserved.");
        setShowForm(false);
        setEffectiveFrom("");
        setBasicSalary("");
        setHra("");
        setRemarks("");
        loadHistory(selectedEmployee.id);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setSaving(false));
  };

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <div style={{ width: 260, borderRight: `1px solid ${colors.border}`, overflowY: "auto" }}>
        <div style={{ padding: "16px 16px 8px", fontSize: 12, fontWeight: 500, color: colors.inkMuted }}>EMPLOYEE</div>
        {employees.map((e) => (
          <div
            key={e.id}
            onClick={() => onSelectEmployee(e)}
            style={{
              padding: "10px 16px",
              cursor: "pointer",
              fontSize: 14,
              background: selectedEmployee?.id === e.id ? colors.amberLight : "transparent",
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            {e.full_name}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, padding: 28, overflowY: "auto" }}>
        {!selectedEmployee ? (
          <div style={{ color: colors.inkMuted, fontSize: 14 }}>Pick an employee to see their payroll history.</div>
        ) : (
          <div style={{ maxWidth: 560 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{selectedEmployee.full_name} — Payroll</div>
              <button
                onClick={() => setShowForm((s) => !s)}
                style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: colors.green, color: "#fff", fontSize: 13, cursor: "pointer" }}
              >
                {showForm ? "Cancel" : "New revision"}
              </button>
            </div>

            {showForm && (
              <div style={{ marginTop: 16, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 16 }}>
                <label style={{ fontSize: 12, color: colors.inkMuted, display: "block", marginBottom: 4 }}>Effective from</label>
                <input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} style={inputStyle} />

                <label style={{ fontSize: 12, color: colors.inkMuted, display: "block", margin: "12px 0 4px" }}>Basic salary (₹/month)</label>
                <input type="number" min="0" value={basicSalary} onChange={(e) => setBasicSalary(e.target.value)} style={inputStyle} />

                <label style={{ fontSize: 12, color: colors.inkMuted, display: "block", margin: "12px 0 4px" }}>HRA (₹/month, optional)</label>
                <input type="number" min="0" value={hra} onChange={(e) => setHra(e.target.value)} style={inputStyle} />

                <label style={{ fontSize: 12, color: colors.inkMuted, display: "block", margin: "12px 0 4px" }}>Remarks (optional)</label>
                <input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. Annual increment" style={inputStyle} />

                <button
                  disabled={saving}
                  onClick={submitRevision}
                  style={{ marginTop: 14, padding: "9px 16px", borderRadius: 8, border: "none", background: colors.green, color: "#fff", fontSize: 13, cursor: "pointer" }}
                >
                  {saving ? "Saving..." : "Save revision"}
                </button>
              </div>
            )}

            {error && <div style={{ color: colors.danger, fontSize: 13, marginTop: 12 }}>{error}</div>}
            {status && <div style={{ color: colors.success, fontSize: 13, marginTop: 12 }}>{status}</div>}

            <div style={{ marginTop: 20, fontSize: 13, fontWeight: 500, color: colors.inkMuted }}>
              Revision history ({history.length})
            </div>
            {history.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.inkMuted, marginTop: 8 }}>No payroll records yet.</div>
            ) : (
              history.map((h) => (
                <div key={h.id} style={{ marginTop: 10, padding: "12px 16px", background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>₹{h.basic_salary.toLocaleString("en-IN")} basic</span>
                    <span style={{ fontSize: 12, color: colors.inkMuted }}>from {h.effective_from}</span>
                  </div>
                  <div style={{ fontSize: 12, color: colors.inkMuted, marginTop: 2 }}>
                    HRA ₹{h.hra.toLocaleString("en-IN")} {h.remarks ? `— ${h.remarks}` : ""}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Attendance - HRMS system-of-record view.
// ---------------------------------------------------------------------------
interface AttendanceScreenProps {
  baseUrl: string;
  token: string;
  employees: EmployeeOut[];
  selectedEmployee: EmployeeOut | null;
  onSelectEmployee: (emp: EmployeeOut) => void;
}

function AttendanceScreen({ baseUrl, token, employees, selectedEmployee, onSelectEmployee }: AttendanceScreenProps) {
  const [records, setRecords] = useState<AttendanceOut[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedEmployee) return;
    setError("");
    apiRequest<AttendanceOut[]>(baseUrl, `/employees/${selectedEmployee.id}/attendance`, { token })
      .then(setRecords)
      .catch((e: Error) => {
        setRecords([]);
        setError(e.message);
      });
  }, [baseUrl, token, selectedEmployee]);

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <div style={{ width: 260, borderRight: `1px solid ${colors.border}`, overflowY: "auto" }}>
        <div style={{ padding: "16px 16px 8px", fontSize: 12, fontWeight: 500, color: colors.inkMuted }}>EMPLOYEE</div>
        {employees.map((e) => (
          <div
            key={e.id}
            onClick={() => onSelectEmployee(e)}
            style={{
              padding: "10px 16px",
              cursor: "pointer",
              fontSize: 14,
              background: selectedEmployee?.id === e.id ? colors.amberLight : "transparent",
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            {e.full_name}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, padding: 28, overflowY: "auto" }}>
        {!selectedEmployee ? (
          <div style={{ color: colors.inkMuted, fontSize: 14 }}>Pick an employee to see their attendance.</div>
        ) : (
          <div style={{ maxWidth: 560 }}>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>{selectedEmployee.full_name} — Attendance</div>
            <div style={{ fontSize: 12, color: colors.inkMuted, marginBottom: 16 }}>
              HRMS is the system of record. ESSL biometric sync feeds this once the vendor is confirmed.
            </div>
            {error && <div style={{ color: colors.danger, fontSize: 13 }}>{error}</div>}
            {records.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.inkMuted }}>No attendance records yet.</div>
            ) : (
              records.map((r) => (
                <div
                  key={r.id}
                  style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${colors.border}`, fontSize: 13 }}
                >
                  <span>{r.attendance_date}</span>
                  <span style={{ color: colors.inkMuted }}>
                    {r.check_in ? new Date(r.check_in).toLocaleTimeString() : "—"} →{" "}
                    {r.check_out ? new Date(r.check_out).toLocaleTimeString() : "—"}
                  </span>
                  <span
                    style={{
                      padding: "2px 10px",
                      borderRadius: 12,
                      fontSize: 12,
                      background: r.status === "present" ? colors.successBg : colors.neutralBg,
                      color: r.status === "present" ? colors.success : colors.ink,
                    }}
                  >
                    {r.status}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Leave requests - list, file new, approve/reject.
// ---------------------------------------------------------------------------
interface LeaveScreenProps {
  baseUrl: string;
  token: string;
  employees: EmployeeOut[];
  selectedEmployee: EmployeeOut | null;
  onSelectEmployee: (emp: EmployeeOut) => void;
}

function LeaveScreen({ baseUrl, token, employees, selectedEmployee, onSelectEmployee }: LeaveScreenProps) {
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeOut[]>([]);
  const [requests, setRequests] = useState<LeaveRequestOut[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<LeaveTypeOut[]>(baseUrl, "/leave-types", { token }).then(setLeaveTypes).catch(() => {});
  }, [baseUrl, token]);

  const loadRequests = useCallback(
    (empId: string) => {
      apiRequest<LeaveRequestOut[]>(baseUrl, `/employees/${empId}/leave-requests`, { token })
        .then(setRequests)
        .catch((e: Error) => {
          setRequests([]);
          setError(e.message);
        });
    },
    [baseUrl, token]
  );

  useEffect(() => {
    if (selectedEmployee) {
      setError("");
      loadRequests(selectedEmployee.id);
    }
  }, [selectedEmployee, loadRequests]);

  const submitRequest = () => {
    if (!selectedEmployee) return;
    if (!leaveTypeId || !startDate || !endDate) {
      setError("Pick a leave type and both dates.");
      return;
    }
    const payload: LeaveRequestCreatePayload = {
      employee_id: selectedEmployee.id,
      leave_type_id: leaveTypeId,
      start_date: startDate,
      end_date: endDate,
      reason: reason || undefined,
    };
    setSaving(true);
    setError("");
    apiRequest(baseUrl, "/leave-requests", { method: "POST", token, body: payload })
      .then(() => {
        setStatus("Leave request filed.");
        setShowForm(false);
        setLeaveTypeId("");
        setStartDate("");
        setEndDate("");
        setReason("");
        loadRequests(selectedEmployee.id);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setSaving(false));
  };

  const decide = (leaveId: string, approve: boolean) => {
    if (!selectedEmployee) return;
    setDecidingId(leaveId);
    setError("");
    apiRequest(baseUrl, `/leave-requests/${leaveId}/decision?approve=${approve}`, { method: "POST", token })
      .then(() => {
        setStatus(approve ? "Leave approved." : "Leave rejected.");
        loadRequests(selectedEmployee.id);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setDecidingId(null));
  };

  const leaveTypeName = (id: string) => leaveTypes.find((lt) => lt.id === id)?.name ?? "Leave";

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <div style={{ width: 260, borderRight: `1px solid ${colors.border}`, overflowY: "auto" }}>
        <div style={{ padding: "16px 16px 8px", fontSize: 12, fontWeight: 500, color: colors.inkMuted }}>EMPLOYEE</div>
        {employees.map((e) => (
          <div
            key={e.id}
            onClick={() => onSelectEmployee(e)}
            style={{
              padding: "10px 16px",
              cursor: "pointer",
              fontSize: 14,
              background: selectedEmployee?.id === e.id ? colors.amberLight : "transparent",
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            {e.full_name}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, padding: 28, overflowY: "auto" }}>
        {!selectedEmployee ? (
          <div style={{ color: colors.inkMuted, fontSize: 14 }}>Pick an employee to see their leave requests.</div>
        ) : (
          <div style={{ maxWidth: 560 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{selectedEmployee.full_name} — Leave</div>
              <button
                onClick={() => setShowForm((s) => !s)}
                style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: colors.green, color: "#fff", fontSize: 13, cursor: "pointer" }}
              >
                {showForm ? "Cancel" : "File request"}
              </button>
            </div>

            {showForm && (
              <div style={{ marginTop: 16, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 16 }}>
                <label style={{ fontSize: 12, color: colors.inkMuted, display: "block", marginBottom: 4 }}>Leave type</label>
                <select value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)} style={inputStyle}>
                  <option value="">Choose a leave type</option>
                  {leaveTypes.map((lt) => (
                    <option key={lt.id} value={lt.id}>
                      {lt.name} ({lt.default_annual_quota} days/year)
                    </option>
                  ))}
                </select>

                <label style={{ fontSize: 12, color: colors.inkMuted, display: "block", margin: "12px 0 4px" }}>Start date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />

                <label style={{ fontSize: 12, color: colors.inkMuted, display: "block", margin: "12px 0 4px" }}>End date</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />

                <label style={{ fontSize: 12, color: colors.inkMuted, display: "block", margin: "12px 0 4px" }}>Reason (optional)</label>
                <input value={reason} onChange={(e) => setReason(e.target.value)} style={inputStyle} />

                <button
                  disabled={saving}
                  onClick={submitRequest}
                  style={{ marginTop: 14, padding: "9px 16px", borderRadius: 8, border: "none", background: colors.green, color: "#fff", fontSize: 13, cursor: "pointer" }}
                >
                  {saving ? "Filing..." : "File request"}
                </button>
              </div>
            )}

            {error && <div style={{ color: colors.danger, fontSize: 13, marginTop: 12 }}>{error}</div>}
            {status && <div style={{ color: colors.success, fontSize: 13, marginTop: 12 }}>{status}</div>}

            <div style={{ marginTop: 20, fontSize: 13, fontWeight: 500, color: colors.inkMuted }}>
              Requests ({requests.length})
            </div>
            {requests.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.inkMuted, marginTop: 8 }}>No leave requests yet.</div>
            ) : (
              requests.map((r) => (
                <div key={r.id} style={{ marginTop: 10, padding: "12px 16px", background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{leaveTypeName(r.leave_type_id)}</div>
                      <div style={{ fontSize: 12, color: colors.inkMuted, marginTop: 2 }}>
                        {r.start_date} → {r.end_date} {r.reason ? `— ${r.reason}` : ""}
                      </div>
                    </div>
                    {r.status === "pending" ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          disabled={decidingId === r.id}
                          onClick={() => decide(r.id, true)}
                          style={{ padding: "5px 10px", borderRadius: 6, border: "none", background: colors.successBg, color: colors.success, fontSize: 12, cursor: "pointer" }}
                        >
                          Approve
                        </button>
                        <button
                          disabled={decidingId === r.id}
                          onClick={() => decide(r.id, false)}
                          style={{ padding: "5px 10px", borderRadius: 6, border: "none", background: colors.dangerBg, color: colors.danger, fontSize: 12, cursor: "pointer" }}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: 12,
                          fontSize: 12,
                          background: r.status === "approved" ? colors.successBg : colors.dangerBg,
                          color: r.status === "approved" ? colors.success : colors.danger,
                        }}
                      >
                        {r.status}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root app
// ---------------------------------------------------------------------------
export default function App() {
  const [baseUrl, setBaseUrl] = useState("http://localhost:8000");
  const [auth, setAuth] = useState<AuthSession | null>(null);

  if (!auth) {
    return <LoginScreen baseUrl={baseUrl} setBaseUrl={setBaseUrl} onLogin={(session) => setAuth(session)} />;
  }

  return <AuthedApp baseUrl={baseUrl} auth={auth} setAuth={setAuth} />;
}

interface AuthedAppProps {
  baseUrl: string;
  auth: AuthSession;
  setAuth: (session: AuthSession | null) => void;
}

function AuthedApp({ baseUrl, auth, setAuth }: AuthedAppProps) {
  const [active, setActive] = useState("workspace");
  const [employees, setEmployees] = useState<EmployeeOut[]>([]);
  const [username, setUsername] = useState<string | null>(null);
  const [connError, setConnError] = useState("");
  const [hrmsSelectedEmployee, setHrmsSelectedEmployee] = useState<EmployeeOut | null>(null);

  useEffect(() => {
    apiRequest<EmployeeOut[]>(baseUrl, "/employees", { token: auth.access_token })
      .then(setEmployees)
      .catch((e: Error) => setConnError(e.message));
  }, [baseUrl, auth.access_token]);

  useEffect(() => {
    apiRequest<MeResponse>(baseUrl, "/auth/me", { token: auth.access_token })
      .then((me) => setUsername(me.username))
      .catch(() => {});
  }, [baseUrl, auth.access_token]);

  if (!auth.employee_id) {
    return (
      <div style={{ padding: 40, fontFamily: "Inter, system-ui, sans-serif" }}>
        This account has no linked employee record — contact an admin to fix your user setup.
      </div>
    );
  }
  const employeeId = auth.employee_id;

  return (
    <div style={{ display: "flex", height: "100vh", background: colors.bg, fontFamily: "Inter, system-ui, sans-serif", color: colors.ink }}>
      <Sidebar role={auth.role} active={active} setActive={setActive} username={username || "..."} onLogout={() => setAuth(null)} />
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {connError && (
          <div style={{ padding: "8px 16px", background: colors.dangerBg, color: colors.danger, fontSize: 13 }}>
            Could not reach the backend at {baseUrl} — {connError}. Make sure the FastAPI server is running locally.
          </div>
        )}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {active === "workspace" && <AgentWorkspace baseUrl={baseUrl} token={auth.access_token} employeeId={employeeId} employees={employees} />}
          {active === "customers" && <CustomersScreen baseUrl={baseUrl} token={auth.access_token} />}
          {active === "callbacks" && <CallbacksScreen baseUrl={baseUrl} token={auth.access_token} employeeId={employeeId} />}
          {active === "employees" && (
            <EmployeesScreen
              baseUrl={baseUrl}
              token={auth.access_token}
              selectedId={hrmsSelectedEmployee?.id ?? null}
              onSelect={setHrmsSelectedEmployee}
            />
          )}
          {active === "payroll" && (
            <PayrollScreen
              baseUrl={baseUrl}
              token={auth.access_token}
              employees={employees}
              selectedEmployee={hrmsSelectedEmployee}
              onSelectEmployee={setHrmsSelectedEmployee}
            />
          )}
          {active === "attendance" && (
            <AttendanceScreen
              baseUrl={baseUrl}
              token={auth.access_token}
              employees={employees}
              selectedEmployee={hrmsSelectedEmployee}
              onSelectEmployee={setHrmsSelectedEmployee}
            />
          )}
          {active === "leave" && (
            <LeaveScreen
              baseUrl={baseUrl}
              token={auth.access_token}
              employees={employees}
              selectedEmployee={hrmsSelectedEmployee}
              onSelectEmployee={setHrmsSelectedEmployee}
            />
          )}
          {active === "audit" && <AuditScreen baseUrl={baseUrl} token={auth.access_token} />}
        </div>
      </div>
    </div>
  );
}
