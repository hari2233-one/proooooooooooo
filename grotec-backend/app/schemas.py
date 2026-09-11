from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from .models import CallOutcomeEnum, InterestedSubOutcomeEnum, RoleEnum


# ---------------------------------------------------------------------------
# Employee / User
# ---------------------------------------------------------------------------

class EmployeeCreate(BaseModel):
    employee_code: str
    full_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    date_of_joining: Optional[date] = None


class EmployeeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    employee_code: str
    full_name: str
    designation: Optional[str] = None
    is_active: bool


# ---------------------------------------------------------------------------
# Customer
# ---------------------------------------------------------------------------

class CustomerCreate(BaseModel):
    full_name: str
    phone: str
    village: Optional[str] = None
    crop_type: Optional[str] = None
    land_size_acres: Optional[float] = None


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    full_name: str
    phone: str
    village: Optional[str] = None
    crop_type: Optional[str] = None
    owner_employee_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Call (Agent Workflow core)
# ---------------------------------------------------------------------------

class CallCreate(BaseModel):
    customer_id: str
    agent_employee_id: str
    outcome: CallOutcomeEnum
    sub_outcome: Optional[InterestedSubOutcomeEnum] = None
    callback_datetime: Optional[datetime] = None
    transferred_to_employee_id: Optional[str] = None
    notes: Optional[str] = None
    knowledge_base_entry_id: Optional[str] = None


class CallOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    customer_id: str
    agent_employee_id: str
    called_at: datetime
    outcome: CallOutcomeEnum
    sub_outcome: Optional[InterestedSubOutcomeEnum] = None
    callback_datetime: Optional[datetime] = None
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Knowledge Base
# ---------------------------------------------------------------------------

class KnowledgeBaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    crop_type: str
    problem_description: str
    recommended_product_id: Optional[str] = None
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Attendance
# ---------------------------------------------------------------------------

class AttendanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    employee_id: str
    attendance_date: date
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    status: str


# ---------------------------------------------------------------------------
# Leave
# ---------------------------------------------------------------------------

class LeaveRequestCreate(BaseModel):
    employee_id: str
    leave_type_id: str
    start_date: date
    end_date: date
    reason: Optional[str] = None


class LeaveRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    employee_id: str
    leave_type_id: str
    start_date: date
    end_date: date
    reason: Optional[str] = None
    status: str


class LeaveTypeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    default_annual_quota: int


# ---------------------------------------------------------------------------
# Payroll
# ---------------------------------------------------------------------------

class PayrollRecordCreate(BaseModel):
    employee_id: str
    effective_from: date
    basic_salary: float
    hra: float = 0
    other_allowances: float = 0
    pf_deduction: float = 0
    esi_deduction: float = 0
    tds_deduction: float = 0
    remarks: Optional[str] = None


class PayrollRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    employee_id: str
    effective_from: date
    basic_salary: float
    hra: float
    other_allowances: float
    pf_deduction: float
    esi_deduction: float
    tds_deduction: float
    remarks: Optional[str] = None
    created_at: datetime
