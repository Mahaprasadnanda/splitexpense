import os
import json
import firebase_admin
from firebase_admin import credentials, firestore, auth
from dotenv import load_dotenv

load_dotenv()

# Initialize Firebase Admin SDK
firebase_credentials_json = os.getenv("FIREBASE_SERVICE_ACCOUNT")

if firebase_credentials_json:
    try:
        cred_dict = json.loads(firebase_credentials_json)
        cred = credentials.Certificate(cred_dict)
    except json.JSONDecodeError:
        raise ValueError("FIREBASE_SERVICE_ACCOUNT contains invalid JSON.")
else:
    raise ValueError("Firebase credentials not found. Set FIREBASE_SERVICE_ACCOUNT env var.")

firebase_admin.initialize_app(cred)

db = firestore.client()

def verify_token(token: str):
    """
    Verifies the Firebase ID token and returns the decoded token payload.
    Raises an error if the token is invalid.
    """
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise ValueError(f"Invalid authentication token: {e}")
