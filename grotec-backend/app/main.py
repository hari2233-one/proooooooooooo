"""
GROTEC FarmerOS - Backend API (Phase 1)

Run:
    pip install -r requirements.txt
    uvicorn app.main:app --reload

Then open http://localhost:8000/docs for interactive Swagger UI.
"""

import logging
import time
import uuid
from datetime import date, datetime
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from . import auth, models, schemas
from .database import get_db, init_db
from .models import RoleEnum

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("grotec")

app = FastAPI(title="GROTEC FarmerOS API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # dev only - production la restrict pannunga
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Ella request kum oru id kudukirom - logs la trace panna easy aagum."""
    request_id = str(uuid.uuid4())[:8]
    start = time.monotonic()
    try:
        response = await call_next(request)
    except Exception:
        # Unexpected crash - log full traceback, don't let it leak to the client silently.
        logger.exception("[%s] Unhandled error on %s %s", request_id, request.method, request.url.path)
        raise
    duration_ms = (time.monotonic() - start) * 1000
    logger.info(
        "[%s] %s %s -> %s (%.1fms)",
        request_id, request.method, request.url.path, response.status_code, duration_ms,
    )
    response.headers["X-Request-ID"] = request_id
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Pydantic validation errors ku consistent JSON shape - frontend ku predictable ah irukum."""
    logger.warning("Validation error on %s %s: %s", request.method, request.url.path, exc.errors())
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


@app.exception_handler(SQLAlchemyError)
async def db_exception_handler(request: Request, exc: SQLAlchemyError):
    """DB errors ku client ku raw stack trace kaatatha - generic message mattum kudukirom."""
    logger.exception("Database error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "A database error occurred. Please try again."})


@app.on_event("startup")
def on_startup():
    init_db()
    logger.info("GROTEC FarmerOS API started - DB initialized")


@app.get("/health")
def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# AUTH
# ---------------------------------------------------------------------------

@app.post("/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter_by(username=form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        logger.warning("Failed login attempt for username=%s", form_data.username)
        raise HTTPException(401, "Incorrect username or password")
    if not user.is_active:
        raise HTTPException(403, "Account is inactive")
    user.last_login_at = datetime.utcnow()
    db.commit()
    token = auth.create_access_token(user_id=user.id, role=user.role.value)
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role.value,
        "employee_id": user.employee_id,
    }


@app.get("/auth/me")
def get_me(user: models.User = Depends(auth.get_current_user)):
    return {
        "user_id": user.id,
        "username": user.username,
        "role": user.role.value,
        "employee_id": user.employee_id,
    }


@app.get("/audit-logs")
def list_audit_logs(
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.require_roles(RoleEnum.founder)),  # founder ONLY, per PRD
):
    logs = db.query(models.AuditLog).order_by(models.AuditLog.created_at.desc()).limit(200).all()
    return [
        {
            "id": l.id, "actor_user_id": l.actor_user_id, "action": l.action,
            "entity_type": l.entity_type, "entity_id": l.entity_id, "created_at": l.created_at,
        }
        for l in logs
    ]


# ---------------------------------------------------------------------------
# EMPLOYEES (HRMS)
# ---------------------------------------------------------------------------

@app.post("/employees", response_model=schemas.EmployeeOut)
def create_employee(
    payload: schemas.EmployeeCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.require_roles(RoleEnum.founder, RoleEnum.manager, RoleEnum.staff)),
):
    existing = db.query(models.Employee).filter_by(employee_code=payload.employee_code).first()
    if existing:
        raise HTTPException(400, "employee_code already exists")
    emp = models.Employee(**payload.model_dump())
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp


@app.get("/employees", response_model=List[schemas.EmployeeOut])
def list_employees(db: Session = Depends(get_db), user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Employee).filter_by(is_active=True).all()


@app.get("/employees/{employee_id}", response_model=schemas.EmployeeOut)
def get_employee(employee_id: str, db: Session = Depends(get_db), user: models.User = Depends(auth.get_current_user)):
    emp = db.get(models.Employee, employee_id)
    if not emp:
        raise HTTPException(404, "employee not found")
    return emp


# ---------------------------------------------------------------------------
# CUSTOMERS (CRM)
# ---------------------------------------------------------------------------

@app.post("/customers", response_model=schemas.CustomerOut)
def create_customer(
    payload: schemas.CustomerCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.require_roles(RoleEnum.founder, RoleEnum.manager, RoleEnum.telecaller)),
):
    cust = models.Customer(**payload.model_dump())
    db.add(cust)
    db.commit()
    db.refresh(cust)
    return cust


@app.get("/customers", response_model=List[schemas.CustomerOut])
def list_customers(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.require_roles(RoleEnum.founder, RoleEnum.manager, RoleEnum.telecaller)),
):
    q = db.query(models.Customer)
    if search:
        like = f"%{search}%"
        q = q.filter(
            (models.Customer.full_name.ilike(like)) | (models.Customer.phone.ilike(like))
        )
    return q.order_by(models.Customer.created_at.desc()).all()


@app.get("/customers/{customer_id}", response_model=schemas.CustomerOut)
def get_customer(
    customer_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.require_roles(RoleEnum.founder, RoleEnum.manager, RoleEnum.telecaller)),
):
    cust = db.get(models.Customer, customer_id)
    if not cust:
        raise HTTPException(404, "customer not found")
    return cust


@app.get("/customers/{customer_id}/calls", response_model=List[schemas.CallOut])
def get_customer_call_history(
    customer_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.require_roles(RoleEnum.founder, RoleEnum.manager, RoleEnum.telecaller)),
):
    """Telecaller full-screen workspace ku - customer history single screen la."""
    return (
        db.query(models.Call)
        .filter_by(customer_id=customer_id)
        .order_by(models.Call.called_at.desc())
        .all()
    )


# ---------------------------------------------------------------------------
# AGENT WORKFLOW - CORE (Dial -> view -> record outcome -> next step)
# ---------------------------------------------------------------------------

@app.post("/calls", response_model=schemas.CallOut)
def record_call(
    payload: schemas.CallCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.require_roles(RoleEnum.founder, RoleEnum.manager, RoleEnum.telecaller)),
):
    """
    Core Agent Workflow endpoint. 3 outcomes only:
      - not_answered
      - not_interested
      - interested -> requires sub_outcome (callback | sales)
          - callback -> requires callback_datetime
          - sales    -> transfers customer ownership to RM (transferred_to_employee_id)

    Telecaller role: "own work mattum" rule - can only log calls under their OWN employee_id.
    Founder/Manager can log on behalf of any agent.
    """
    if user.role == RoleEnum.telecaller and payload.agent_employee_id != user.employee_id:
        raise HTTPException(403, "Telecallers can only record calls under their own employee_id")

    customer = db.get(models.Customer, payload.customer_id)
    if not customer:
        raise HTTPException(404, "customer not found")
    agent = db.get(models.Employee, payload.agent_employee_id)
    if not agent:
        raise HTTPException(404, "agent (employee) not found")

    if payload.outcome == models.CallOutcomeEnum.interested:
        if not payload.sub_outcome:
            raise HTTPException(422, "sub_outcome (callback/sales) required when outcome=interested")
        if payload.sub_outcome == models.InterestedSubOutcomeEnum.callback and not payload.callback_datetime:
            raise HTTPException(422, "callback_datetime required when sub_outcome=callback")
        if payload.sub_outcome == models.InterestedSubOutcomeEnum.sales:
            if not payload.transferred_to_employee_id:
                raise HTTPException(422, "transferred_to_employee_id (RM) required when sub_outcome=sales")
            rm = db.get(models.Employee, payload.transferred_to_employee_id)
            if not rm:
                raise HTTPException(404, "transferred_to_employee (RM) not found")
            # ownership transfer happens here
            customer.owner_employee_id = rm.id
    else:
        if payload.sub_outcome:
            raise HTTPException(422, "sub_outcome only valid when outcome=interested")

    call = models.Call(**payload.model_dump())
    db.add(call)
    db.commit()
    db.refresh(call)
    return call


def _enforce_own_work_or_elevated(employee_id: str, user: models.User):
    """Shared guard: telecaller can only view own employee_id data; others (founder/manager) any."""
    if user.role == RoleEnum.telecaller and employee_id != user.employee_id:
        raise HTTPException(403, "Telecallers can only view their own work")


@app.get("/agents/{employee_id}/calls", response_model=List[schemas.CallOut])
def get_agent_calls(
    employee_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.require_roles(RoleEnum.founder, RoleEnum.manager, RoleEnum.telecaller)),
):
    """Telecaller 'own work mattum paaka mudiyum' role rule - filtered by agent."""
    _enforce_own_work_or_elevated(employee_id, user)
    return (
        db.query(models.Call)
        .filter_by(agent_employee_id=employee_id)
        .order_by(models.Call.called_at.desc())
        .all()
    )


@app.get("/agents/{employee_id}/callbacks", response_model=List[schemas.CallOut])
def get_pending_callbacks(
    employee_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.require_roles(RoleEnum.founder, RoleEnum.manager, RoleEnum.telecaller)),
):
    """Agent oda upcoming callback queue - dashboard ku."""
    _enforce_own_work_or_elevated(employee_id, user)
    return (
        db.query(models.Call)
        .filter_by(
            agent_employee_id=employee_id,
            outcome=models.CallOutcomeEnum.interested,
            sub_outcome=models.InterestedSubOutcomeEnum.callback,
        )
        .filter(models.Call.callback_datetime >= datetime.utcnow())
        .order_by(models.Call.callback_datetime.asc())
        .all()
    )


# ---------------------------------------------------------------------------
# KNOWLEDGE BASE (search during call)
# ---------------------------------------------------------------------------

@app.get("/knowledge-base/search", response_model=List[schemas.KnowledgeBaseOut])
def search_knowledge_base(
    crop_type: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.require_roles(RoleEnum.founder, RoleEnum.manager, RoleEnum.telecaller)),
):
    query = db.query(models.KnowledgeBaseEntry)
    if crop_type:
        query = query.filter(models.KnowledgeBaseEntry.crop_type.ilike(f"%{crop_type}%"))
    if q:
        query = query.filter(models.KnowledgeBaseEntry.problem_description.ilike(f"%{q}%"))
    return query.all()


# ---------------------------------------------------------------------------
# ATTENDANCE (ESSL stub + HRMS system-of-record)
# ---------------------------------------------------------------------------

@app.post("/essl/webhook")
def essl_webhook(
    device_employee_code: str,
    punch_time: datetime,
    punch_type: Optional[str] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.require_roles(RoleEnum.founder, RoleEnum.manager, RoleEnum.staff)),
):
    """
    STUB endpoint - real ESSL device/vendor ku itha replace pannanum
    once vendor confirm aagum (PRD open item). Idhu raw punch store pannum mattum;
    'sync to attendance' step separate ah run pannanum (batch job / manual trigger).

    NOTE: real device integration vandhale, idhu likely device-key/service-account auth
    ku maaralam (not a human login) - idhu placeholder role-guard mattum.
    """
    punch = models.EsslRawPunch(
        device_employee_code=device_employee_code,
        punch_time=punch_time,
        punch_type=punch_type,
    )
    db.add(punch)
    db.commit()
    return {"status": "received", "punch_id": punch.id}


@app.get("/employees/{employee_id}/attendance", response_model=List[schemas.AttendanceOut])
def get_attendance(
    employee_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.require_roles(RoleEnum.founder, RoleEnum.manager, RoleEnum.staff)),
):
    return (
        db.query(models.AttendanceRecord)
        .filter_by(employee_id=employee_id)
        .order_by(models.AttendanceRecord.attendance_date.desc())
        .all()
    )


# ---------------------------------------------------------------------------
# LEAVE
# ---------------------------------------------------------------------------

@app.post("/leave-requests")
def create_leave_request(
    payload: schemas.LeaveRequestCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),  # any authenticated employee can request own leave
):
    if not db.get(models.Employee, payload.employee_id):
        raise HTTPException(404, "employee not found")
    if not db.get(models.LeaveType, payload.leave_type_id):
        raise HTTPException(404, "leave_type not found")
    if payload.end_date < payload.start_date:
        raise HTTPException(422, "end_date cannot be before start_date")

    leave = models.LeaveRequest(**payload.model_dump())
    db.add(leave)
    db.commit()
    db.refresh(leave)
    return {"id": leave.id, "status": leave.status}


@app.get("/leave-types", response_model=List[schemas.LeaveTypeOut])
def list_leave_types(db: Session = Depends(get_db), user: models.User = Depends(auth.get_current_user)):
    return db.query(models.LeaveType).all()


@app.get("/employees/{employee_id}/leave-requests", response_model=List[schemas.LeaveRequestOut])
def get_employee_leave_requests(
    employee_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.require_roles(RoleEnum.founder, RoleEnum.manager, RoleEnum.staff)),
):
    if not db.get(models.Employee, employee_id):
        raise HTTPException(404, "employee not found")
    return (
        db.query(models.LeaveRequest)
        .filter_by(employee_id=employee_id)
        .order_by(models.LeaveRequest.start_date.desc())
        .all()
    )


@app.post("/leave-requests/{leave_request_id}/decision", response_model=schemas.LeaveRequestOut)
def decide_leave_request(
    leave_request_id: str,
    approve: bool,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.require_roles(RoleEnum.founder, RoleEnum.manager, RoleEnum.staff)),
):
    """Approve or reject a pending leave request. Idempotent-safe: only acts on 'pending' requests."""
    leave = db.get(models.LeaveRequest, leave_request_id)
    if not leave:
        raise HTTPException(404, "leave request not found")
    if leave.status != models.LeaveStatusEnum.pending:
        raise HTTPException(422, f"leave request is already '{leave.status.value}', cannot re-decide")

    leave.status = models.LeaveStatusEnum.approved if approve else models.LeaveStatusEnum.rejected
    leave.approved_by_user_id = user.id
    db.commit()
    db.refresh(leave)
    return leave


# ---------------------------------------------------------------------------
# PAYROLL - version-wise. Every revision is a new row, never overwritten.
# ---------------------------------------------------------------------------

@app.post("/employees/{employee_id}/payroll", response_model=schemas.PayrollRecordOut)
def create_payroll_record(
    employee_id: str,
    payload: schemas.PayrollRecordCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.require_roles(RoleEnum.founder, RoleEnum.manager, RoleEnum.staff)),
):
    if employee_id != payload.employee_id:
        raise HTTPException(422, "employee_id in URL and body must match")
    if not db.get(models.Employee, employee_id):
        raise HTTPException(404, "employee not found")
    if payload.basic_salary < 0:
        raise HTTPException(422, "basic_salary cannot be negative")

    record = models.PayrollRecord(**payload.model_dump(), created_by_user_id=user.id)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@app.get("/employees/{employee_id}/payroll", response_model=List[schemas.PayrollRecordOut])
def get_payroll_history(
    employee_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.require_roles(RoleEnum.founder, RoleEnum.manager, RoleEnum.staff)),
):
    """Full version history, latest first - never overwritten, so this IS the audit trail."""
    if not db.get(models.Employee, employee_id):
        raise HTTPException(404, "employee not found")
    return (
        db.query(models.PayrollRecord)
        .filter_by(employee_id=employee_id)
        .order_by(models.PayrollRecord.effective_from.desc())
        .all()
    )


@app.get("/employees/{employee_id}/payroll/current", response_model=schemas.PayrollRecordOut)
def get_current_payroll(
    employee_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.require_roles(RoleEnum.founder, RoleEnum.manager, RoleEnum.staff)),
):
    """The single active salary record - most recent effective_from that isn't in the future."""
    if not db.get(models.Employee, employee_id):
        raise HTTPException(404, "employee not found")
    record = (
        db.query(models.PayrollRecord)
        .filter(models.PayrollRecord.employee_id == employee_id, models.PayrollRecord.effective_from <= date.today())
        .order_by(models.PayrollRecord.effective_from.desc())
        .first()
    )
    if not record:
        raise HTTPException(404, "no active payroll record for this employee")
    return record
