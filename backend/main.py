from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import auth, trips, expenses, balances

app = FastAPI(title="Split Expense API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:5174", 
        "http://localhost:5175", 
        "http://localhost:3000", 
        "http://127.0.0.1:5173", 
        "http://127.0.0.1:5174"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(trips.router)
app.include_router(expenses.router)
app.include_router(balances.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Split Expense API"}
