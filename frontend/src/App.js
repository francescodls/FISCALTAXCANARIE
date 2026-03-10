import { useState, useEffect, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

// Pages
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import CompleteRegistration from "@/pages/CompleteRegistration";
import ClientDashboard from "@/pages/ClientDashboard";
import CommercialDashboard from "@/pages/CommercialDashboard";
import ClientDetail from "@/pages/ClientDetail";
import ClientLists from "@/pages/ClientLists";
import ModelsManagement from "@/pages/ModelsManagement";
import DeadlinesManagement from "@/pages/DeadlinesManagement";
import SignaturesPage from "@/pages/SignaturesPage";
import BackupPage from "@/pages/BackupPage";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        try {
          const response = await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          setUser(response.data);
          setToken(storedToken);
        } catch (error) {
          localStorage.removeItem("token");
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (tokenOrEmail, passwordOrUser) => {
    // Se il primo argomento è un token (usato da CompleteRegistration)
    if (typeof passwordOrUser === 'object' && passwordOrUser !== null) {
      localStorage.setItem("token", tokenOrEmail);
      setToken(tokenOrEmail);
      setUser(passwordOrUser);
      return passwordOrUser;
    }
    
    // Login normale con email e password
    try {
      const response = await axios.post(`${API}/auth/login`, { email: tokenOrEmail, password: passwordOrUser });
      const { access_token, user: userData } = response.data;
      localStorage.setItem("token", access_token);
      setToken(access_token);
      setUser(userData);
      toast.success("Accesso effettuato con successo!");
      return userData;
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore durante il login");
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post(`${API}/auth/register`, userData);
      const { access_token, user: newUser } = response.data;
      localStorage.setItem("token", access_token);
      setToken(access_token);
      setUser(newUser);
      toast.success("Registrazione completata con successo!");
      return newUser;
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore durante la registrazione");
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    toast.success("Logout effettuato");
  };

  const value = {
    user,
    setUser,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!token && !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to={user?.role === "commercialista" ? "/admin" : "/dashboard"} replace />;
  }

  return children;
};

// Redirect if authenticated
const PublicRoute = ({ children }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={user?.role === "commercialista" ? "/admin" : "/dashboard"} replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      } />
      <Route path="/register" element={
        <PublicRoute>
          <RegisterPage />
        </PublicRoute>
      } />
      <Route path="/complete-registration" element={<CompleteRegistration />} />
      <Route path="/client" element={
        <ProtectedRoute requiredRole="cliente">
          <ClientDashboard />
        </ProtectedRoute>
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute requiredRole="cliente">
          <ClientDashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute requiredRole="commercialista">
          <CommercialDashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin/client/:clientId" element={
        <ProtectedRoute requiredRole="commercialista">
          <ClientDetail />
        </ProtectedRoute>
      } />
      <Route path="/admin/lists" element={
        <ProtectedRoute requiredRole="commercialista">
          <ClientLists />
        </ProtectedRoute>
      } />
      <Route path="/admin/models" element={
        <ProtectedRoute requiredRole="commercialista">
          <ModelsManagement />
        </ProtectedRoute>
      } />
      <Route path="/admin/deadlines" element={
        <ProtectedRoute requiredRole="commercialista">
          <DeadlinesManagement />
        </ProtectedRoute>
      } />
      <Route path="/admin/signatures" element={
        <ProtectedRoute requiredRole="commercialista">
          <SignaturesPage />
        </ProtectedRoute>
      } />
      <Route path="/admin/backup" element={
        <ProtectedRoute requiredRole="commercialista">
          <BackupPage />
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" richColors />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
