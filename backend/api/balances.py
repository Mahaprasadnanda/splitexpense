from fastapi import APIRouter, Depends, HTTPException
from models.schemas import BalanceSettlement
from services.firebase import db
from api.deps import get_current_user
from datetime import datetime
import uuid

router = APIRouter(prefix="/trips/{trip_id}/balances", tags=["balances"])

@router.get("/")
def get_balances(trip_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("uid")
    
    trip_ref = db.collection("trips").document(trip_id).get()
    if not trip_ref.exists or user_id not in trip_ref.to_dict().get("members", []):
        raise HTTPException(status_code=403, detail="Access denied")
        
    expenses_ref = db.collection("expenses").where("tripId", "==", trip_id).stream()
    
    balances = {} # user_id -> net balance (positive = owed to them, negative = they owe)
    
    for exp_doc in expenses_ref:
        exp = exp_doc.to_dict()
        paid_by = exp["paidBy"]
        amount = exp["amount"]
        
        balances[paid_by] = balances.get(paid_by, 0) + amount
        
        # Subtract shares
        splits = db.collection("splits").where("expenseId", "==", exp["expenseId"]).stream()
        for s_doc in splits:
            s = s_doc.to_dict()
            balances[s["userId"]] = balances.get(s["userId"], 0) - s["amount"]
            
    # Also need to account for settlements! (who paid whom)
    settlements = db.collection("settlements").where("tripId", "==", trip_id).stream()
    for st_doc in settlements:
        st = st_doc.to_dict()
        # st["fromUserId"] paid st["toUserId"]
        # so st["fromUserId"] balance increases, st["toUserId"] balance decreases
        balances[st["fromUserId"]] = balances.get(st["fromUserId"], 0) + st["amount"]
        balances[st["toUserId"]] = balances.get(st["toUserId"], 0) - st["amount"]
        
    return balances

@router.post("/settle")
def settle_balance(trip_id: str, settlement: BalanceSettlement, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("uid")
    
    trip_ref = db.collection("trips").document(trip_id).get()
    if not trip_ref.exists or user_id not in trip_ref.to_dict().get("members", []):
        raise HTTPException(status_code=403, detail="Access denied")
        
    if settlement.fromUserId != user_id:
        raise HTTPException(status_code=403, detail="Can only record settlements you paid")
        
    st_id = str(uuid.uuid4())
    db.collection("settlements").document(st_id).set({
        "settlementId": st_id,
        "tripId": trip_id,
        "fromUserId": settlement.fromUserId,
        "toUserId": settlement.toUserId,
        "amount": settlement.amount,
        "date": datetime.utcnow().isoformat()
    })
    
    return {"message": "Settled successfully"}
