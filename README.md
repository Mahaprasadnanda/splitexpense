# Split Expense Application

A modern MVP for splitting expenses with friends, designed with a premium, responsive glassmorphism aesthetic. It allows users to create trips, invite members (even those not registered yet via email), track expenses with custom or equal splits, and easily settle balances.

## Features
- **Firebase Authentication**: Secure user registration and login.
- **Trip Management**: Create and manage multiple trips/groups.
- **Smart Invites**: Invite unregistered users via their exact email address. Once they sign up, their trips are magically synchronized to their new dashboard.
- **Advanced Expense Splitting**: 
  - **Equal Splits**: Evenly distribute expenses across members.
  - **Custom Splits**: Specify exact numeric amounts each person owes based on their share.
- **Role-Based Edit Options**: Only the creator of an expense can edit or delete their expense.
- **Balance Calculation**: Automatically computes who owes whom to settle up efficiently.
- **Sleek UI/UX**: Built entirely on Tailwind v4 using glassmorphic UI cards, smooth transitions, and responsive modals.

## Tech Stack
- **Frontend**: React.js, Vite, Tailwind CSS v4, Lucide React (Icons), Axios.
- **Backend**: Python, FastAPI, Firebase Admin SDK.
- **Database**: Firebase Firestore.

## Local Setup

### 1. Prerequisites
- Node.js (v18+)
- Python 3.10+
- Firebase Project with Firestore and App Auth enabled.

### 2. Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Set up your Python virtual environment and install dependencies:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. Set up the `.env` file:
   - Create a `.env` file inside the `backend` folder.
   - Generate a Firebase Admin Service Account Key (JSON) from your Firebase Console.
   - Stringify the JSON and assign it to `FIREBASE_SERVICE_ACCOUNT` in your `.env`:
     ```env
     FIREBASE_SERVICE_ACCOUNT='{"type": "service_account", "project_id": "...", ...}'
     ```
4. Run the FastAPI development server:
   ```bash
   uvicorn main:app --reload --port 8080
   ```
   *Note: If port 8000 throws a WinError 10013 socket error, port 8080 is an excellent fallback.*

### 3. Frontend Setup
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Set up the `.env` file:
   - Create a `.env` file inside the `frontend` folder.
   - Obtain your standard Firebase Client config keys from your Firebase Console.
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project
   VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
   VITE_API_URL=https://splitexpense-8ie2.onrender.com
   ```
4. Run the Vite development server:
   ```bash
   npm run dev
   ```

## Deployment Guidelines
- **Frontend**: The Vite frontend is fully optimized and natively supported by **Vercel**. Just import your GitHub repository to Vercel and pass the `frontend/.env` values into Vercel's Environment Variables setting.
- **Backend**: The FastAPI backend can be deployed to Render, Railway, or Google Cloud Run. Ensure you inject the `FIREBASE_SERVICE_ACCOUNT` secret into your production platform's Environment Variables exactly as configured in your local `.env`.
