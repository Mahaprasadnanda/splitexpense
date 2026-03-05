import axios from "axios";

// Create Axios Instance
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

// Request interceptor to attach Firebase ID Token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Auth Services
export const syncUser = (userData) => api.post("/auth/sync", userData);
export const getAllUsers = () => api.get("/auth/users");

// Trip Services
export const createTrip = (tripData) => api.post("/trips/", tripData);
export const getUserTrips = () => api.get("/trips/");
export const getTripDetails = (tripId) => api.get(`/trips/${tripId}`);

// Expense Services
export const createExpense = (tripId, expenseData) => api.post(`/trips/${tripId}/expenses/`, expenseData);
export const getTripExpenses = (tripId) => api.get(`/trips/${tripId}/expenses/`);
export const updateExpense = (tripId, expenseId, expenseData) => api.put(`/trips/${tripId}/expenses/${expenseId}`, expenseData);
export const deleteExpense = (tripId, expenseId) => api.delete(`/trips/${tripId}/expenses/${expenseId}`);

// Balance Services
export const getBalances = (tripId) => api.get(`/trips/${tripId}/balances/`);
export const settleBalance = (tripId, settlementData) => api.post(`/trips/${tripId}/balances/settle`, settlementData);

export default api;
