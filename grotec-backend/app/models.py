"""
GROTEC FarmerOS - Database Models
Phase 1: CRM + HRMS + ESSL Biometric (stub)

Design notes (thanglish comments for reference):
- CRM oda "employee" (telecaller) um HRMS oda employee um SAME record.
  -> `employees` table dhaan single source. `users` table login/auth ku.
  -> oru employee ku oru user account (1:1), role adha base panni access control.
- Payroll: version wise store aagum, over-write aagadhu -> `payroll_records`
  la every revision oru puthu row (effective_from date kooda).
- Calls: 3 outcomes mattum (interested / not_interested / not_answered).
  interested -> sub_outcome (callback / sales).
- Attendance: ESSL biometric device source of raw punches, aana HRMS
  (`attendance_records`) thaan final "system of record" -> raw ESSL
  punches oru separate table la vandhu, HRMS table ku sync/merge aagum.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Enum, ForeignKey, Integer,
    Numeric, String, Text, UniqueConstraint
)
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func

Base = declarative_base()


def gen_uuid():
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# ENUMS
# ---------------------------------------------------------------------------

class RoleEnum(str, enum.Enum):
    founder = "founder"          # full access + audit logs
    manager = "manager"          # almost founder, no audit logs
    telecaller = "telecaller"    # CRM only, own work only
    staff = "staff"              # HRMS / payroll related work


class CallOutcomeEnum(str, enum.Enum):
    interested = "interested"
    not_interested = "not_interested"
    not_answered = "not_answered"


class InterestedSubOutcomeEnum(str, enum.Enum):
    callback = "callback"
    sales = "sales"


class LeaveStatusEnum(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class AttendanceSourceEnum(str, enum.Enum):
    essl = "essl"          # biometric device punch
    manual = "manual"      # HR entered manually
    web = "web"            # web check-in (fallback, no device)


# ---------------------------------------------------------------------------
# AUTH / USERS
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    is_active = Column(Boolean, default=True)

    # 1:1 link to employee record (CRM telecaller = HRMS employee, single record)
    employee_id = Column(String(36), ForeignKey("employees.id"), unique=True, nullable=True)
    employee = relationship("Employee", back_populates="user", foreign_keys=[employee_id])

    created_at = Column(DateTime, server_default=func.now())
    last_login_at = Column(DateTime, nullable=True)


class AuditLog(Base):
    """Founder-only visibility. Manager/Admin cannot view these."""
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    actor_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    action = Column(String(255), nullable=False)      # e.g. "call.create", "payroll.revise"
    entity_type = Column(String(100), nullable=True)  # e.g. "customer", "employee"
    entity_id = Column(String(36), nullable=True)
    meta_json = Column(Text, nullable=True)            # freeform JSON string for details
    created_at = Column(DateTime, server_default=func.now())


# ---------------------------------------------------------------------------
# HRMS
# ---------------------------------------------------------------------------

class Employee(Base):
    __tablename__ = "employees"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    employee_code = Column(String(50), unique=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    designation = Column(String(100), nullable=True)   # e.g. "Telecaller", "Relationship Manager"
    department = Column(String(100), nullable=True)
    date_of_joining = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True)

    user = relationship("User", back_populates="employee", uselist=False, foreign_keys=[User.employee_id])
    attendance_records = relationship("AttendanceRecord", back_populates="employee")
    leave_requests = relationship("LeaveRequest", back_populates="employee")
    payroll_records = relationship("PayrollRecord", back_populates="employee")
    calls = relationship("Call", back_populates="agent", foreign_keys="[Call.agent_employee_id]")

    created_at = Column(DateTime, server_default=func.now())


class EsslRawPunch(Base):
    """Raw punch data pulled from ESSL biometric device (before merge into HRMS record)."""
    __tablename__ = "essl_raw_punches"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    device_employee_code = Column(String(50), nullable=False)  # code as per ESSL device, may need mapping
    punch_time = Column(DateTime, nullable=False)
    punch_type = Column(String(10), nullable=True)  # "in" / "out" if device provides it
    raw_payload = Column(Text, nullable=True)        # store original device payload for debugging
    synced_to_attendance = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())


class AttendanceRecord(Base):
    """HRMS system-of-record attendance (merged from ESSL punches or manual/web entry)."""
    __tablename__ = "attendance_records"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    attendance_date = Column(Date, nullable=False)
    check_in = Column(DateTime, nullable=True)
    check_out = Column(DateTime, nullable=True)
    source = Column(Enum(AttendanceSourceEnum), default=AttendanceSourceEnum.essl)
    status = Column(String(20), default="present")  # present / absent / half_day / on_leave
    notes = Column(Text, nullable=True)

    employee = relationship("Employee", back_populates="attendance_records")

    __table_args__ = (
        UniqueConstraint("employee_id", "attendance_date", name="uq_employee_date"),
    )


class LeaveType(Base):
    __tablename__ = "leave_types"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(100), nullable=False, unique=True)   # e.g. "Casual Leave", "Sick Leave"
    default_annual_quota = Column(Integer, default=0)


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    leave_type_id = Column(String(36), ForeignKey("leave_types.id"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    reason = Column(Text, nullable=True)
    status = Column(Enum(LeaveStatusEnum), default=LeaveStatusEnum.pending)
    approved_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    employee = relationship("Employee", back_populates="leave_requests")


class PayrollRecord(Base):
    """
    Version-wise salary storage. Each revision = new row (never overwritten).
    Current active record = the one with latest effective_from <= today
    and (superseded_by IS NULL or effective_from of this row is the max).
    """
    __tablename__ = "payroll_records"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    effective_from = Column(Date, nullable=False)
    basic_salary = Column(Numeric(12, 2), nullable=False)
    hra = Column(Numeric(12, 2), default=0)
    other_allowances = Column(Numeric(12, 2), default=0)
    pf_deduction = Column(Numeric(12, 2), default=0)   # statutory - rules TBC by GROTEC
    esi_deduction = Column(Numeric(12, 2), default=0)  # statutory - rules TBC by GROTEC
    tds_deduction = Column(Numeric(12, 2), default=0)  # statutory - rules TBC by GROTEC
    remarks = Column(String(255), nullable=True)       # e.g. "Annual increment FY25-26"
    created_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    employee = relationship("Employee", back_populates="payroll_records")


class Payslip(Base):
    __tablename__ = "payslips"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    payroll_record_id = Column(String(36), ForeignKey("payroll_records.id"), nullable=False)
    month = Column(Integer, nullable=False)   # 1-12
    year = Column(Integer, nullable=False)
    gross_pay = Column(Numeric(12, 2), nullable=False)
    total_deductions = Column(Numeric(12, 2), nullable=False)
    net_pay = Column(Numeric(12, 2), nullable=False)
    generated_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("employee_id", "month", "year", name="uq_employee_payslip_month"),
    )


# ---------------------------------------------------------------------------
# CRM
# ---------------------------------------------------------------------------

class Customer(Base):
    __tablename__ = "customers"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=False, index=True)
    village = Column(String(150), nullable=True)
    crop_type = Column(String(150), nullable=True)
    land_size_acres = Column(Numeric(6, 2), nullable=True)

    # ownership: telecaller works the lead; on "sales" outcome, RM takes ownership
    owner_employee_id = Column(String(36), ForeignKey("employees.id"), nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    calls = relationship("Call", back_populates="customer")


class Product(Base):
    __tablename__ = "products"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False)
    category = Column(String(150), nullable=True)
    description = Column(Text, nullable=True)


class KnowledgeBaseEntry(Base):
    """Crop problem -> recommended product. Searchable by telecaller mid-call."""
    __tablename__ = "knowledge_base_entries"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    crop_type = Column(String(150), nullable=False, index=True)
    problem_description = Column(Text, nullable=False)
    recommended_product_id = Column(String(36), ForeignKey("products.id"), nullable=True)
    notes = Column(Text, nullable=True)


class Call(Base):
    """
    Core Agent Workflow record.
    Flow: Dial -> view customer -> record outcome -> next step.
    """
    __tablename__ = "calls"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    customer_id = Column(String(36), ForeignKey("customers.id"), nullable=False)
    agent_employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False)

    called_at = Column(DateTime, server_default=func.now())
    outcome = Column(Enum(CallOutcomeEnum), nullable=False)

    # only relevant when outcome == interested
    sub_outcome = Column(Enum(InterestedSubOutcomeEnum), nullable=True)
    callback_datetime = Column(DateTime, nullable=True)         # set when sub_outcome == callback
    transferred_to_employee_id = Column(String(36), ForeignKey("employees.id"), nullable=True)  # RM, when sub_outcome == sales

    notes = Column(Text, nullable=True)
    knowledge_base_entry_id = Column(String(36), ForeignKey("knowledge_base_entries.id"), nullable=True)

    customer = relationship("Customer", back_populates="calls")
    agent = relationship("Employee", back_populates="calls", foreign_keys=[agent_employee_id])
