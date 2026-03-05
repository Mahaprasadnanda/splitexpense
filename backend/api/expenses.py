from fastapi import APIRouter, Depends, HTTPException
from models.schemas import ExpenseCreate, ExpenseResponse
from services.firebase import db
from api.deps import get_current_user
from datetime import datetime
import uuid

router = APIRouter(prefix="/trips/{trip_id}/expenses", tags=["expenses"])

@router.post("/", response_model=ExpenseResponse)
def add_expense(trip_id: str, expense_in: ExpenseCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("uid")
    
    # Verify trip
    trip_ref = db.collection("trips").document(trip_id).get()
    if not trip_ref.exists:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    trip_data = trip_ref.to_dict()
    if user_id not in trip_data.get("members", []):
        raise HTTPException(status_code=403, detail="Not a member of this trip")
        
    # Validate custom split amounts
    if expense_in.splitType == "Custom":
        total_custom = sum(s.amount for s in expense_in.splits)
        # using a small epsilon to handle float inaccuracies
        if abs(total_custom - expense_in.amount) > 0.01:
            raise HTTPException(status_code=400, detail="Custom split amounts do not sum up to total amount")
            
    expense_id = str(uuid.uuid4())
    
    expense_dict = {
        "expenseId": expense_id,
        "tripId": trip_id,
        "title": expense_in.title,
        "amount": expense_in.amount,
        "date": expense_in.date,
        "paidBy": expense_in.paidBy,
        "splitType": expense_in.splitType,
        "createdBy": user_id,
        "createdAt": datetime.utcnow().isoformat()
    }
    
    # Create the expense doc
    db.collection("expenses").document(expense_id).set(expense_dict)
    
    # Create splits
    batch = db.batch()
    for s in expense_in.splits:
        split_id = str(uuid.uuid4())
        split_ref = db.collection("splits").document(split_id)
        batch.set(split_ref, {
            "splitId": split_id,
            "expenseId": expense_id,
            "tripId": trip_id,
            "userId": s.userId,
            "amount": s.amount
        })
    batch.commit()
    
    # Update total trip expenses
    new_total = trip_data.get("totalExpenses", 0) + expense_in.amount
    db.collection("trips").document(trip_id).update({"totalExpenses": new_total})
    
    return expense_dict

@router.get("/")
def get_trip_expenses(trip_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("uid")
    
    trip_ref = db.collection("trips").document(trip_id).get()
    if not trip_ref.exists or user_id not in trip_ref.to_dict().get("members", []):
        raise HTTPException(status_code=403, detail="Access denied")
        
    expenses_ref = db.collection("expenses").where("tripId", "==", trip_id).stream()
    expenses = [doc.to_dict() for doc in expenses_ref]
    
    # Enhance with splits
    for exp in expenses:
        splits_ref = db.collection("splits").where("expenseId", "==", exp["expenseId"]).stream()
        exp["splits"] = [doc.to_dict() for doc in splits_ref]
        
    return expenses

@router.delete("/{expense_id}")
def delete_expense(trip_id: str, expense_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("uid")
    
    exp_ref = db.collection("expenses").document(expense_id)
    exp_doc = exp_ref.get()
    
    if not exp_doc.exists:
        raise HTTPException(status_code=404, detail="Expense not found")
        
    exp_data = exp_doc.to_dict()
    if exp_data.get("createdBy") != user_id:
        raise HTTPException(status_code=403, detail="Only creator can delete this expense")
        
    # Delete splits
    splits_ref = db.collection("splits").where("expenseId", "==", expense_id).stream()
    batch = db.batch()
    for doc in splits_ref:
        batch.delete(doc.reference)
    batch.delete(exp_ref)
    batch.commit()
    
    # Update total expenses
    trip_ref = db.collection("trips").document(trip_id)
    trip_data = trip_ref.get().to_dict()
    new_total = trip_data.get("totalExpenses", 0) - exp_data.get("amount", 0)
    trip_ref.update({"totalExpenses": max(0, new_total)})
    
    return {"message": "Expense deleted"}

@router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense(trip_id: str, expense_id: str, expense_in: ExpenseCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("uid")
    
    # Verify trip
    trip_ref = db.collection("trips").document(trip_id).get()
    if not trip_ref.exists:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    trip_data = trip_ref.to_dict()
    
    # Verify expense
    exp_ref = db.collection("expenses").document(expense_id)
    exp_doc = exp_ref.get()
    
    if not exp_doc.exists:
        raise HTTPException(status_code=404, detail="Expense not found")
        
    exp_data = exp_doc.to_dict()
    if exp_data.get("createdBy") != user_id:
        raise HTTPException(status_code=403, detail="Only creator can edit this expense")
        
    # Validate custom split amounts
    if expense_in.splitType == "Custom":
        total_custom = sum(s.amount for s in expense_in.splits)
        if abs(total_custom - expense_in.amount) > 0.01:
            raise HTTPException(status_code=400, detail="Custom split amounts do not sum up to total amount")
            
    # Calculate difference for total trip expenses
    old_amount = exp_data.get("amount", 0)
    new_amount = expense_in.amount
    amount_diff = new_amount - old_amount
            
    expense_dict = {
        "expenseId": expense_id,
        "tripId": trip_id,
        "title": expense_in.title,
        "amount": expense_in.amount,
        "date": expense_in.date,
        "paidBy": expense_in.paidBy,
        "splitType": expense_in.splitType,
        "createdBy": user_id,
        "createdAt": exp_data.get("createdAt", datetime.utcnow().isoformat())
    }
    
    # Update the expense doc
    exp_ref.update(expense_dict)
    
    # Update splits
    batch = db.batch()
    
    # 1. Delete old splits
    old_splits_ref = db.collection("splits").where("expenseId", "==", expense_id).stream()
    for doc in old_splits_ref:
        batch.delete(doc.reference)
        
    # 2. Add new splits
    for s in expense_in.splits:
        split_id = str(uuid.uuid4())
        split_ref = db.collection("splits").document(split_id)
        batch.set(split_ref, {
            "splitId": split_id,
            "expenseId": expense_id,
            "tripId": trip_id,
            "userId": s.userId,
            "amount": s.amount
        })
    batch.commit()
    
    # Update total trip expenses
    new_total = trip_data.get("totalExpenses", 0) + amount_diff
    db.collection("trips").document(trip_id).update({"totalExpenses": max(0, new_total)})
    
    return expense_dict

