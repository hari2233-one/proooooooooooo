# GROTEC FarmerOS - Backend (Phase 1)

CRM + HRMS + ESSL (stub) + Auth/Roles + Payroll + Leave backend. FastAPI + SQLAlchemy + JWT.

## Run it

```bash
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload
```

Swagger UI: http://127.0.0.1:8000/docs

## Seeded login accounts

| username | password    | role       |
|----------|-------------|------------|
| priya    | priya123    | telecaller |
| arun     | arun123     | manager    |
| karthik  | karthik123  | founder    |
| lakshmi  | lakshmi123  | staff      |

## Automated tests

```bash
pytest tests/test_api.py -v
```

53 tests - auth, all 4 roles, Agent Workflow, payroll versioning, leave
request filing + approve/reject workflow.
