from fastapi import APIRouter, Depends, HTTPException
from models.schemas import UserSync, UserResponse
from services.firebase import db
from api.deps import get_current_user
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/sync", response_model=UserResponse)
def sync_user(user_data: UserSync, current_user: dict = Depends(get_current_user)):
    """
    Called by frontend after Firebase login/signup to ensure the user exists in Firestore.
    """
    if current_user.get("uid") != user_data.userId:
        raise HTTPException(status_code=403, detail="User ID mismatch")

    user_ref = db.collection("users").document(user_data.userId)
    user_doc = user_ref.get()

    if not user_doc.exists:
        new_user = {
            "userId": user_data.userId,
            "name": user_data.name,
            "email": user_data.email,
            "createdAt": datetime.utcnow()
        }
        user_ref.set(new_user)
        
        # Synchronize any dummy records assigned to this user's email
        email_str = user_data.email.lower().strip()
        uid = user_data.userId
        
        batch = db.batch()
        
        # 1. Update trips
        trips_ref = db.collection("trips").where("members", "array_contains", email_str).stream()
        for trip in trips_ref:
            t_data = trip.to_dict()
            members = t_data.get("members", [])
            if email_str in members:
                members.remove(email_str)
                if uid not in members:
                    members.append(uid)
                batch.update(trip.reference, {"members": members})
                
        # 2. Update expenses paid by this email
        expenses_ref = db.collection("expenses").where("paidBy", "==", email_str).stream()
        for exp in expenses_ref:
            batch.update(exp.reference, {"paidBy": uid})
            
        # 3. Update splits for this email
        splits_ref = db.collection("splits").where("userId", "==", email_str).stream()
        for s in splits_ref:
            batch.update(s.reference, {"userId": uid})
            
        batch.commit()
            
        return new_user
    else:
        return user_doc.to_dict()

@router.get("/users")
def get_all_users(current_user: dict = Depends(get_current_user)):
    """
    Get all registered users for adding to a trip
    """
    users_ref = db.collection("users").stream()
    users = [doc.to_dict() for doc in users_ref]
    return users
