"""Sample data insert pannuren - testing ku easy aagum."""

from app.database import SessionLocal, init_db
from app import models
from app.auth import hash_password

init_db()
db = SessionLocal()

# Employees
telecaller = models.Employee(
    employee_code="EMP001", full_name="Priya S", designation="Telecaller", department="CRM"
)
rm = models.Employee(
    employee_code="EMP002", full_name="Arun K", designation="Relationship Manager", department="Sales"
)
founder_emp = models.Employee(
    employee_code="EMP000", full_name="Karthik G", designation="Founder", department="Management"
)
staff_emp = models.Employee(
    employee_code="EMP003", full_name="Lakshmi N", designation="HR Executive", department="HRMS"
)
db.add_all([telecaller, rm, founder_emp, staff_emp])
db.commit()

# User login accounts (password same as username for demo - CHANGE in production)
users = [
    models.User(username="priya", password_hash=hash_password("priya123"),
                role=models.RoleEnum.telecaller, employee_id=telecaller.id),
    models.User(username="arun", password_hash=hash_password("arun123"),
                role=models.RoleEnum.manager, employee_id=rm.id),
    models.User(username="karthik", password_hash=hash_password("karthik123"),
                role=models.RoleEnum.founder, employee_id=founder_emp.id),
    models.User(username="lakshmi", password_hash=hash_password("lakshmi123"),
                role=models.RoleEnum.staff, employee_id=staff_emp.id),
]
db.add_all(users)
db.commit()
print("Login accounts: priya/priya123 (telecaller), arun/arun123 (manager), karthik/karthik123 (founder), lakshmi/lakshmi123 (staff)")

# Product + Knowledge Base
product = models.Product(name="GroTec NPK Booster", category="Fertilizer", description="Boosts crop yield for cotton, paddy")
db.add(product)
db.commit()

kb = models.KnowledgeBaseEntry(
    crop_type="Cotton",
    problem_description="Leaf yellowing due to nitrogen deficiency",
    recommended_product_id=product.id,
    notes="Recommend NPK Booster, 2 applications 15 days apart",
)
db.add(kb)
db.commit()

# Customer
customer = models.Customer(
    full_name="Murugan R", phone="9876543210", village="Melur", crop_type="Cotton", land_size_acres=5
)
db.add(customer)
db.commit()

# Leave types
leave_types = [
    models.LeaveType(name="Casual Leave", default_annual_quota=12),
    models.LeaveType(name="Sick Leave", default_annual_quota=8),
    models.LeaveType(name="Earned Leave", default_annual_quota=15),
]
db.add_all(leave_types)
db.commit()

print("Seed data created:")
print(f"  telecaller.id = {telecaller.id}")
print(f"  rm.id         = {rm.id}")
print(f"  staff.id      = {staff_emp.id}")
print(f"  customer.id   = {customer.id}")
print(f"  kb_entry.id   = {kb.id}")

db.close()
