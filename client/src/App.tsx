import { Route, Switch } from "wouter";
import LoginPage from "@/pages/LoginPage";
import FormPage from "@/pages/FormPage";
import AdminPanel from "@/pages/AdminPanel";
import AdminLoginPage from "@/pages/AdminLoginPage";
import NotFoundPage from "@/pages/NotFoundPage";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";

interface User {
  id: number;
  username: string;
  fullName: string;
  role: string;
}

function App() {
  const { isAuthenticated, user, login, logout } = useAuth();
  const [location, setLocation] = useLocation();
  
  // Function to be passed to login page
  const handleLogin: () => void = () => {
    // When user logs in, set a default user object
    login({
      id: 1,
      username: "staff@example.com",
      fullName: "Staff User",
      role: "staff"
    });
  };
  
  // Function to be passed to admin login page
  const handleAdminLogin: () => void = () => {
    // When admin logs in, set user with admin role
    login({
      id: 2,
      username: "admin@example.com",
      fullName: "Admin User",
      role: "admin"
    });
  };
  
  // Function to be passed to pages that need logout
  const handleLogout: () => void = () => {
    logout();
    setLocation("/");
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated && location !== "/" && location !== "" && location !== "/admin-login") {
      setLocation("/");
    }
  }, [isAuthenticated, location, setLocation]);

  // Redirect to form page if authenticated and at login page
  useEffect(() => {
    if (isAuthenticated && (location === "/" || location === "")) {
      setLocation("/form");
    }
  }, [isAuthenticated, location, setLocation]);

  // Handle admin authentication
  useEffect(() => {
    // If trying to access admin panel without admin authentication
    const isAdminAuthenticated = user?.role === 'admin';
    if (location === "/admin" && !isAdminAuthenticated) {
      setLocation("/admin-login");
    }
  }, [user, location, setLocation]);

  // Main routing logic
  return (
    <Switch>
      <Route path="/">
        {isAuthenticated ? <FormPage onLogout={handleLogout} /> : <LoginPage onLoginSuccess={handleLogin} />}
      </Route>
      
      <Route path="/form">
        {isAuthenticated ? <FormPage onLogout={handleLogout} /> : <LoginPage onLoginSuccess={handleLogin} />}
      </Route>
      
      <Route path="/admin-login">
        {isAuthenticated ? <AdminLoginPage onAdminLoginSuccess={handleAdminLogin} /> : <LoginPage onLoginSuccess={handleLogin} />}
      </Route>
      
      <Route path="/admin">
        {isAuthenticated && user?.role === 'admin' ? 
          <AdminPanel onLogout={handleLogout} /> : 
          (isAuthenticated ? <AdminLoginPage onAdminLoginSuccess={handleAdminLogin} /> : <LoginPage onLoginSuccess={handleLogin} />)}
      </Route>
      
      <Route>
        <NotFoundPage />
      </Route>
    </Switch>
  );
}

export default App;
