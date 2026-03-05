from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# Users
class UserSync(BaseModel):
    userId: str
    name: str
    email: str

class UserResponse(BaseModel):
    userId: str
    name: str
    email: str
    createdAt: datetime

# Trips
class TripCreate(BaseModel):
    tripName: str
    members: List[str] # List of userIds

class TripResponse(BaseModel):
    tripId: str
    tripName: str
    createdBy: str
    members: List[str]
    createdAt: datetime
    totalExpenses: float = 0.0

# Expenses
class SplitDetail(BaseModel):
    userId: str
    amount: float

class ExpenseCreate(BaseModel):
    title: str
    amount: float
    date: str
    paidBy: str
    splitType: str # "Equal" or "Custom"
    splits: List[SplitDetail] # if equal, can be calculated, but frontend can also send it

class ExpenseResponse(BaseModel):
    expenseId: str
    tripId: str
    title: str
    amount: float
    paidBy: str
    createdBy: str
    date: str
    splitType: str
    createdAt: datetime

class SplitResponse(BaseModel):
    splitId: str
    expenseId: str
    userId: str
    amount: float

# Balances
class BalanceSettlement(BaseModel):
    fromUserId: str
    toUserId: str
    amount: float
