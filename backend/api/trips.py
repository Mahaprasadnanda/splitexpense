from fastapi import APIRouter, Depends, HTTPException
from models.schemas import TripCreate, TripResponse
from services.firebase import db
from api.deps import get_current_user
from datetime import datetime
import uuid

router = APIRouter(prefix="/trips", tags=["trips"])

@router.post("/", response_model=TripResponse)
def create_trip(trip_in: TripCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("uid")
    members = trip_in.members
    
    if user_id not in members:
        members.append(user_id)
        
    trip_id = str(uuid.uuid4())
    
    trip_dict = {
        "tripId": trip_id,
        "tripName": trip_in.tripName,
        "createdBy": user_id,
        "members": members,
        "createdAt": datetime.utcnow().isoformat(),
        "totalExpenses": 0.0
    }
    
    db.collection("trips").document(trip_id).set(trip_dict)
    return trip_dict

@router.get("/")
def get_user_trips(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("uid")
    # Finding trips where the user is a member
    trips_ref = db.collection("trips").where("members", "array_contains", user_id).stream()
    trips = [doc.to_dict() for doc in trips_ref]
    return trips

@router.get("/{trip_id}", response_model=TripResponse)
def get_trip(trip_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("uid")
    trip_ref = db.collection("trips").document(trip_id).get()
    
    if not trip_ref.exists:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    trip_data = trip_ref.to_dict()
    if user_id not in trip_data.get("members", []):
        raise HTTPException(status_code=403, detail="You do not have access to this trip")
        
    return trip_data
