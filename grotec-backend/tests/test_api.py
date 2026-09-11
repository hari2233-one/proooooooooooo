"""
GROTEC FarmerOS - Automated test suite.

Run: pytest tests/test_api.py -v

Uses a fresh isolated SQLite DB per test session (not the dev grotec_farmeros.db),
so this never touches your real seeded data.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

TEST_DB_PATH = "./test_grotec.db"
if os.path.exists(TEST_DB_PATH):
    os.remove(TEST_DB_PATH)
os.environ["GROTEC_DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import init_db, SessionLocal
from app import models
from app.auth import hash_password

init_db()


@pytest.fixture(scope="session", autouse=True)
def seed():
    db = SessionLocal()

    telecaller = models.Employee(employee_code="T1", full_name="Telecaller One", designation="Telecaller")
    telecaller2 = models.Employee(employee_code="T2", full_name="Telecaller Two", designation="Telecaller")
    rm = models.Employee(employee_code="RM1", full_name="RM One", designation="Relationship Manager")
    founder_emp = models.Employee(employee_code="F1", full_name="Founder One", designation="Founder")
    staff_emp = models.Employee(employee_code="S1", full_name="Staff One", designation="Staff")
    inactive_emp = models.Employee(employee_code="X1", full_name="Inactive One", designation="Telecaller")
    db.add_all([telecaller, telecaller2, rm, founder_emp, staff_emp, inactive_emp])
    db.commit()

    users = {
        "telecaller": models.User(username="t_user", password_hash=hash_password("pass123"),
                                    role=models.RoleEnum.telecaller, employee_id=telecaller.id),
        "telecaller2": models.User(username="t2_user", password_hash=hash_password("pass123"),
                                     role=models.RoleEnum.telecaller, employee_id=telecaller2.id),
        "manager": models.User(username="m_user", password_hash=hash_password("pass123"),
                                 role=models.RoleEnum.manager, employee_id=rm.id),
        "founder": models.User(username="f_user", password_hash=hash_password("pass123"),
                                 role=models.RoleEnum.founder, employee_id=founder_emp.id),
        "staff": models.User(username="s_user", password_hash=hash_password("pass123"),
                               role=models.RoleEnum.staff, employee_id=staff_emp.id),
        "inactive": models.User(username="i_user", password_hash=hash_password("pass123"),
                                  role=models.RoleEnum.telecaller, employee_id=inactive_emp.id, is_active=False),
    }
    db.add_all(users.values())
    db.commit()

    customer = models.Customer(full_name="Test Customer", phone="9000000000", crop_type="Cotton")
    db.add(customer)
    db.commit()

    kb = models.KnowledgeBaseEntry(crop_type="Cotton", problem_description="Yellow leaves", notes="Use NPK")
    db.add(kb)
    db.commit()

    leave_type = models.LeaveType(name="Casual Leave", default_annual_quota=12)
    db.add(leave_type)
    db.commit()

    ids = {
        "telecaller_emp": telecaller.id,
        "telecaller2_emp": telecaller2.id,
        "rm_emp": rm.id,
        "founder_emp": founder_emp.id,
        "staff_emp": staff_emp.id,
        "customer": customer.id,
        "kb": kb.id,
        "leave_type": leave_type.id,
    }
    db.close()
    return ids


@pytest.fixture(scope="session")
def leave_type_id(seed):
    return seed["leave_type"]


@pytest.fixture(scope="session")
def client():
    return TestClient(app)


@pytest.fixture(scope="session")
def tokens(client):
    toks = {}
    for role, username in [
        ("telecaller", "t_user"), ("telecaller2", "t2_user"), ("manager", "m_user"),
        ("founder", "f_user"), ("staff", "s_user"),
    ]:
        r = client.post("/auth/login", data={"username": username, "password": "pass123"})
        assert r.status_code == 200, f"login failed for {username}: {r.text}"
        toks[role] = r.json()["access_token"]
    return toks


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# AUTH
# ---------------------------------------------------------------------------

class TestAuth:
    def test_login_wrong_password(self, client):
        r = client.post("/auth/login", data={"username": "t_user", "password": "wrong"})
        assert r.status_code == 401

    def test_login_nonexistent_user(self, client):
        r = client.post("/auth/login", data={"username": "nope", "password": "x"})
        assert r.status_code == 401

    def test_login_inactive_user(self, client):
        r = client.post("/auth/login", data={"username": "i_user", "password": "pass123"})
        assert r.status_code == 403, f"expected 403 for inactive user, got {r.status_code}: {r.text}"

    def test_no_token_rejected(self, client):
        r = client.get("/customers")
        assert r.status_code == 401

    def test_garbage_token_rejected(self, client):
        r = client.get("/customers", headers=auth_headers("garbage.token.value"))
        assert r.status_code == 401

    def test_me_endpoint(self, client, tokens):
        r = client.get("/auth/me", headers=auth_headers(tokens["telecaller"]))
        assert r.status_code == 200
        assert r.json()["username"] == "t_user"


# ---------------------------------------------------------------------------
# ROLE ENFORCEMENT
# ---------------------------------------------------------------------------

class TestRoles:
    def test_telecaller_cannot_view_audit_logs(self, client, tokens):
        r = client.get("/audit-logs", headers=auth_headers(tokens["telecaller"]))
        assert r.status_code == 403

    def test_manager_cannot_view_audit_logs(self, client, tokens):
        r = client.get("/audit-logs", headers=auth_headers(tokens["manager"]))
        assert r.status_code == 403, "PRD: manager should NOT have audit log access"

    def test_founder_can_view_audit_logs(self, client, tokens):
        r = client.get("/audit-logs", headers=auth_headers(tokens["founder"]))
        assert r.status_code == 200

    def test_staff_cannot_access_customers(self, client, tokens):
        r = client.get("/customers", headers=auth_headers(tokens["staff"]))
        assert r.status_code == 403, "PRD: staff role is HRMS/payroll only, not CRM"

    def test_telecaller_cannot_hit_essl_webhook(self, client, tokens):
        r = client.post(
            "/essl/webhook",
            params={"device_employee_code": "T1", "punch_time": "2026-01-01T09:00:00"},
            headers=auth_headers(tokens["telecaller"]),
        )
        assert r.status_code == 403

    def test_staff_can_hit_essl_webhook(self, client, tokens):
        r = client.post(
            "/essl/webhook",
            params={"device_employee_code": "T1", "punch_time": "2026-01-01T09:00:00"},
            headers=auth_headers(tokens["staff"]),
        )
        assert r.status_code == 200


# ---------------------------------------------------------------------------
# AGENT WORKFLOW - CORE
# ---------------------------------------------------------------------------

class TestAgentWorkflow:
    def test_telecaller_own_work_call(self, client, tokens, seed):
        r = client.post(
            "/calls",
            headers=auth_headers(tokens["telecaller"]),
            json={"customer_id": seed["customer"], "agent_employee_id": seed["telecaller_emp"], "outcome": "not_answered"},
        )
        assert r.status_code == 200, r.text

    def test_telecaller_cannot_log_call_for_another_agent(self, client, tokens, seed):
        r = client.post(
            "/calls",
            headers=auth_headers(tokens["telecaller"]),
            json={"customer_id": seed["customer"], "agent_employee_id": seed["telecaller2_emp"], "outcome": "not_answered"},
        )
        assert r.status_code == 403

    def test_manager_can_log_call_for_any_agent(self, client, tokens, seed):
        r = client.post(
            "/calls",
            headers=auth_headers(tokens["manager"]),
            json={"customer_id": seed["customer"], "agent_employee_id": seed["telecaller_emp"], "outcome": "not_answered"},
        )
        assert r.status_code == 200, r.text

    def test_interested_without_suboutcome_rejected(self, client, tokens, seed):
        r = client.post(
            "/calls",
            headers=auth_headers(tokens["telecaller"]),
            json={"customer_id": seed["customer"], "agent_employee_id": seed["telecaller_emp"], "outcome": "interested"},
        )
        assert r.status_code == 422

    def test_suboutcome_without_interested_rejected(self, client, tokens, seed):
        r = client.post(
            "/calls",
            headers=auth_headers(tokens["telecaller"]),
            json={
                "customer_id": seed["customer"], "agent_employee_id": seed["telecaller_emp"],
                "outcome": "not_interested", "sub_outcome": "callback",
            },
        )
        assert r.status_code == 422

    def test_callback_without_datetime_rejected(self, client, tokens, seed):
        r = client.post(
            "/calls",
            headers=auth_headers(tokens["telecaller"]),
            json={
                "customer_id": seed["customer"], "agent_employee_id": seed["telecaller_emp"],
                "outcome": "interested", "sub_outcome": "callback",
            },
        )
        assert r.status_code == 422

    def test_sales_without_rm_rejected(self, client, tokens, seed):
        r = client.post(
            "/calls",
            headers=auth_headers(tokens["telecaller"]),
            json={
                "customer_id": seed["customer"], "agent_employee_id": seed["telecaller_emp"],
                "outcome": "interested", "sub_outcome": "sales",
            },
        )
        assert r.status_code == 422

    def test_sales_with_nonexistent_rm_rejected(self, client, tokens, seed):
        r = client.post(
            "/calls",
            headers=auth_headers(tokens["telecaller"]),
            json={
                "customer_id": seed["customer"], "agent_employee_id": seed["telecaller_emp"],
                "outcome": "interested", "sub_outcome": "sales", "transferred_to_employee_id": "does-not-exist",
            },
        )
        assert r.status_code == 404

    def test_sales_transfers_ownership(self, client, tokens, seed):
        r = client.post(
            "/calls",
            headers=auth_headers(tokens["telecaller"]),
            json={
                "customer_id": seed["customer"], "agent_employee_id": seed["telecaller_emp"],
                "outcome": "interested", "sub_outcome": "sales", "transferred_to_employee_id": seed["rm_emp"],
            },
        )
        assert r.status_code == 200, r.text
        cust = client.get(f"/customers/{seed['customer']}", headers=auth_headers(tokens["telecaller"])).json()
        assert cust["owner_employee_id"] == seed["rm_emp"]

    def test_callback_flow_succeeds(self, client, tokens, seed):
        r = client.post(
            "/calls",
            headers=auth_headers(tokens["telecaller"]),
            json={
                "customer_id": seed["customer"], "agent_employee_id": seed["telecaller_emp"],
                "outcome": "interested", "sub_outcome": "callback",
                "callback_datetime": "2026-12-01T10:00:00",
            },
        )
        assert r.status_code == 200, r.text

    def test_call_with_nonexistent_customer_404(self, client, tokens, seed):
        r = client.post(
            "/calls",
            headers=auth_headers(tokens["telecaller"]),
            json={"customer_id": "nope", "agent_employee_id": seed["telecaller_emp"], "outcome": "not_answered"},
        )
        assert r.status_code == 404

    def test_telecaller_cannot_view_another_agents_calls(self, client, tokens, seed):
        r = client.get(f"/agents/{seed['telecaller2_emp']}/calls", headers=auth_headers(tokens["telecaller"]))
        assert r.status_code == 403

    def test_telecaller_can_view_own_calls(self, client, tokens, seed):
        r = client.get(f"/agents/{seed['telecaller_emp']}/calls", headers=auth_headers(tokens["telecaller"]))
        assert r.status_code == 200

    def test_manager_can_view_any_agents_calls(self, client, tokens, seed):
        r = client.get(f"/agents/{seed['telecaller_emp']}/calls", headers=auth_headers(tokens["manager"]))
        assert r.status_code == 200


# ---------------------------------------------------------------------------
# CUSTOMERS
# ---------------------------------------------------------------------------

class TestCustomers:
    def test_create_customer_missing_required_field(self, client, tokens):
        r = client.post("/customers", headers=auth_headers(tokens["telecaller"]), json={"full_name": "No Phone"})
        assert r.status_code == 422

    def test_search_customers_no_match(self, client, tokens):
        r = client.get("/customers?search=zzz_no_such_customer", headers=auth_headers(tokens["telecaller"]))
        assert r.status_code == 200
        assert r.json() == []

    def test_get_nonexistent_customer_404(self, client, tokens):
        r = client.get("/customers/does-not-exist", headers=auth_headers(tokens["telecaller"]))
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# KNOWLEDGE BASE
# ---------------------------------------------------------------------------

class TestKnowledgeBase:
    def test_search_by_crop_type(self, client, tokens):
        r = client.get("/knowledge-base/search?crop_type=Cotton", headers=auth_headers(tokens["telecaller"]))
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_search_no_match(self, client, tokens):
        r = client.get("/knowledge-base/search?crop_type=NoSuchCrop", headers=auth_headers(tokens["telecaller"]))
        assert r.status_code == 200
        assert r.json() == []


# ---------------------------------------------------------------------------
# EMPLOYEES / HRMS edge cases
# ---------------------------------------------------------------------------

class TestEmployeesEdgeCases:
    def test_telecaller_cannot_create_employee(self, client, tokens):
        r = client.post(
            "/employees",
            headers=auth_headers(tokens["telecaller"]),
            json={"employee_code": "NEW1", "full_name": "New Guy"},
        )
        assert r.status_code == 403, "PRD: telecaller is CRM-only, shouldn't create HRMS records"

    def test_staff_can_create_employee(self, client, tokens):
        r = client.post(
            "/employees",
            headers=auth_headers(tokens["staff"]),
            json={"employee_code": "NEW2", "full_name": "New Guy 2"},
        )
        assert r.status_code == 200, r.text

    def test_duplicate_employee_code_rejected(self, client, tokens):
        client.post("/employees", headers=auth_headers(tokens["staff"]),
                     json={"employee_code": "DUP1", "full_name": "First"})
        r = client.post("/employees", headers=auth_headers(tokens["staff"]),
                         json={"employee_code": "DUP1", "full_name": "Second"})
        assert r.status_code == 400

    def test_telecaller_can_view_own_attendance(self, client, tokens, seed):
        # PRD doesn't explicitly say telecallers can see their OWN attendance;
        # current implementation restricts /attendance to founder/manager/staff only.
        r = client.get(f"/employees/{seed['telecaller_emp']}/attendance", headers=auth_headers(tokens["telecaller"]))
        assert r.status_code == 403


# ---------------------------------------------------------------------------
# LEAVE REQUESTS
# ---------------------------------------------------------------------------

class TestLeaveRequests:
    def test_create_leave_request_missing_dates(self, client, tokens, seed):
        r = client.post(
            "/leave-requests",
            headers=auth_headers(tokens["telecaller"]),
            json={"employee_id": seed["telecaller_emp"], "leave_type_id": "some-id"},
        )
        assert r.status_code == 422

    def test_create_leave_request_nonexistent_leave_type(self, client, tokens, seed):
        r = client.post(
            "/leave-requests",
            headers=auth_headers(tokens["telecaller"]),
            json={
                "employee_id": seed["telecaller_emp"], "leave_type_id": "does-not-exist",
                "start_date": "2026-01-01", "end_date": "2026-01-02",
            },
        )
        assert r.status_code == 404

    def test_create_leave_request_nonexistent_employee(self, client, tokens, seed, leave_type_id):
        r = client.post(
            "/leave-requests",
            headers=auth_headers(tokens["telecaller"]),
            json={
                "employee_id": "does-not-exist", "leave_type_id": leave_type_id,
                "start_date": "2026-01-01", "end_date": "2026-01-02",
            },
        )
        assert r.status_code == 404

    def test_create_leave_request_end_before_start_rejected(self, client, tokens, seed, leave_type_id):
        r = client.post(
            "/leave-requests",
            headers=auth_headers(tokens["telecaller"]),
            json={
                "employee_id": seed["telecaller_emp"], "leave_type_id": leave_type_id,
                "start_date": "2026-01-10", "end_date": "2026-01-05",
            },
        )
        assert r.status_code == 422

    def test_create_leave_request_valid_succeeds(self, client, tokens, seed, leave_type_id):
        r = client.post(
            "/leave-requests",
            headers=auth_headers(tokens["telecaller"]),
            json={
                "employee_id": seed["telecaller_emp"], "leave_type_id": leave_type_id,
                "start_date": "2026-01-05", "end_date": "2026-01-06",
            },
        )
        assert r.status_code == 200, r.text

    def test_approve_leave_request(self, client, tokens, seed, leave_type_id):
        created = client.post(
            "/leave-requests",
            headers=auth_headers(tokens["telecaller"]),
            json={"employee_id": seed["telecaller_emp"], "leave_type_id": leave_type_id, "start_date": "2026-03-01", "end_date": "2026-03-02"},
        ).json()
        r = client.post(
            f"/leave-requests/{created['id']}/decision",
            params={"approve": True},
            headers=auth_headers(tokens["staff"]),
        )
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "approved"

    def test_reject_leave_request(self, client, tokens, seed, leave_type_id):
        created = client.post(
            "/leave-requests",
            headers=auth_headers(tokens["telecaller"]),
            json={"employee_id": seed["telecaller_emp"], "leave_type_id": leave_type_id, "start_date": "2026-04-01", "end_date": "2026-04-02"},
        ).json()
        r = client.post(
            f"/leave-requests/{created['id']}/decision",
            params={"approve": False},
            headers=auth_headers(tokens["manager"]),
        )
        assert r.status_code == 200
        assert r.json()["status"] == "rejected"

    def test_telecaller_cannot_decide_leave_request(self, client, tokens, seed, leave_type_id):
        created = client.post(
            "/leave-requests",
            headers=auth_headers(tokens["telecaller"]),
            json={"employee_id": seed["telecaller_emp"], "leave_type_id": leave_type_id, "start_date": "2026-05-01", "end_date": "2026-05-02"},
        ).json()
        r = client.post(
            f"/leave-requests/{created['id']}/decision",
            params={"approve": True},
            headers=auth_headers(tokens["telecaller"]),
        )
        assert r.status_code == 403

    def test_cannot_redecide_already_decided_leave(self, client, tokens, seed, leave_type_id):
        created = client.post(
            "/leave-requests",
            headers=auth_headers(tokens["telecaller"]),
            json={"employee_id": seed["telecaller_emp"], "leave_type_id": leave_type_id, "start_date": "2026-07-01", "end_date": "2026-07-02"},
        ).json()
        client.post(f"/leave-requests/{created['id']}/decision", params={"approve": True}, headers=auth_headers(tokens["staff"]))
        r = client.post(f"/leave-requests/{created['id']}/decision", params={"approve": False}, headers=auth_headers(tokens["staff"]))
        assert r.status_code == 422

    def test_decide_nonexistent_leave_request_404(self, client, tokens):
        r = client.post("/leave-requests/does-not-exist/decision", params={"approve": True}, headers=auth_headers(tokens["staff"]))
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# PAYROLL - version-wise, never overwritten
# ---------------------------------------------------------------------------

class TestPayroll:
    def test_telecaller_cannot_create_payroll(self, client, tokens, seed):
        r = client.post(
            f"/employees/{seed['telecaller_emp']}/payroll",
            headers=auth_headers(tokens["telecaller"]),
            json={"employee_id": seed["telecaller_emp"], "effective_from": "2026-01-01", "basic_salary": 20000},
        )
        assert r.status_code == 403, "PRD: payroll is HRMS/staff only, not CRM/telecaller"

    def test_staff_can_create_payroll(self, client, tokens, seed):
        r = client.post(
            f"/employees/{seed['telecaller_emp']}/payroll",
            headers=auth_headers(tokens["staff"]),
            json={"employee_id": seed["telecaller_emp"], "effective_from": "2026-01-01", "basic_salary": 20000, "hra": 5000},
        )
        assert r.status_code == 200, r.text
        assert r.json()["basic_salary"] == 20000

    def test_negative_salary_rejected(self, client, tokens, seed):
        r = client.post(
            f"/employees/{seed['telecaller_emp']}/payroll",
            headers=auth_headers(tokens["staff"]),
            json={"employee_id": seed["telecaller_emp"], "effective_from": "2026-01-01", "basic_salary": -5000},
        )
        assert r.status_code == 422

    def test_url_body_employee_mismatch_rejected(self, client, tokens, seed):
        r = client.post(
            f"/employees/{seed['telecaller_emp']}/payroll",
            headers=auth_headers(tokens["staff"]),
            json={"employee_id": seed["rm_emp"], "effective_from": "2026-01-01", "basic_salary": 20000},
        )
        assert r.status_code == 422

    def test_payroll_for_nonexistent_employee_404(self, client, tokens):
        r = client.post(
            "/employees/does-not-exist/payroll",
            headers=auth_headers(tokens["staff"]),
            json={"employee_id": "does-not-exist", "effective_from": "2026-01-01", "basic_salary": 20000},
        )
        assert r.status_code == 404

    def test_revision_never_overwrites_creates_new_row(self, client, tokens, seed):
        r1 = client.post(
            f"/employees/{seed['rm_emp']}/payroll",
            headers=auth_headers(tokens["staff"]),
            json={"employee_id": seed["rm_emp"], "effective_from": "2026-01-01", "basic_salary": 25000, "remarks": "Initial"},
        )
        assert r1.status_code == 200
        r2 = client.post(
            f"/employees/{seed['rm_emp']}/payroll",
            headers=auth_headers(tokens["staff"]),
            json={"employee_id": seed["rm_emp"], "effective_from": "2026-06-01", "basic_salary": 30000, "remarks": "Annual increment"},
        )
        assert r2.status_code == 200

        history = client.get(f"/employees/{seed['rm_emp']}/payroll", headers=auth_headers(tokens["staff"])).json()
        assert len(history) == 2, "both revisions should exist as separate rows, not overwritten"
        remarks = {h["remarks"] for h in history}
        assert remarks == {"Initial", "Annual increment"}

    def test_current_payroll_picks_latest_effective_record(self, client, tokens, seed):
        current = client.get(f"/employees/{seed['rm_emp']}/payroll/current", headers=auth_headers(tokens["staff"])).json()
        assert current["basic_salary"] == 30000, "current should be the most recent effective_from, not the first one created"

    def test_current_payroll_no_record_404(self, client, tokens, seed):
        r = client.get(f"/employees/{seed['staff_emp']}/payroll/current", headers=auth_headers(tokens["staff"]))
        assert r.status_code == 404


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
