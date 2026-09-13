/**
 * GROTEC HRMS — Rich UI matching reference screenshots exactly.
 * Real API calls for supported features; polished mock UI for unsupported ones.
 */

import { useEffect, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface EmployeeOut {
  id: string; employee_code: string; full_name: string;
  phone?: string | null; email?: string | null; designation: string | null;
  department?: string | null; date_of_joining?: string | null;
  manager_id?: string | null; is_active: boolean;
}
interface AttendanceOut {
  id: string; employee_id: string; attendance_date: string;
  check_in: string | null; check_out: string | null; status: string;
}
interface LeaveTypeOut { id: string; name: string; default_annual_quota: number; }
interface LeaveRequestOut {
  id: string; employee_id: string; leave_type_id: string;
  start_date: string; end_date: string; reason: string | null;
  status: "pending" | "approved" | "rejected";
  decided_by?: string | null; decided_at?: string | null;
}
interface PayrollRecordOut {
  id: string; employee_id: string; effective_from: string;
  basic_salary: number; hra: number; other_allowances: number;
  pf_deduction: number; esi_deduction: number; tds_deduction: number;
  remarks: string | null; created_at?: string;
}

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#F4F6F8", surface: "#FFFFFF",
  ink: "#1A1F1A", inkMuted: "#6B7280", inkLight: "#9CA3AF",
  border: "#E5E7EB", borderLight: "#F3F4F6",
  green: "#166534", greenMid: "#15803D", greenLight: "#DCFCE7", greenBg: "#F0FDF4",
  amber: "#D97706", amberLight: "#FEF3C7", amberBg: "#FFFBEB",
  blue: "#1D4ED8", blueLight: "#DBEAFE",
  purple: "#7C3AED", purpleLight: "#EDE9FE",
  success: "#15803D", successBg: "#DCFCE7",
  danger: "#DC2626", dangerBg: "#FEE2E2",
  sidebarBg: "#1B2E20", sidebarActive: "rgba(255,255,255,0.08)",
  sidebarBorder: "rgba(255,255,255,0.10)", sidebarMuted: "rgba(255,255,255,0.45)",
};
const FD = "'Fraunces', Georgia, serif";
const FB = "'Inter', system-ui, sans-serif";

// ─── API ──────────────────────────────────────────────────────────────────────
async function api<T>(base: string, path: string, token: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.status === 204 ? (undefined as T) : res.json();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function initials(n: string) { return n.split(" ").filter(Boolean).slice(0,2).map(w=>w[0]?.toUpperCase()).join(""); }
const PAL = ["#166534","#7C3AED","#1D4ED8","#D97706","#BE185D","#0F766E","#9333EA","#B45309"];
function aColor(id: string) { let h=0; for(let i=0;i<id.length;i++) h=(h*31+id.charCodeAt(i))%PAL.length; return PAL[h]; }
function fmtDate(d: string) { if(!d) return "—"; return new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}); }
function fmtINR(n: number) { return "₹"+n.toLocaleString("en-IN"); }
function daysBetween(a: string, b: string) { return Math.round((new Date(b).getTime()-new Date(a).getTime())/86400000)+1; }

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Avatar({id,name,size=34}:{id:string;name:string;size?:number}) {
  return <div style={{width:size,height:size,borderRadius:"50%",background:aColor(id),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.35,fontWeight:600,flexShrink:0,fontFamily:FB,letterSpacing:0.5}}>{initials(name)}</div>;
}

function Badge({children,tone="neutral"}:{children:React.ReactNode;tone?:"success"|"danger"|"amber"|"blue"|"purple"|"neutral"}) {
  const m={success:{bg:C.successBg,fg:C.success},danger:{bg:C.dangerBg,fg:C.danger},amber:{bg:C.amberLight,fg:C.amber},blue:{bg:C.blueLight,fg:C.blue},purple:{bg:C.purpleLight,fg:C.purple},neutral:{bg:C.borderLight,fg:C.inkMuted}} as const;
  const s=m[tone];
  return <span style={{padding:"2px 10px",borderRadius:20,fontSize:12,fontWeight:500,background:s.bg,color:s.fg,fontFamily:FB,whiteSpace:"nowrap"}}>{children}</span>;
}

function TabBar({tabs,active,onChange}:{tabs:string[];active:string;onChange:(t:string)=>void}) {
  return <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,marginBottom:24}}>{tabs.map(t=><div key={t} onClick={()=>onChange(t)} style={{padding:"11px 16px",cursor:"pointer",fontSize:13.5,fontFamily:FB,color:active===t?C.green:C.inkMuted,fontWeight:active===t?600:400,borderBottom:active===t?`2px solid ${C.green}`:"2px solid transparent",marginBottom:-1}}>{t}</div>)}</div>;
}

const inputSt:React.CSSProperties={width:"100%",padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontFamily:FB,fontSize:13.5,color:C.ink,background:C.surface,boxSizing:"border-box",outline:"none"};
const btnP:React.CSSProperties={padding:"9px 18px",borderRadius:8,border:"none",background:C.green,color:"#fff",fontSize:13.5,fontWeight:600,cursor:"pointer",fontFamily:FB,display:"flex",alignItems:"center",gap:6};
const btnG:React.CSSProperties={padding:"8px 16px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.ink,fontSize:13.5,cursor:"pointer",fontFamily:FB};

function Card({children,style}:{children:React.ReactNode;style?:React.CSSProperties}) {
  return <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,...style}}>{children}</div>;
}
function EmptyState({icon,title,sub}:{icon:string;title:string;sub?:string}) {
  return <div style={{textAlign:"center",padding:"52px 24px"}}><div style={{fontSize:34,marginBottom:10}}>{icon}</div><div style={{fontSize:15,fontWeight:600,color:C.ink,marginBottom:4}}>{title}</div>{sub&&<div style={{fontSize:13,color:C.inkMuted}}>{sub}</div>}</div>;
}

// ─── SVG Charts ───────────────────────────────────────────────────────────────
function MiniDonut({slices,size=96,label}:{slices:{value:number;color:string}[];size?:number;label?:string}) {
  const total=slices.reduce((s,x)=>s+x.value,0)||1;
  const cx=size/2,cy=size/2,r=size*0.34,sw=size*0.14;
  let angle=-Math.PI/2;
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{flexShrink:0}}>
    <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.borderLight} strokeWidth={sw}/>
    {slices.map((sl,i)=>{const sweep=(sl.value/total)*2*Math.PI;if(sweep<0.001)return null;const x1=cx+r*Math.cos(angle),y1=cy+r*Math.sin(angle),ea=angle+sweep,x2=cx+r*Math.cos(ea),y2=cy+r*Math.sin(ea),lg=sweep>Math.PI?1:0;angle=ea;return <path key={i} d={`M ${x1} ${y1} A ${r} ${r} 0 ${lg} 1 ${x2} ${y2}`} fill="none" stroke={sl.color} strokeWidth={sw} strokeLinecap="butt"/>;})}
    {label&&<text x={cx} y={cy+4} textAnchor="middle" fontSize={size*0.18} fontWeight="700" fill={C.ink} fontFamily={FB}>{label}</text>}
  </svg>;
}

function BarChart({data,height=110}:{data:{label:string;v1:number;v2:number}[];height?:number}) {
  const max=Math.max(...data.flatMap(d=>[d.v1,d.v2]),1);
  const bw=14,gap=4,gg=20,total=data.length*(bw*2+gap+gg);
  return <svg width={total} height={height+28} style={{display:"block"}}>
    {data.map((d,i)=>{const x=i*(bw*2+gap+gg)+4,h1=(d.v1/max)*height,h2=(d.v2/max)*height;return <g key={i}><rect x={x} y={height-h1} width={bw} height={h1} rx={3} fill={C.green}/><rect x={x+bw+gap} y={height-h2} width={bw} height={h2} rx={3} fill={C.amber} opacity={0.85}/><text x={x+bw} y={height+18} textAnchor="middle" fontSize={10} fill={C.inkMuted} fontFamily={FB}>{d.label}</text></g>;})}
  </svg>;
}
// ─── HRMS Dashboard ───────────────────────────────────────────────────────────
function HRMSDashboard({baseUrl,token,employees,onOpenEmp}:{baseUrl:string;token:string;employees:EmployeeOut[];onOpenEmp:(e:EmployeeOut)=>void}) {
  const [attendance,setAttendance]=useState<AttendanceOut[]>([]);
  const [pending,setPending]=useState<(LeaveRequestOut&{empName:string})[]>([]);
  const [loading,setLoading]=useState(true);
  const [decidingId,setDecidingId]=useState<string|null>(null);

  useEffect(()=>{
    const today=new Date().toISOString().slice(0,10);
    setLoading(true);
    Promise.all([
      Promise.all(employees.map(e=>api<AttendanceOut[]>(baseUrl,`/employees/${e.id}/attendance`,token).catch(()=>[]))).then(lists=>setAttendance(lists.flat().filter(a=>a.attendance_date===today))),
      Promise.all(employees.map(e=>api<LeaveRequestOut[]>(baseUrl,`/employees/${e.id}/leave-requests`,token).then(r=>r.filter(x=>x.status==="pending").map(x=>({...x,empName:e.full_name}))).catch(()=>[]))).then(lists=>setPending(lists.flat())),
    ]).finally(()=>setLoading(false));
  },[baseUrl,token,employees]);

  async function decide(req:LeaveRequestOut&{empName:string},approve:boolean){
    setDecidingId(req.id);
    try{await api(baseUrl,`/employees/${req.employee_id}/leave-requests/${req.id}/${approve?"approve":"reject"}`,token,{method:"POST"});setPending(p=>p.filter(r=>r.id!==req.id));}catch{}finally{setDecidingId(null);}
  }

  const activeCount=employees.filter(e=>e.is_active).length;
  const presentCount=attendance.filter(a=>a.status==="present").length;
  const dateStr=new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"});

  const stats=[
    {label:"Total Employees",value:employees.length,sub:`${activeCount} active`,icon:"👥",numC:C.green},
    {label:"Present Today",value:presentCount,sub:loading?"loading…":`of ${activeCount} active`,icon:"✅",numC:C.blue},
    {label:"Pending Leave Requests",value:pending.length,sub:pending.length===0?"All clear":`${pending.length} awaiting`,icon:"🕐",numC:C.amber},
    {label:"Pending Payroll Approvals",value:0,sub:"All clear",icon:"💵",numC:C.ink},
  ];

  return <div style={{padding:"28px 32px",fontFamily:FB}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
      <div style={{fontSize:22,fontWeight:700,fontFamily:FD,color:C.ink}}>HRMS Overview</div>
      <div style={{fontSize:13,color:C.inkMuted}}>{dateStr}</div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:28}}>
      {stats.map(s=><div key={s.label} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"20px",display:"flex",gap:14,alignItems:"flex-start"}}>
        <div style={{width:44,height:44,borderRadius:10,background:C.borderLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{s.icon}</div>
        <div><div style={{fontSize:28,fontWeight:700,fontFamily:FD,color:s.numC,lineHeight:1}}>{s.value}</div><div style={{fontSize:13,color:C.ink,fontWeight:500,marginTop:3}}>{s.label}</div><div style={{fontSize:12,color:C.inkMuted,marginTop:2}}>{s.sub}</div></div>
      </div>)}
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
      <Card>
        <div style={{padding:"18px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${C.border}`}}>
          <div style={{fontWeight:600,fontSize:15}}>Today's Attendance</div>
          <button style={btnG}>View All</button>
        </div>
        <div style={{padding:"8px 0"}}>
          {employees.slice(0,7).map(emp=>{
            const rec=attendance.find(a=>a.employee_id===emp.id);
            return <div key={emp.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 20px",borderBottom:`1px solid ${C.borderLight}`}}>
              <Avatar id={emp.id} name={emp.full_name} size={32}/>
              <div style={{flex:1}}><div style={{fontSize:13.5,fontWeight:500,color:C.ink}}>{emp.full_name}</div><div style={{fontSize:12,color:C.inkMuted}}>{emp.designation}</div></div>
              <span style={{fontSize:12,color:rec?.status==="present"?C.success:C.inkMuted}}>—</span>
            </div>;
          })}
          {employees.length>7&&<div style={{padding:"10px 20px",fontSize:12,color:C.inkMuted,textAlign:"center"}}>+{employees.length-7} more</div>}
        </div>
      </Card>

      <Card>
        <div style={{padding:"18px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${C.border}`}}>
          <div style={{fontWeight:600,fontSize:15}}>Pending Approvals</div>
          <button style={btnG}>View All</button>
        </div>
        <div style={{padding:"8px 0"}}>
          {pending.length===0?<div style={{padding:"32px 20px",textAlign:"center",color:C.inkMuted,fontSize:13}}>No pending approvals 🎉</div>:
          pending.map(req=><div key={req.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 20px",borderBottom:`1px solid ${C.borderLight}`}}>
            <Avatar id={req.employee_id} name={req.empName} size={32}/>
            <div style={{flex:1}}>
              <div style={{fontSize:13.5,fontWeight:500,color:C.ink}}>{req.empName}</div>
              <div style={{fontSize:12,color:C.inkMuted}}>{daysBetween(req.start_date,req.end_date)} days · {req.start_date} → {req.end_date}</div>
            </div>
            <div style={{display:"flex",gap:6}}>
              <button disabled={decidingId===req.id} onClick={()=>decide(req,true)} style={{width:28,height:28,borderRadius:6,border:`1px solid ${C.border}`,background:C.successBg,cursor:"pointer",fontSize:13,color:C.success}}>✓</button>
              <button disabled={decidingId===req.id} onClick={()=>decide(req,false)} style={{width:28,height:28,borderRadius:6,border:`1px solid ${C.border}`,background:C.dangerBg,cursor:"pointer",fontSize:13,color:C.danger}}>✕</button>
            </div>
          </div>)}
        </div>
      </Card>
    </div>
  </div>;
}

// ─── Employees List ───────────────────────────────────────────────────────────
function EmployeesList({employees,onOpen}:{employees:EmployeeOut[];onOpen:(e:EmployeeOut)=>void}) {
  const [search,setSearch]=useState("");
  const [dept,setDept]=useState("all");
  const [status,setStatus]=useState("all");
  const depts=Array.from(new Set(employees.map(e=>e.department).filter(Boolean)));
  const filtered=employees.filter(e=>{
    const q=search.toLowerCase();
    return(!q||e.full_name.toLowerCase().includes(q)||e.employee_code.toLowerCase().includes(q))&&(dept==="all"||e.department===dept)&&(status==="all"||(status==="active"?e.is_active:!e.is_active));
  });
  return <div style={{padding:"28px 32px",fontFamily:FB}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:20}}>
      <div><div style={{fontSize:26,fontWeight:700,fontFamily:FD,color:C.ink}}>Employees</div><div style={{fontSize:13,color:C.inkMuted,marginTop:2}}>{employees.length} total employees</div></div>
      <button style={btnP}><span style={{fontSize:16}}>+</span> Add Employee</button>
    </div>
    <div style={{display:"flex",gap:10,marginBottom:20}}>
      <div style={{position:"relative",flex:1,maxWidth:280}}>
        <span style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:C.inkMuted,fontSize:14}}>🔍</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or ID…" style={{...inputSt,paddingLeft:32}}/>
      </div>
      <select value={dept} onChange={e=>setDept(e.target.value)} style={{...inputSt,width:"auto"}}><option value="all">All Departments</option>{depts.map(d=><option key={d!} value={d!}>{d}</option>)}</select>
      <select value={status} onChange={e=>setStatus(e.target.value)} style={{...inputSt,width:"auto"}}><option value="all">All Statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
      <select style={{...inputSt,width:"auto"}}><option>All Designations</option></select>
    </div>
    <Card>
      <table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>{["EMPLOYEE","DESIGNATION","DEPARTMENT","JOINING DATE","MANAGER","STATUS",""].map(h=><th key={h} style={{padding:"12px 16px",textAlign:"left",fontSize:11.5,fontWeight:600,color:C.inkMuted}}>{h}</th>)}</tr></thead>
        <tbody>
          {filtered.map((emp,i)=><tr key={emp.id} style={{borderBottom:i<filtered.length-1?`1px solid ${C.borderLight}`:"none"}}>
            <td style={{padding:"12px 16px"}}><div style={{display:"flex",alignItems:"center",gap:10}}><Avatar id={emp.id} name={emp.full_name} size={32}/><div><div style={{fontSize:13.5,fontWeight:600,color:C.ink}}>{emp.full_name}</div><div style={{fontSize:11.5,color:C.green,fontFamily:"monospace"}}>{emp.employee_code}</div></div></div></td>
            <td style={{padding:"12px 16px",fontSize:13.5,color:C.ink}}>{emp.designation||"—"}</td>
            <td style={{padding:"12px 16px",fontSize:13.5,color:C.ink}}>{emp.department||"—"}</td>
            <td style={{padding:"12px 16px",fontSize:13.5,color:C.green,fontWeight:500}}>{emp.date_of_joining?fmtDate(emp.date_of_joining):"—"}</td>
            <td style={{padding:"12px 16px",fontSize:13.5,color:C.ink}}>—</td>
            <td style={{padding:"12px 16px"}}><Badge tone={emp.is_active?"success":"neutral"}>{emp.is_active?"Active":"Inactive"}</Badge></td>
            <td style={{padding:"12px 16px"}}><button onClick={()=>onOpen(emp)} style={btnG}>View</button></td>
          </tr>)}
          {filtered.length===0&&<tr><td colSpan={7}><EmptyState icon="👥" title="No employees found" sub="Try changing your search or filters"/></td></tr>}
        </tbody>
      </table>
    </Card>
  </div>;
}
// ─── Employee Detail Shell ────────────────────────────────────────────────────
function EmployeeDetail({baseUrl,token,employee,onBack,allEmployees}:{baseUrl:string;token:string;employee:EmployeeOut;onBack:()=>void;allEmployees:EmployeeOut[]}) {
  const [tab,setTab]=useState("Overview");
  const manager=allEmployees.find(e=>e.id===employee.manager_id);
  const tabs=["Overview","Performance","Attendance","Leave","Salary & Payslips","Advances","Training & History"];
  return <div style={{padding:"28px 32px",fontFamily:FB}}>
    <div style={{fontSize:12.5,color:C.inkMuted,marginBottom:14,display:"flex",gap:6,alignItems:"center"}}>
      <span onClick={onBack} style={{cursor:"pointer",color:C.green}}>Employees</span><span>/</span><span>{employee.full_name}</span>
    </div>
    <Card style={{padding:"22px 24px",marginBottom:24,display:"flex",alignItems:"center",gap:18}}>
      <Avatar id={employee.id} name={employee.full_name} size={56}/>
      <div style={{flex:1}}>
        <div style={{fontSize:22,fontWeight:700,fontFamily:FD,color:C.ink}}>{employee.full_name}</div>
        <div style={{fontSize:13.5,color:C.inkMuted,marginTop:2}}>{employee.designation} · {employee.department}</div>
        <div style={{display:"flex",gap:12,marginTop:8,alignItems:"center",flexWrap:"wrap"}}>
          <Badge tone={employee.is_active?"success":"neutral"}>{employee.is_active?"Active":"Inactive"}</Badge>
          <span style={{fontSize:12,color:C.inkMuted,fontFamily:"monospace"}}>{employee.employee_code}</span>
          {employee.email&&<span style={{fontSize:12,color:C.inkMuted}}>{employee.email}</span>}
        </div>
      </div>
      <button style={btnG}>✏️ Edit</button>
    </Card>
    <TabBar tabs={tabs} active={tab} onChange={setTab}/>
    {tab==="Overview"&&<EmpOverview employee={employee} manager={manager}/>}
    {tab==="Performance"&&<EmpPerformance employee={employee}/>}
    {tab==="Attendance"&&<EmpAttendance baseUrl={baseUrl} token={token} employee={employee}/>}
    {tab==="Leave"&&<EmpLeave baseUrl={baseUrl} token={token} employee={employee}/>}
    {tab==="Salary & Payslips"&&<EmpSalary baseUrl={baseUrl} token={token} employee={employee}/>}
    {tab==="Advances"&&<EmpAdvances/>}
    {tab==="Training & History"&&<EmpTraining/>}
  </div>;
}

function EmpOverview({employee,manager}:{employee:EmployeeOut;manager?:EmployeeOut}) {
  const fields=[
    {l:"Full Name",v:employee.full_name},{l:"Employee Code",v:employee.employee_code},
    {l:"Designation",v:employee.designation},{l:"Department",v:employee.department},
    {l:"Date of Joining",v:employee.date_of_joining?fmtDate(employee.date_of_joining):"—"},
    {l:"Email",v:employee.email||"—"},{l:"Phone",v:employee.phone||"—"},{l:"Manager",v:manager?.full_name||"—"},
    {l:"Status",v:employee.is_active?"Active":"Inactive"},
  ];
  return <Card><div style={{padding:"18px 24px",fontWeight:600,fontSize:15,borderBottom:`1px solid ${C.border}`}}>Personal Details</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
      {fields.map((f,i)=><div key={f.l} style={{padding:"14px 24px",borderBottom:`1px solid ${C.borderLight}`,borderRight:i%2===0?`1px solid ${C.borderLight}`:"none"}}>
        <div style={{fontSize:11.5,color:C.inkMuted,marginBottom:3,textTransform:"uppercase" as const,letterSpacing:0.4}}>{f.l}</div>
        <div style={{fontSize:13.5,color:C.ink,fontWeight:500}}>{f.v||"—"}</div>
      </div>)}
    </div>
  </Card>;
}

// Mock perf data
const PERF_MONTHS=["Mar","Apr","May","Jun","Jul","Aug"];
const CALLS_DATA=[68,90,78,95,88,67];
const CONV_DATA=[16,22,15,26,20,16];

function EmpPerformance({employee}:{employee:EmployeeOut}) {
  const [period,setPeriod]=useState("6M");
  const totalD=CALLS_DATA.reduce((a,b)=>a+b,0);
  const totalConv=CONV_DATA.reduce((a,b)=>a+b,0);
  const connected=Math.round(totalD*0.746);
  const barData=PERF_MONTHS.map((label,i)=>({label,v1:CALLS_DATA[i],v2:CONV_DATA[i]}));
  const donutSlices=[{value:connected,color:C.green},{value:Math.round(totalD*0.18),color:"#E5E7EB"},{value:Math.round(totalD*0.08),color:C.amber},{value:Math.round(totalD*0.12),color:C.purple}];
  const mbRows=PERF_MONTHS.map((m,i)=>({m,d:CALLS_DATA[i],c:Math.round(CALLS_DATA[i]*0.74),cv:CONV_DATA[i]}));

  return <div>
    <div style={{background:C.greenBg,border:`1px solid #BBF7D0`,borderRadius:8,padding:"10px 16px",marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span style={{color:C.success,fontSize:13}}>● Connected to GroTec CRM <span style={{color:C.inkMuted,fontWeight:400}}>· Last synced today at 09:00 AM</span></span>
      <div style={{display:"flex",gap:6}}>{["3M","6M"].map(p=><button key={p} onClick={()=>setPeriod(p)} style={{padding:"4px 12px",borderRadius:6,border:`1px solid ${p===period?C.green:C.border}`,background:p===period?C.green:"transparent",color:p===period?"#fff":C.inkMuted,fontSize:12,cursor:"pointer"}}>{p}</button>)}</div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:20}}>
      {[
        {l:"Calls Dialed",v:totalD,sub:"6 months",col:C.ink},
        {l:"Connected",v:connected,sub:"74.6% connect rate",col:C.blue},
        {l:"Converted",v:totalConv,sub:"leads to customers",col:C.success},
        {l:"Conv. Rate",v:((totalConv/connected)*100).toFixed(1)+"%",sub:"of connected calls",col:C.amber},
        {l:"Revenue",v:"₹35.2L",sub:"₹35,20,000",col:C.success},
      ].map(s=><Card key={s.l} style={{padding:"16px"}}>
        <div style={{fontSize:22,fontWeight:700,fontFamily:FD,color:s.col}}>{s.v}</div>
        <div style={{fontSize:12,color:C.ink,fontWeight:500,marginTop:2}}>{s.l}</div>
        <div style={{fontSize:11,color:C.inkMuted}}>{s.sub}</div>
      </Card>)}
    </div>

    <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16,marginBottom:16}}>
      <Card style={{padding:"20px"}}>
        <div style={{fontWeight:600,fontSize:14,marginBottom:4}}>Calls & Conversions</div>
        <div style={{fontSize:12,color:C.inkMuted,marginBottom:14}}>Monthly trend — last 6 months</div>
        <div style={{overflowX:"auto"}}><BarChart data={barData} height={110}/></div>
        <div style={{display:"flex",gap:16,marginTop:10,fontSize:11,color:C.inkMuted}}>
          <span><span style={{display:"inline-block",width:10,height:10,borderRadius:2,background:C.green,marginRight:4}}/> Calls Dialed</span>
          <span><span style={{display:"inline-block",width:10,height:10,borderRadius:2,background:C.amber,marginRight:4}}/> Leads Converted</span>
        </div>
      </Card>
      <Card style={{padding:"20px"}}>
        <div style={{fontWeight:600,fontSize:14,marginBottom:4}}>Call Outcomes</div>
        <div style={{fontSize:12,color:C.inkMuted,marginBottom:14}}>Overall breakdown</div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{position:"relative",flexShrink:0}}>
            <MiniDonut slices={donutSlices} size={88}/>
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
              <div style={{fontSize:15,fontWeight:700,color:C.ink}}>{totalD}</div>
              <div style={{fontSize:9,color:C.inkMuted}}>total</div>
            </div>
          </div>
          <div style={{flex:1,fontSize:12}}>
            {[{l:"Connected",v:connected,pct:"62%",col:C.green},{l:"Not Answered",v:Math.round(totalD*0.18),pct:"18%",col:"#E5E7EB"},{l:"Busy",v:Math.round(totalD*0.08),pct:"8%",col:C.amber},{l:"Voicemail",v:Math.round(totalD*0.12),pct:"12%",col:C.purple}]
              .map(r=><div key={r.l} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                <span style={{width:8,height:8,borderRadius:"50%",background:r.col,flexShrink:0,display:"inline-block"}}/>
                <span style={{flex:1,color:C.ink}}>{r.l}</span>
                <span style={{fontWeight:600}}>{r.v}</span>
                <span style={{color:C.inkMuted}}>{r.pct}</span>
              </div>)}
          </div>
        </div>
      </Card>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <Card style={{padding:"20px 24px"}}>
        <div style={{fontWeight:600,fontSize:14,marginBottom:16}}>Performance Rating</div>
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{fontSize:48,fontWeight:800,fontFamily:FD,color:C.ink,lineHeight:1}}>4.6</div>
          <div style={{fontSize:18,color:C.amber,margin:"6px 0"}}>★★★★☆</div>
          <div style={{fontSize:12,color:C.inkMuted}}>out of 5.0 · Manager reviewed</div>
        </div>
        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14,textAlign:"center"}}>
          <div style={{fontSize:12,color:C.inkMuted,marginBottom:4}}>Department Rank</div>
          <div style={{fontSize:22,fontWeight:700,fontFamily:FD,color:C.green}}>#1 of 3</div>
        </div>
        <div style={{marginTop:14}}>
          {[{l:"Quality",v:4.8},{l:"Efficiency",v:4.3},{l:"Attendance",v:4.7}].map(r=><div key={r.l} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
            <span style={{fontSize:12,color:C.inkMuted,width:70}}>{r.l}</span>
            <div style={{flex:1,height:6,borderRadius:3,background:C.borderLight,overflow:"hidden"}}><div style={{width:`${(r.v/5)*100}%`,height:"100%",background:C.amber,borderRadius:3}}/></div>
            <span style={{fontSize:12,fontWeight:600}}>{r.v}</span>
          </div>)}
        </div>
      </Card>
      <Card style={{padding:"20px 24px"}}>
        <div style={{fontWeight:600,fontSize:14,marginBottom:16}}>Monthly Breakdown</div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12.5}}>
          <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>{["MONTH","DIALED","CONNECTED","CONV. RATE","CONVERTED","REVENUE"].map(h=><th key={h} style={{padding:"6px 4px",textAlign:"left",color:C.inkMuted,fontWeight:600,fontSize:11}}>{h}</th>)}</tr></thead>
          <tbody>{mbRows.map(m=><tr key={m.m} style={{borderBottom:`1px solid ${C.borderLight}`}}>
            <td style={{padding:"8px 4px",fontWeight:500}}>{m.m}</td>
            <td style={{padding:"8px 4px"}}>{m.d}</td>
            <td style={{padding:"8px 4px",color:C.blue}}>{m.c} ({Math.round(m.c/m.d*100)}%)</td>
            <td style={{padding:"8px 4px",color:C.amber,fontWeight:600}}>{(m.cv/m.c*100).toFixed(1)}%</td>
            <td style={{padding:"8px 4px",color:C.success,fontWeight:600}}>{m.cv}</td>
            <td style={{padding:"8px 4px"}}>₹{(m.cv*30000).toLocaleString("en-IN")}</td>
          </tr>)}</tbody>
        </table>
      </Card>
    </div>
  </div>;
}

function EmpAttendance({baseUrl,token,employee}:{baseUrl:string;token:string;employee:EmployeeOut}) {
  const [records,setRecords]=useState<AttendanceOut[]>([]);
  useEffect(()=>{api<AttendanceOut[]>(baseUrl,`/employees/${employee.id}/attendance`,token).then(setRecords).catch(()=>{});},[baseUrl,token,employee.id]);
  return <Card style={{padding:"20px 24px"}}>
    <div style={{fontWeight:600,fontSize:15,marginBottom:16}}>Attendance Record</div>
    {records.length===0?<EmptyState icon="📅" title="No attendance records" sub="Records will appear once attendance is marked"/>:
    records.slice(0,15).map(r=><div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.borderLight}`}}>
      <div style={{fontSize:13.5,color:C.ink}}>{fmtDate(r.attendance_date)}</div>
      <Badge tone={r.status==="present"?"success":r.status==="absent"?"danger":r.status==="late"?"amber":"neutral"}>{r.status}</Badge>
      {r.check_in&&<div style={{fontSize:12,color:C.inkMuted}}>{r.check_in} – {r.check_out||"?"}</div>}
    </div>)}
  </Card>;
}

function EmpLeave({baseUrl,token,employee}:{baseUrl:string;token:string;employee:EmployeeOut}) {
  const [leaveTypes,setLeaveTypes]=useState<LeaveTypeOut[]>([]);
  const [requests,setRequests]=useState<LeaveRequestOut[]>([]);
  useEffect(()=>{
    api<LeaveTypeOut[]>(baseUrl,"/leave-types",token).then(setLeaveTypes).catch(()=>{});
    api<LeaveRequestOut[]>(baseUrl,`/employees/${employee.id}/leave-requests`,token).then(setRequests).catch(()=>{});
  },[baseUrl,token,employee.id]);
  const usedMap:Record<string,number>={};
  requests.filter(r=>r.status==="approved").forEach(r=>{usedMap[r.leave_type_id]=(usedMap[r.leave_type_id]||0)+daysBetween(r.start_date,r.end_date);});
  return <div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}}>
      {leaveTypes.map(lt=>{const used=usedMap[lt.id]||0,rem=lt.default_annual_quota-used,pct=Math.max(0,rem/lt.default_annual_quota);
        return <Card key={lt.id} style={{padding:"16px 18px"}}>
          <div style={{fontSize:12.5,color:C.inkMuted,marginBottom:6}}>{lt.name}</div>
          <div style={{fontSize:26,fontWeight:700,fontFamily:FD,color:C.green}}>{rem}</div>
          <div style={{fontSize:12,color:C.inkMuted,marginBottom:10}}>of {lt.default_annual_quota} days remaining</div>
          <div style={{height:5,background:C.borderLight,borderRadius:3,overflow:"hidden"}}><div style={{width:`${pct*100}%`,height:"100%",background:C.green,borderRadius:3}}/></div>
        </Card>;
      })}
    </div>
    <Card>
      <div style={{padding:"14px 20px",fontWeight:600,fontSize:14,borderBottom:`1px solid ${C.border}`}}>Leave History</div>
      {requests.length===0?<EmptyState icon="🏖️" title="No leave requests" sub="Employee has not applied for any leave"/>:
      requests.map((r,i)=>{const lt=leaveTypes.find(x=>x.id===r.leave_type_id);
        return <div key={r.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 20px",borderBottom:i<requests.length-1?`1px solid ${C.borderLight}`:"none"}}>
          <div style={{flex:1}}>
            <div style={{fontSize:13.5,fontWeight:500,color:C.ink}}>{lt?.name||"Leave"}</div>
            <div style={{fontSize:12,color:C.inkMuted}}>{r.start_date} → {r.end_date} · {daysBetween(r.start_date,r.end_date)} days</div>
            {r.reason&&<div style={{fontSize:12,color:C.inkMuted,fontStyle:"italic"}}>{r.reason}</div>}
          </div>
          <Badge tone={r.status==="approved"?"success":r.status==="rejected"?"danger":"amber"}>{r.status}</Badge>
        </div>;
      })}
    </Card>
  </div>;
}

function EmpSalary({baseUrl,token,employee}:{baseUrl:string;token:string;employee:EmployeeOut}) {
  const [history,setHistory]=useState<PayrollRecordOut[]>([]);
  useEffect(()=>{api<PayrollRecordOut[]>(baseUrl,`/employees/${employee.id}/payroll`,token).then(h=>setHistory(h.sort((a,b)=>b.effective_from.localeCompare(a.effective_from)))).catch(()=>{});},[baseUrl,token,employee.id]);
  if(history.length===0) return <Card><EmptyState icon="💰" title="No salary structure" sub="Set up salary components for this employee"/></Card>;
  const cur=history[0];
  const gross=cur.basic_salary+cur.hra+cur.other_allowances,ded=cur.pf_deduction+cur.esi_deduction+cur.tds_deduction,net=gross-ded;
  const comps=[
    {n:"Basic",t:"Earning",a:cur.basic_salary,tx:true},{n:"HRA",t:"Earning",a:cur.hra,tx:false},
    {n:"Conveyance",t:"Earning",a:Math.min(1600,cur.other_allowances),tx:false},
    {n:"Special Allowance",t:"Earning",a:Math.max(0,cur.other_allowances-1600),tx:true},
    {n:"PF Deduction",t:"Deduction",a:cur.pf_deduction,tx:false},{n:"ESI Deduction",t:"Deduction",a:cur.esi_deduction,tx:false},{n:"TDS Deduction",t:"Deduction",a:cur.tds_deduction,tx:true},
  ].filter(c=>c.a>0);
  return <Card>
    <div style={{padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${C.border}`}}>
      <div style={{fontWeight:600,fontSize:15}}>Current Salary Structure</div>
      <button style={btnG}>Edit Salary</button>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)"}}>
      {[{l:"Gross Earnings",v:fmtINR(gross),col:C.ink},{l:"Total Deductions",v:fmtINR(ded),col:C.danger},{l:"Net Payable",v:fmtINR(net),col:C.green}]
        .map((x,i)=><div key={x.l} style={{padding:"20px 24px",borderRight:i<2?`1px solid ${C.border}`:"none"}}>
          <div style={{fontSize:11.5,color:C.inkMuted,marginBottom:4}}>{x.l}</div>
          <div style={{fontSize:26,fontWeight:700,fontFamily:FD,color:x.col}}>{x.v}</div>
        </div>)}
    </div>
    <table style={{width:"100%",borderCollapse:"collapse"}}>
      <thead><tr style={{borderTop:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`}}>{["COMPONENT","TYPE","AMOUNT","TAXABLE"].map(h=><th key={h} style={{padding:"10px 24px",textAlign:"left",fontSize:11.5,fontWeight:600,color:C.inkMuted}}>{h}</th>)}</tr></thead>
      <tbody>{comps.map((c,i)=><tr key={c.n} style={{borderBottom:i<comps.length-1?`1px solid ${C.borderLight}`:"none"}}>
        <td style={{padding:"12px 24px",fontSize:13.5,color:C.ink}}>{c.n}</td>
        <td style={{padding:"12px 24px"}}><Badge tone={c.t==="Earning"?"success":"danger"}>{c.t}</Badge></td>
        <td style={{padding:"12px 24px",fontSize:13.5}}>{fmtINR(c.a)}</td>
        <td style={{padding:"12px 24px"}}><Badge tone={c.tx?"amber":"neutral"}>{c.tx?"Taxable":"Non-taxable"}</Badge></td>
      </tr>)}</tbody>
    </table>
  </Card>;
}

function EmpAdvances() {
  return <div><div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}><button style={btnP}>+ Add Advance</button></div>
    <Card><EmptyState icon="💳" title="No advances recorded" sub="No advances or recoveries for this employee"/></Card></div>;
}

function EmpTraining() {
  const records=[
    {type:"Training",date:"2025-03-15",title:"Leadership & Management Development Program (3 days)",by:"EMP-002"},
    {type:"Promotion",date:"2024-04-01",title:"Promoted from Sales Executive to Sales Manager",by:"EMP-002"},
  ];
  return <div>
    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}><button style={btnG}>+ Add Record</button></div>
    {records.map((r,i)=><Card key={i} style={{padding:"16px 20px",marginBottom:10}}>
      <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
        <div style={{width:10,height:10,borderRadius:"50%",marginTop:4,flexShrink:0,background:r.type==="Promotion"?C.green:C.blue}}/>
        <div>
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
            <Badge tone={r.type==="Promotion"?"success":"blue"}>{r.type}</Badge>
            <span style={{fontSize:12,color:C.inkMuted}}>{r.date}</span>
          </div>
          <div style={{fontSize:13.5,fontWeight:500,color:C.ink}}>{r.title}</div>
          <div style={{fontSize:12,color:C.inkMuted,marginTop:3}}>Added by {r.by}</div>
        </div>
      </div>
    </Card>)}
  </div>;
}
// ─── Attendance Screen ────────────────────────────────────────────────────────
const SC:Record<string,{label:string;color:string;bg:string}>={
  present:{label:"P",color:"#15803D",bg:"#DCFCE7"},
  absent:{label:"A",color:"#DC2626",bg:"#FEE2E2"},
  late:{label:"L",color:"#D97706",bg:"#FEF3C7"},
  half_day:{label:"H",color:"#7C3AED",bg:"#EDE9FE"},
  weekly_off:{label:"W",color:"#6B7280",bg:"#F3F4F6"},
  holiday:{label:"HD",color:"#1D4ED8",bg:"#DBEAFE"},
  leave:{label:"LV",color:"#9333EA",bg:"#F3E8FF"},
};

function AttendanceScreen({baseUrl,token,employees}:{baseUrl:string;token:string;employees:EmployeeOut[]}) {
  const [tab,setTab]=useState("Calendar");
  const today=new Date();
  const [year,setYear]=useState(today.getFullYear());
  const [month,setMonth]=useState(today.getMonth());
  const [markDate,setMarkDate]=useState(today.toISOString().slice(0,10));
  const [allRecs,setAllRecs]=useState<AttendanceOut[]>([]);
  const [markSt,setMarkSt]=useState<Record<string,string>>({});
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState("");

  useEffect(()=>{
    Promise.all(employees.map(e=>api<AttendanceOut[]>(baseUrl,`/employees/${e.id}/attendance`,token).catch(()=>[]))).then(lists=>setAllRecs(lists.flat()));
  },[baseUrl,token,employees]);

  const dim=new Date(year,month+1,0).getDate();
  const monthDays=Array.from({length:dim},(_,i)=>{
    const d=new Date(year,month,i+1);
    const iso=d.toISOString().slice(0,10);
    return{iso,day:i+1,dow:["Su","Mo","Tu","We","Th","Fr","Sa"][d.getDay()],isWknd:d.getDay()===0||d.getDay()===6,isFuture:d>today};
  });

  const recFor=(eid:string,date:string)=>allRecs.find(r=>r.employee_id===eid&&r.attendance_date===date);
  const dayRecs=allRecs.filter(r=>r.attendance_date===markDate);
  const pCount=dayRecs.filter(r=>r.status==="present").length;
  const aCount=dayRecs.filter(r=>r.status==="absent").length;

  function getStatus(eid:string){return markSt[eid]||dayRecs.find(r=>r.employee_id===eid)?.status||"weekly_off";}

  async function saveStatus(eid:string,status:string){
    setMarkSt(p=>({...p,[eid]:status}));
    try{await api(baseUrl,`/employees/${eid}/attendance`,token,{method:"POST",body:JSON.stringify({attendance_date:markDate,status})});}catch{}
  }

  async function markAllPresent(){
    setSaving(true);
    await Promise.all(employees.map(e=>saveStatus(e.id,"present")));
    setSaving(false);setMsg("All marked present!");setTimeout(()=>setMsg(""),2000);
  }

  const prevM=()=>{if(month===0){setYear(y=>y-1);setMonth(11);}else setMonth(m=>m-1);};
  const nextM=()=>{if(month===11){setYear(y=>y+1);setMonth(0);}else setMonth(m=>m+1);};
  const monthName=new Date(year,month).toLocaleDateString("en-IN",{month:"long",year:"numeric"});

  const STBTNS=[
    {k:"present",l:"Present",col:C.success,bg:C.successBg,dark:false},
    {k:"absent",l:"Absent",col:C.danger,bg:C.dangerBg,dark:false},
    {k:"late",l:"Late",col:C.amber,bg:C.amberLight,dark:false},
    {k:"half_day",l:"Half Day",col:C.purple,bg:C.purpleLight,dark:false},
    {k:"leave",l:"Leave",col:"#9333EA",bg:"#F3E8FF",dark:false},
    {k:"weekly_off",l:"W/Off",col:"#fff",bg:C.ink,dark:true},
    {k:"holiday",l:"Holiday",col:C.blue,bg:C.blueLight,dark:false},
  ];

  return <div style={{padding:"28px 32px",fontFamily:FB}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
      <div style={{fontSize:22,fontWeight:700,fontFamily:FD,color:C.ink}}>Attendance</div>
      <div style={{fontSize:13,color:C.inkMuted}}>{today.toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"})}</div>
    </div>
    <TabBar tabs={["Calendar","Mark Attendance"]} active={tab} onChange={setTab}/>

    {tab==="Calendar"&&<Card style={{overflowX:"auto"}}>
      <div style={{padding:"16px 20px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${C.border}`}}>
        <button onClick={prevM} style={btnG}>‹</button>
        <div style={{fontSize:15,fontWeight:600,minWidth:150,textAlign:"center"}}>{monthName}</div>
        <button onClick={nextM} style={btnG}>›</button>
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{borderCollapse:"collapse",minWidth:"100%"}}>
          <thead><tr>
            <th style={{padding:"10px 16px",textAlign:"left",fontSize:12,fontWeight:600,color:C.inkMuted,position:"sticky",left:0,background:C.surface,zIndex:1,minWidth:160}}>EMPLOYEE</th>
            {monthDays.map(d=><th key={d.iso} style={{padding:"6px 4px",minWidth:32,textAlign:"center",fontSize:11,color:d.isWknd?C.inkLight:C.inkMuted,fontWeight:500}}>
              <div>{d.dow}</div>
              <div style={{fontWeight:600,color:d.iso===today.toISOString().slice(0,10)?C.green:"inherit"}}>{d.day}</div>
            </th>)}
          </tr></thead>
          <tbody>{employees.map((emp)=><tr key={emp.id} style={{borderTop:`1px solid ${C.borderLight}`}}>
            <td style={{padding:"10px 16px",position:"sticky",left:0,background:C.surface,zIndex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <Avatar id={emp.id} name={emp.full_name} size={28}/>
                <div><div style={{fontSize:13,fontWeight:500,color:C.ink}}>{emp.full_name}</div><div style={{fontSize:11,color:C.inkMuted}}>{emp.designation}</div></div>
              </div>
            </td>
            {monthDays.map(d=>{
              const rec=recFor(emp.id,d.iso);
              const cfg=rec?(SC[rec.status]||SC.weekly_off):(d.isWknd?SC.weekly_off:null);
              return <td key={d.iso} style={{textAlign:"center",padding:"4px 2px"}}>
                {cfg?<span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:26,height:26,borderRadius:6,fontSize:10,fontWeight:700,background:cfg.bg,color:cfg.color}}>{cfg.label}</span>:
                <span style={{fontSize:10,color:C.borderLight}}>·</span>}
              </td>;
            })}
          </tr>)}</tbody>
        </table>
      </div>
      <div style={{padding:"12px 20px",borderTop:`1px solid ${C.border}`,display:"flex",gap:14,flexWrap:"wrap"}}>
        {Object.entries(SC).map(([k,v])=><div key={k} style={{display:"flex",alignItems:"center",gap:4,fontSize:12,color:C.inkMuted}}>
          <span style={{display:"inline-block",width:18,height:18,borderRadius:4,background:v.bg,color:v.color,fontSize:9,fontWeight:700,textAlign:"center",lineHeight:"18px"}}>{v.label}</span>
          {k.replace("_"," ").replace(/\b\w/g,l=>l.toUpperCase())}
        </div>)}
      </div>
    </Card>}

    {tab==="Mark Attendance"&&<div>
      <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:20}}>
        <div><span style={{fontSize:13,color:C.inkMuted,marginRight:8}}>Date</span><input type="date" value={markDate} onChange={e=>setMarkDate(e.target.value)} style={{...inputSt,width:"auto"}}/></div>
        <button onClick={markAllPresent} disabled={saving} style={btnG}>✓ Mark All Present</button>
        <div style={{marginLeft:"auto",display:"flex",gap:16,fontSize:13}}>
          <span style={{color:C.success,fontWeight:600}}>{pCount} Present</span>
          <span style={{color:C.danger,fontWeight:600}}>{aCount} Absent</span>
          <span style={{color:C.inkMuted}}>{employees.length-pCount-aCount} Other</span>
        </div>
      </div>
      {msg&&<div style={{padding:"10px 16px",background:C.successBg,color:C.success,borderRadius:8,marginBottom:14,fontSize:13}}>{msg}</div>}
      <Card>{employees.map((emp,i)=>{
        const cur=getStatus(emp.id);
        return <div key={emp.id} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 20px",borderBottom:i<employees.length-1?`1px solid ${C.borderLight}`:"none"}}>
          <Avatar id={emp.id} name={emp.full_name} size={36}/>
          <div style={{flex:1}}>
            <div style={{fontSize:13.5,fontWeight:500,color:C.ink}}>{emp.full_name}</div>
            <div style={{fontSize:12,color:C.inkMuted}}>{emp.designation} · {emp.department}</div>
          </div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {STBTNS.map(s=><button key={s.k} onClick={()=>saveStatus(emp.id,s.k)} style={{padding:"5px 11px",borderRadius:7,fontSize:12.5,cursor:"pointer",fontWeight:500,border:cur===s.k?`2px solid ${s.col}`:`1px solid ${C.border}`,background:cur===s.k?s.bg:C.surface,color:cur===s.k?s.col:C.inkMuted}}>{s.l}</button>)}
          </div>
        </div>;
      })}</Card>
    </div>}
  </div>;
}
// ─── Leave Screen ─────────────────────────────────────────────────────────────
function LeaveScreen({baseUrl,token,employees}:{baseUrl:string;token:string;employees:EmployeeOut[]}) {
  const [tab,setTab]=useState("Overview");
  const [leaveTypes,setLeaveTypes]=useState<LeaveTypeOut[]>([]);
  const [allReqs,setAllReqs]=useState<(LeaveRequestOut&{empName:string;deptName:string})[]>([]);
  const [statusF,setStatusF]=useState("Pending");
  const [deptF,setDeptF]=useState("All Departments");
  const [empF,setEmpF]=useState("All Employees");
  const [showForm,setShowForm]=useState(false);
  const [decidingId,setDecidingId]=useState<string|null>(null);
  const [saving,setSaving]=useState(false);
  const [newReq,setNewReq]=useState({employee_id:"",leave_type_id:"",start_date:"",end_date:"",reason:""});
  const [formMsg,setFormMsg]=useState("");

  const refresh=useCallback(()=>{
    api<LeaveTypeOut[]>(baseUrl,"/leave-types",token).then(setLeaveTypes).catch(()=>{});
    Promise.all(employees.map(e=>api<LeaveRequestOut[]>(baseUrl,`/employees/${e.id}/leave-requests`,token).then(r=>r.map(x=>({...x,empName:e.full_name,deptName:e.department||"—"}))).catch(()=>[]))).then(lists=>setAllReqs(lists.flat()));
  },[baseUrl,token,employees]);

  useEffect(()=>{refresh();},[refresh]);

  async function decide(req:typeof allReqs[0],approve:boolean){
    setDecidingId(req.id);
    try{await api(baseUrl,`/employees/${req.employee_id}/leave-requests/${req.id}/${approve?"approve":"reject"}`,token,{method:"POST"});refresh();}catch{}finally{setDecidingId(null);}
  }

  async function applyLeave(){
    if(!newReq.employee_id||!newReq.leave_type_id||!newReq.start_date||!newReq.end_date){setFormMsg("Fill all required fields");return;}
    setSaving(true);
    try{
      await api(baseUrl,`/employees/${newReq.employee_id}/leave-requests`,token,{method:"POST",body:JSON.stringify(newReq)});
      setFormMsg("Leave applied!");setShowForm(false);setNewReq({employee_id:"",leave_type_id:"",start_date:"",end_date:"",reason:""});refresh();
    }catch(e:unknown){setFormMsg(e instanceof Error?e.message:"Error");}finally{setSaving(false);}
  }

  const usedMap:Record<string,Record<string,number>>={};
  allReqs.filter(r=>r.status==="approved").forEach(r=>{if(!usedMap[r.employee_id])usedMap[r.employee_id]={};usedMap[r.employee_id][r.leave_type_id]=(usedMap[r.employee_id][r.leave_type_id]||0)+daysBetween(r.start_date,r.end_date);});

  const pending=allReqs.filter(r=>r.status==="pending"&&(deptF==="All Departments"||r.deptName===deptF));
  const history=allReqs.filter(r=>r.status!=="pending"&&(empF==="All Employees"||r.empName===empF));
  const depts=Array.from(new Set(employees.map(e=>e.department).filter(Boolean)));

  return <div style={{padding:"28px 32px",fontFamily:FB}}>
    <div style={{fontSize:26,fontWeight:700,fontFamily:FD,color:C.ink,marginBottom:2}}>Leave</div>
    <div style={{fontSize:13,color:C.inkMuted,marginBottom:20}}>Manage leave requests, types, and history</div>
    <TabBar tabs={["Overview","Leave Types","Requests & Approvals","History"]} active={tab} onChange={setTab}/>

    {tab==="Overview"&&<div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:13,color:C.inkMuted}}>{employees.length} employees · {leaveTypes.length} leave types</div>
        <button onClick={()=>setShowForm(s=>!s)} style={btnP}>+ Apply Leave</button>
      </div>
      {showForm&&<Card style={{padding:"20px 24px",marginBottom:20}}>
        <div style={{fontWeight:600,fontSize:14,marginBottom:16}}>Apply Leave</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div><label style={{fontSize:12.5,color:C.inkMuted,display:"block",marginBottom:4}}>Employee *</label>
            <select value={newReq.employee_id} onChange={e=>setNewReq(p=>({...p,employee_id:e.target.value}))} style={inputSt}><option value="">Select employee</option>{employees.map(e=><option key={e.id} value={e.id}>{e.full_name}</option>)}</select></div>
          <div><label style={{fontSize:12.5,color:C.inkMuted,display:"block",marginBottom:4}}>Leave Type *</label>
            <select value={newReq.leave_type_id} onChange={e=>setNewReq(p=>({...p,leave_type_id:e.target.value}))} style={inputSt}><option value="">Select type</option>{leaveTypes.map(lt=><option key={lt.id} value={lt.id}>{lt.name}</option>)}</select></div>
          <div><label style={{fontSize:12.5,color:C.inkMuted,display:"block",marginBottom:4}}>Start Date *</label><input type="date" value={newReq.start_date} onChange={e=>setNewReq(p=>({...p,start_date:e.target.value}))} style={inputSt}/></div>
          <div><label style={{fontSize:12.5,color:C.inkMuted,display:"block",marginBottom:4}}>End Date *</label><input type="date" value={newReq.end_date} onChange={e=>setNewReq(p=>({...p,end_date:e.target.value}))} style={inputSt}/></div>
          <div style={{gridColumn:"1/-1"}}><label style={{fontSize:12.5,color:C.inkMuted,display:"block",marginBottom:4}}>Reason</label><input value={newReq.reason} onChange={e=>setNewReq(p=>({...p,reason:e.target.value}))} style={inputSt} placeholder="Optional reason…"/></div>
        </div>
        {formMsg&&<div style={{fontSize:13,color:formMsg.includes("!")?C.success:C.danger,marginTop:10}}>{formMsg}</div>}
        <div style={{display:"flex",gap:10,marginTop:16}}>
          <button onClick={applyLeave} disabled={saving} style={btnP}>{saving?"Saving…":"Apply Leave"}</button>
          <button onClick={()=>setShowForm(false)} style={btnG}>Cancel</button>
        </div>
      </Card>}
      <Card style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
          <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>
            <th style={{padding:"12px 16px",textAlign:"left",fontSize:11.5,fontWeight:600,color:C.inkMuted}}>EMPLOYEE</th>
            {leaveTypes.map(lt=><th key={lt.id} style={{padding:"12px 12px",textAlign:"center",fontSize:11.5,fontWeight:600,color:C.inkMuted}}>{lt.name.toUpperCase()}</th>)}
            <th style={{padding:"12px 16px",textAlign:"center",fontSize:11.5,fontWeight:600,color:C.inkMuted}}>TOTAL AVAILABLE</th>
          </tr></thead>
          <tbody>{employees.map((emp,ei)=>{
            const eu=usedMap[emp.id]||{};
            const tot=leaveTypes.reduce((s,lt)=>s+(lt.default_annual_quota-(eu[lt.id]||0)),0);
            return <tr key={emp.id} style={{borderBottom:ei<employees.length-1?`1px solid ${C.borderLight}`:"none"}}>
              <td style={{padding:"12px 16px"}}><div style={{display:"flex",alignItems:"center",gap:10}}><Avatar id={emp.id} name={emp.full_name} size={30}/><div><div style={{fontSize:13.5,fontWeight:500,color:C.ink}}>{emp.full_name}</div><div style={{fontSize:11.5,color:C.inkMuted}}>{emp.department}</div></div></div></td>
              {leaveTypes.map(lt=>{const used=eu[lt.id]||0,rem=lt.default_annual_quota-used;return <td key={lt.id} style={{textAlign:"center",padding:"12px 12px",fontSize:13.5}}><span style={{fontWeight:500,color:rem===0?C.danger:C.ink}}>{rem}</span><span style={{fontSize:11,color:C.inkMuted}}>/{lt.default_annual_quota}</span></td>;})}
              <td style={{textAlign:"center",padding:"12px 16px",fontSize:14,fontWeight:700,color:C.green}}>{tot}</td>
            </tr>;
          })}</tbody>
        </table>
      </Card>
    </div>}

    {tab==="Leave Types"&&<Card>
      <div style={{padding:"16px 20px",fontWeight:600,fontSize:15,borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span>Leave Types</span><button style={btnP}>+ Add Type</button>
      </div>
      {leaveTypes.map((lt,i)=><div key={lt.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:i<leaveTypes.length-1?`1px solid ${C.borderLight}`:"none"}}>
        <div><div style={{fontSize:14,fontWeight:500,color:C.ink}}>{lt.name}</div><div style={{fontSize:12,color:C.inkMuted}}>{lt.default_annual_quota} days per year</div></div>
        <button style={btnG}>Edit</button>
      </div>)}
      {leaveTypes.length===0&&<EmptyState icon="📋" title="No leave types" sub="Add leave types to get started"/>}
    </Card>}

    {tab==="Requests & Approvals"&&<div>
      <div style={{display:"flex",gap:10,marginBottom:16}}>
        <select value={statusF} onChange={e=>setStatusF(e.target.value)} style={{...inputSt,width:"auto"}}><option>Pending</option><option>All Statuses</option></select>
        <select value={deptF} onChange={e=>setDeptF(e.target.value)} style={{...inputSt,width:"auto"}}><option>All Departments</option>{depts.map(d=><option key={d!}>{d}</option>)}</select>
        <button onClick={()=>setDeptF("All Departments")} style={btnG}>Clear</button>
      </div>
      <Card>{pending.length===0?<EmptyState icon="✅" title="No pending requests" sub="All leave requests have been handled"/>:
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>{["EMPLOYEE","LEAVE TYPE","DATES","DAYS","REASON","STATUS",""].map(h=><th key={h} style={{padding:"11px 16px",textAlign:"left",fontSize:11.5,fontWeight:600,color:C.inkMuted}}>{h}</th>)}</tr></thead>
          <tbody>{pending.map((req,i)=>{const lt=leaveTypes.find(x=>x.id===req.leave_type_id);return <tr key={req.id} style={{borderBottom:i<pending.length-1?`1px solid ${C.borderLight}`:"none"}}>
            <td style={{padding:"12px 16px"}}><div style={{display:"flex",gap:10,alignItems:"center"}}><Avatar id={req.employee_id} name={req.empName} size={30}/><div><div style={{fontSize:13.5,fontWeight:500,color:C.green}}>{req.empName}</div><div style={{fontSize:11.5,color:C.inkMuted}}>{req.deptName}</div></div></div></td>
            <td style={{padding:"12px 16px",fontSize:13.5}}>{lt?.name}</td>
            <td style={{padding:"12px 16px",fontSize:13,color:C.green}}>{req.start_date} → {req.end_date}</td>
            <td style={{padding:"12px 16px",fontSize:13.5,fontWeight:600}}>{daysBetween(req.start_date,req.end_date)}</td>
            <td style={{padding:"12px 16px",fontSize:12.5,color:C.inkMuted,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{req.reason||"—"}</td>
            <td style={{padding:"12px 16px"}}><Badge tone="amber">Pending</Badge></td>
            <td style={{padding:"12px 16px"}}><div style={{display:"flex",gap:6}}>
              <button disabled={decidingId===req.id} onClick={()=>decide(req,true)} style={{...btnP,padding:"6px 14px",fontSize:12.5}}>Approve</button>
              <button disabled={decidingId===req.id} onClick={()=>decide(req,false)} style={{padding:"6px 14px",borderRadius:8,border:"none",background:C.dangerBg,color:C.danger,fontSize:12.5,cursor:"pointer",fontWeight:500}}>Reject</button>
            </div></td>
          </tr>;})}
          </tbody>
        </table>}
      </Card>
    </div>}

    {tab==="History"&&<div>
      <div style={{display:"flex",gap:10,marginBottom:16,alignItems:"center"}}>
        <select value={empF} onChange={e=>setEmpF(e.target.value)} style={{...inputSt,width:"auto"}}><option>All Employees</option>{employees.map(e=><option key={e.id}>{e.full_name}</option>)}</select>
        <select style={{...inputSt,width:"auto"}}><option>All Statuses</option><option>approved</option><option>rejected</option></select>
        <input type="date" style={{...inputSt,width:"auto"}}/><input type="date" style={{...inputSt,width:"auto"}}/>
        <button style={btnG}>⬇ Export CSV</button>
      </div>
      <Card>{history.length===0?<EmptyState icon="📋" title="No history found" sub="Approved and rejected leaves will appear here"/>:
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>{["EMPLOYEE","LEAVE TYPE","DATES","DAYS","STATUS","DECIDED BY","DECIDED ON"].map(h=><th key={h} style={{padding:"11px 16px",textAlign:"left",fontSize:11.5,fontWeight:600,color:C.inkMuted}}>{h}</th>)}</tr></thead>
          <tbody>{history.map((req,i)=>{const lt=leaveTypes.find(x=>x.id===req.leave_type_id);return <tr key={req.id} style={{borderBottom:i<history.length-1?`1px solid ${C.borderLight}`:"none"}}>
            <td style={{padding:"12px 16px"}}><div style={{display:"flex",gap:10,alignItems:"center"}}><Avatar id={req.employee_id} name={req.empName} size={30}/><span style={{fontSize:13.5,fontWeight:500}}>{req.empName}</span></div></td>
            <td style={{padding:"12px 16px",fontSize:13.5,color:C.green}}>{lt?.name}</td>
            <td style={{padding:"12px 16px",fontSize:13,color:C.green}}>{req.start_date} → {req.end_date}</td>
            <td style={{padding:"12px 16px",fontSize:13.5,fontWeight:600}}>{daysBetween(req.start_date,req.end_date)}</td>
            <td style={{padding:"12px 16px"}}><Badge tone={req.status==="approved"?"success":"danger"}>{req.status.charAt(0).toUpperCase()+req.status.slice(1)}</Badge></td>
            <td style={{padding:"12px 16px",fontSize:13,color:C.green}}>{req.decided_by||"—"}</td>
            <td style={{padding:"12px 16px",fontSize:13,color:C.inkMuted}}>{req.decided_at?fmtDate(req.decided_at):"—"}</td>
          </tr>;})}
          </tbody>
        </table>}
      </Card>
    </div>}
  </div>;
}
// ─── Payroll Screen ───────────────────────────────────────────────────────────
function PayrollScreen({baseUrl,token,employees}:{baseUrl:string;token:string;employees:EmployeeOut[]}) {
  const [tab,setTab]=useState("Salary Structure");
  const [sel,setSel]=useState<EmployeeOut|null>(employees[0]||null);
  const [history,setHistory]=useState<PayrollRecordOut[]>([]);
  const [showForm,setShowForm]=useState(false);
  const [fd,setFd]=useState({effective_from:new Date().toISOString().slice(0,10),basic_salary:"",hra:"",other_allowances:"",pf_deduction:"",esi_deduction:"",tds_deduction:"",remarks:""});
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState("");

  const loadHistory=useCallback(()=>{
    if(sel) api<PayrollRecordOut[]>(baseUrl,`/employees/${sel.id}/payroll`,token).then(h=>setHistory(h.sort((a,b)=>b.effective_from.localeCompare(a.effective_from)))).catch(()=>setHistory([]));
  },[baseUrl,token,sel]);

  useEffect(()=>{loadHistory();},[loadHistory]);

  const cur=history[0]||null;
  const gross=cur?cur.basic_salary+cur.hra+cur.other_allowances:0;
  const ded=cur?cur.pf_deduction+cur.esi_deduction+cur.tds_deduction:0;
  const net=gross-ded;
  const comps=cur?[
    {n:"Basic",t:"Earning",a:cur.basic_salary,tx:true},{n:"HRA",t:"Earning",a:cur.hra,tx:false},
    {n:"Conveyance",t:"Earning",a:Math.min(1600,cur.other_allowances),tx:false},
    {n:"Special Allowance",t:"Earning",a:Math.max(0,cur.other_allowances-1600),tx:true},
    {n:"PF Deduction",t:"Deduction",a:cur.pf_deduction,tx:false},{n:"ESI Deduction",t:"Deduction",a:cur.esi_deduction,tx:false},{n:"TDS Deduction",t:"Deduction",a:cur.tds_deduction,tx:true},
  ].filter(c=>c.a>0):[];

  async function savePay(){
    if(!sel||!fd.basic_salary){setMsg("Basic salary required");return;}
    setSaving(true);
    try{
      await api(baseUrl,`/employees/${sel.id}/payroll`,token,{method:"POST",body:JSON.stringify({employee_id:sel.id,effective_from:fd.effective_from,basic_salary:parseFloat(fd.basic_salary)||0,hra:parseFloat(fd.hra)||0,other_allowances:parseFloat(fd.other_allowances)||0,pf_deduction:parseFloat(fd.pf_deduction)||0,esi_deduction:parseFloat(fd.esi_deduction)||0,tds_deduction:parseFloat(fd.tds_deduction)||0,remarks:fd.remarks})});
      setMsg("Saved!");setShowForm(false);loadHistory();
    }catch(e:unknown){setMsg(e instanceof Error?e.message:"Error");}finally{setSaving(false);}
  }

  const EmpSel=()=><div style={{marginBottom:20}}>
    <label style={{fontSize:12.5,color:C.inkMuted,display:"block",marginBottom:6}}>Employee</label>
    <select value={sel?.id||""} onChange={e=>setSel(employees.find(emp=>emp.id===e.target.value)||null)} style={{...inputSt,maxWidth:420}}>
      {employees.map(e=><option key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</option>)}
    </select>
  </div>;

  return <div style={{padding:"28px 32px",fontFamily:FB}}>
    <div style={{fontSize:22,fontWeight:700,fontFamily:FD,color:C.ink,marginBottom:20}}>Payroll</div>
    <TabBar tabs={["Salary Structure","Revisions","Advances","Monthly Run","Payslips","Reports"]} active={tab} onChange={t=>{setTab(t);setMsg("");}}/>

    {tab==="Salary Structure"&&<div>
      <EmpSel/>
      {msg&&<div style={{padding:"10px 14px",borderRadius:8,background:msg.includes("Error")||msg.includes("required")?C.dangerBg:C.successBg,color:msg.includes("Error")||msg.includes("required")?C.danger:C.success,fontSize:13,marginBottom:14}}>{msg}</div>}
      {!showForm?<Card>
        <div style={{padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${C.border}`}}>
          <div style={{fontWeight:600,fontSize:15}}>Current Salary Structure</div>
          <button onClick={()=>setShowForm(true)} style={btnG}>Edit Salary</button>
        </div>
        {cur?<>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)"}}>
            {[{l:"Gross Earnings",v:fmtINR(gross),col:C.ink},{l:"Total Deductions",v:fmtINR(ded),col:C.danger},{l:"Net Payable",v:fmtINR(net),col:C.green}].map((x,i)=><div key={x.l} style={{padding:"20px 24px",borderRight:i<2?`1px solid ${C.border}`:"none"}}>
              <div style={{fontSize:11.5,color:C.inkMuted,marginBottom:4}}>{x.l}</div>
              <div style={{fontSize:26,fontWeight:700,fontFamily:FD,color:x.col}}>{x.v}</div>
            </div>)}
          </div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{borderTop:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`}}>{["COMPONENT","TYPE","AMOUNT","TAXABLE"].map(h=><th key={h} style={{padding:"10px 24px",textAlign:"left",fontSize:11.5,fontWeight:600,color:C.inkMuted}}>{h}</th>)}</tr></thead>
            <tbody>{comps.map((c,i)=><tr key={c.n} style={{borderBottom:i<comps.length-1?`1px solid ${C.borderLight}`:"none"}}>
              <td style={{padding:"12px 24px",fontSize:13.5,color:C.ink}}>{c.n}</td>
              <td style={{padding:"12px 24px"}}><Badge tone={c.t==="Earning"?"success":"danger"}>{c.t}</Badge></td>
              <td style={{padding:"12px 24px",fontSize:13.5}}>{fmtINR(c.a)}</td>
              <td style={{padding:"12px 24px"}}><Badge tone={c.tx?"amber":"neutral"}>{c.tx?"Taxable":"Non-taxable"}</Badge></td>
            </tr>)}</tbody>
          </table>
        </>:<div style={{padding:"20px 24px",textAlign:"center"}}><EmptyState icon="💰" title="No salary structure" sub="Click 'Edit Salary' to set up"/><button onClick={()=>setShowForm(true)} style={{...btnP,margin:"0 auto"}}>Set Up Salary</button></div>}
      </Card>:
      <Card style={{padding:"24px 28px"}}>
        <div style={{fontWeight:600,fontSize:15,marginBottom:20}}>{cur?"Edit":"Set Up"} Salary — {sel?.full_name}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          {[{k:"effective_from",l:"Effective From *",t:"date"},{k:"basic_salary",l:"Basic Salary *",t:"number"},{k:"hra",l:"HRA",t:"number"},{k:"other_allowances",l:"Other Allowances",t:"number"},{k:"pf_deduction",l:"PF Deduction",t:"number"},{k:"esi_deduction",l:"ESI Deduction",t:"number"},{k:"tds_deduction",l:"TDS Deduction",t:"number"},{k:"remarks",l:"Remarks",t:"text"}].map(f=><div key={f.k}>
            <label style={{fontSize:12.5,color:C.inkMuted,display:"block",marginBottom:4}}>{f.l}</label>
            <input type={f.t} value={(fd as Record<string,string>)[f.k]} onChange={e=>setFd(p=>({...p,[f.k]:e.target.value}))} style={inputSt} placeholder={f.t==="number"?"0":""}/>
          </div>)}
        </div>
        <div style={{display:"flex",gap:10,marginTop:20}}>
          <button onClick={savePay} disabled={saving} style={btnP}>{saving?"Saving…":"Save Salary"}</button>
          <button onClick={()=>setShowForm(false)} style={btnG}>Cancel</button>
        </div>
      </Card>}
    </div>}

    {tab==="Revisions"&&<div>
      <EmpSel/>
      {history.length===0?<Card><EmptyState icon="📊" title="No revisions yet" sub="Salary history will appear here"/></Card>:
      history.map((h,i)=>{const g=h.basic_salary+h.hra+h.other_allowances,d=h.pf_deduction+h.esi_deduction+h.tds_deduction,n=g-d;
        return <Card key={h.id} style={{padding:"20px 24px",marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:6}}>
                <div style={{fontSize:16,fontWeight:600,fontFamily:FD}}>Effective {h.effective_from}</div>
                {i===0&&<Badge tone="success">Current</Badge>}
              </div>
              {h.remarks&&<div style={{fontSize:12.5,color:C.inkMuted,marginBottom:4}}>Saved by {h.remarks||"Admin"}</div>}
              <div style={{fontSize:13,color:C.inkMuted}}>Gross: <b style={{color:C.ink}}>{fmtINR(g)}</b> &nbsp; Deductions: <b style={{color:C.danger}}>{fmtINR(d)}</b></div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:11.5,color:C.inkMuted,marginBottom:2}}>Net Payable</div>
              <div style={{fontSize:22,fontWeight:700,fontFamily:FD,color:C.green}}>{fmtINR(n)}</div>
              <button style={{...btnG,fontSize:12,marginTop:8}}>View full structure →</button>
            </div>
          </div>
        </Card>;
      })}
    </div>}

    {tab==="Advances"&&<div>
      <EmpSel/>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}><button style={btnP}>+ Add Advance</button></div>
      <Card style={{padding:"40px 20px"}}><EmptyState icon="💳" title="No advances recorded" sub="No advances or recoveries for this employee"/></Card>
    </div>}

    {tab==="Monthly Run"&&<Card style={{padding:"40px 32px",textAlign:"center"}}>
      <div style={{fontSize:32,marginBottom:12}}>⚙️</div>
      <div style={{fontSize:17,fontWeight:600,fontFamily:FD,color:C.ink,marginBottom:8}}>Monthly Payroll Run</div>
      <div style={{fontSize:13.5,color:C.inkMuted,maxWidth:380,margin:"0 auto 20px"}}>Generate, review, approve and publish payroll for all employees. Requires backend payroll-run feature.</div>
      <button style={{...btnP,margin:"0 auto",opacity:0.5,cursor:"not-allowed"}}>Run Payroll for This Month</button>
      <div style={{fontSize:12,color:C.inkMuted,marginTop:10}}>Coming soon — backend feature needed</div>
    </Card>}

    {tab==="Payslips"&&<div>
      <div style={{display:"flex",gap:10,marginBottom:16,alignItems:"center"}}>
        <select style={{...inputSt,width:"auto"}}><option>All Months</option></select>
        <select style={{...inputSt,width:"auto"}}>{employees.map(e=><option key={e.id}>{e.full_name}</option>)}</select>
        <div style={{marginLeft:"auto"}}><button style={btnG}>⬇ Download All</button></div>
      </div>
      <Card style={{padding:"40px 20px"}}><EmptyState icon="📄" title="No payslips found" sub="Generate and publish payroll to create payslips"/></Card>
    </div>}

    {tab==="Reports"&&<div>
      <div style={{display:"flex",gap:10,marginBottom:16,justifyContent:"flex-end"}}>
        <button style={btnG}>Export CSV</button><button style={btnG}>Export for Accounting</button>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        {["Payroll Summary","Department-wise Cost","Statutory Deductions","Advance & Recovery Summary"].map((t,i)=><button key={t} style={{padding:"8px 16px",borderRadius:8,border:`1px solid ${C.border}`,background:i===0?C.green:"transparent",color:i===0?"#fff":C.ink,fontSize:13,cursor:"pointer"}}>{t}</button>)}
      </div>
      <Card>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>{["MONTH","EMPLOYEES","TOTAL GROSS","TOTAL DEDUCTIONS","TOTAL NET PAY"].map(h=><th key={h} style={{padding:"12px 20px",textAlign:"left",fontSize:11.5,fontWeight:600,color:C.inkMuted}}>{h}</th>)}</tr></thead>
          <tbody>
            {history.length>0?<tr>
              <td style={{padding:"14px 20px",fontSize:13.5}}>{history[0].effective_from.slice(0,7)}</td>
              <td style={{padding:"14px 20px",fontSize:13.5}}>{employees.length}</td>
              <td style={{padding:"14px 20px",fontSize:13.5}}>{fmtINR(gross*employees.length)}</td>
              <td style={{padding:"14px 20px",fontSize:13.5,color:C.danger}}>{fmtINR(ded*employees.length)}</td>
              <td style={{padding:"14px 20px",fontSize:14,fontWeight:700,color:C.green}}>{fmtINR(net*employees.length)}</td>
            </tr>:<tr><td colSpan={5}><EmptyState icon="📊" title="No payroll data" sub="Run payroll to see reports"/></td></tr>}
          </tbody>
        </table>
      </Card>
    </div>}
  </div>;
}

// ─── Reports Screen ───────────────────────────────────────────────────────────
function ReportsScreen() {
  return <div style={{padding:"28px 32px",fontFamily:FB}}>
    <div style={{fontSize:22,fontWeight:700,fontFamily:FD,color:C.ink,marginBottom:24}}>Reports</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
      {[{icon:"👥",title:"Headcount Report",sub:"Employee strength by department and status"},{icon:"📅",title:"Attendance Summary",sub:"Monthly attendance rates and trends"},{icon:"🏖️",title:"Leave Utilisation",sub:"Leave taken vs available per employee"},{icon:"💰",title:"Payroll Summary",sub:"Monthly payroll cost breakdown"},{icon:"📈",title:"Performance Report",sub:"Team performance metrics from CRM"},{icon:"📊",title:"Attrition Report",sub:"Joining and exit trends over time"}]
        .map(r=><Card key={r.title} style={{padding:"20px 22px",cursor:"pointer"}}>
          <div style={{fontSize:28,marginBottom:10}}>{r.icon}</div>
          <div style={{fontSize:14,fontWeight:600,color:C.ink,marginBottom:4}}>{r.title}</div>
          <div style={{fontSize:12.5,color:C.inkMuted}}>{r.sub}</div>
        </Card>)}
    </div>
  </div>;
}
// ─── Main HRMS Shell ──────────────────────────────────────────────────────────
interface HRMSProps {
  baseUrl: string;
  token: string;
  username: string;
  onBackToCRM: () => void;
}

export default function HRMS({baseUrl,token,username,onBackToCRM}:HRMSProps) {
  const [section,setSection]=useState("Dashboard");
  const [employees,setEmployees]=useState<EmployeeOut[]>([]);
  const [openEmp,setOpenEmp]=useState<EmployeeOut|null>(null);

  useEffect(()=>{api<EmployeeOut[]>(baseUrl,"/employees",token).then(setEmployees).catch(()=>{});},[baseUrl,token]);

  const navItems=[
    {id:"Dashboard",label:"Dashboard",icon:"⊞"},
    {id:"Employees",label:"Employees",icon:"👤"},
    {id:"Attendance",label:"Attendance",icon:"🕐"},
    {id:"Leave",label:"Leave",icon:"📅"},
    {id:"Payroll",label:"Payroll",icon:"💵"},
    {id:"Reports",label:"Reports",icon:"📊"},
  ];

  const badgeCounts:Record<string,number>={Attendance:3,Leave:2,Payroll:1};
  const dateStr=new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"});

  return <div style={{display:"flex",height:"100vh",background:C.bg,fontFamily:FB,color:C.ink}}>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700;9..144,800&family=Inter:wght@400;500;600&display=swap');
      *{box-sizing:border-box;}
      ::-webkit-scrollbar{width:4px;height:4px;}
      ::-webkit-scrollbar-track{background:transparent;}
      ::-webkit-scrollbar-thumb{background:#D1D5DB;border-radius:4px;}
      button:focus{outline:none;}
    `}</style>

    {/* Sidebar */}
    <div style={{width:220,background:C.sidebarBg,display:"flex",flexDirection:"column",flexShrink:0}}>
      {/* Logo */}
      <div style={{padding:"20px 18px 16px",display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:32,height:32,borderRadius:6,background:C.amber,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontFamily:FD,fontSize:18}}>G</div>
        <div>
          <div style={{fontSize:15,fontWeight:700,fontFamily:FD,color:"#fff"}}>GROTEC</div>
          <div style={{fontSize:10,color:C.amber,fontWeight:600,letterSpacing:1}}>HRMS</div>
        </div>
      </div>

      {/* Back to CRM */}
      <div onClick={onBackToCRM} style={{margin:"0 10px 12px",padding:"7px 10px",borderRadius:6,display:"flex",alignItems:"center",gap:8,cursor:"pointer",color:C.sidebarMuted,fontSize:13}}>
        <span style={{fontSize:14}}>←</span> Back to CRM
      </div>

      <div style={{padding:"0 18px 6px",fontSize:10,fontWeight:600,color:C.sidebarMuted,letterSpacing:0.8}}>MAIN MENU</div>

      {navItems.map(item=>{
        const isA=section===item.id&&!openEmp||section===item.id;
        const badge=badgeCounts[item.id];
        return <div key={item.id} onClick={()=>{setSection(item.id);setOpenEmp(null);}} style={{margin:"1px 10px",padding:"9px 10px",borderRadius:6,cursor:"pointer",display:"flex",alignItems:"center",gap:10,background:isA?C.sidebarActive:"transparent",borderLeft:isA?`3px solid ${C.amber}`:"3px solid transparent",color:isA?"#fff":"rgba(255,255,255,0.85)",fontSize:13.5}}>
          <span style={{fontSize:15,opacity:isA?1:0.7}}>{item.icon}</span>
          <span style={{flex:1}}>{item.label}</span>
          {badge>0&&<span style={{minWidth:20,height:20,borderRadius:10,background:C.amber,color:"#fff",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 5px"}}>{badge}</span>}
        </div>;
      })}

      {/* User footer */}
      <div style={{marginTop:"auto",padding:"14px 16px",borderTop:`1px solid ${C.sidebarBorder}`,display:"flex",alignItems:"center",gap:10}}>
        <Avatar id={username} name={username} size={32}/>
        <div style={{flex:1,overflow:"hidden"}}>
          <div style={{fontSize:13,fontWeight:500,color:"#fff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{username}</div>
          <div style={{fontSize:11,color:C.sidebarMuted}}>HR Admin</div>
        </div>
      </div>
    </div>

    {/* Main content */}
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {/* Top bar */}
      <div style={{height:56,background:C.surface,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",padding:"0 28px",justifyContent:"space-between",flexShrink:0}}>
        <div style={{fontSize:13.5,fontWeight:600,color:C.ink}}>{openEmp?"Employees":section}</div>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{fontSize:13,color:C.inkMuted}}>{dateStr}</div>
          <div style={{position:"relative",cursor:"pointer"}}>
            <span style={{fontSize:18}}>🔔</span>
            <span style={{position:"absolute",top:-4,right:-6,width:16,height:16,borderRadius:8,background:C.amber,color:"#fff",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>5</span>
          </div>
          <Avatar id={username} name={username} size={32}/>
        </div>
      </div>

      {/* Page content */}
      <div style={{flex:1,overflowY:"auto"}}>
        {section==="Dashboard"&&!openEmp&&<HRMSDashboard baseUrl={baseUrl} token={token} employees={employees} onOpenEmp={e=>{setOpenEmp(e);setSection("Employees");}}/>}
        {section==="Employees"&&!openEmp&&<EmployeesList employees={employees} onOpen={setOpenEmp}/>}
        {section==="Employees"&&openEmp&&<EmployeeDetail baseUrl={baseUrl} token={token} employee={openEmp} onBack={()=>setOpenEmp(null)} allEmployees={employees}/>}
        {section==="Attendance"&&<AttendanceScreen baseUrl={baseUrl} token={token} employees={employees}/>}
        {section==="Leave"&&<LeaveScreen baseUrl={baseUrl} token={token} employees={employees}/>}
        {section==="Payroll"&&<PayrollScreen baseUrl={baseUrl} token={token} employees={employees}/>}
        {section==="Reports"&&<ReportsScreen/>}
      </div>
    </div>
  </div>;
}
