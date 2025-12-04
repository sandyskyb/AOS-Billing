from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import json, os
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FILE_PATH = r"C:\Users\sandy\Desktop\BIll Entry\src\data\customers.json"

class Customer(BaseModel):
    id: str
    name: str
    phone: str
    address: str

def load_customers():
    if not os.path.exists(FILE_PATH):
        return []
    with open(FILE_PATH, "r") as f:
        try:
            return json.load(f)
        except:
            return []

def save_customers(customers):
    with open(FILE_PATH, "w") as f:
        json.dump(customers, f, indent=2)


# ADD CUSTOMER
@app.post("/customers")
def add_customer(customer: Customer):
    customers = load_customers()
    customers.append(customer.dict())
    save_customers(customers)
    return {"message": "Customer saved", "data": customer}


# UPDATE CUSTOMER
@app.put("/customers/{customer_id}")
def update_customer(customer_id: str, updated: dict):
    customers = load_customers()
    for c in customers:
        if c["id"] == customer_id:
            c.update(updated)
            save_customers(customers)
            return {"message": "Customer updated", "data": c}

    raise HTTPException(status_code=404, detail="Customer not found")
