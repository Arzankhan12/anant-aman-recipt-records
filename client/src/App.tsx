import { Route, Switch } from "wouter";
import LoginPage from "@/pages/LoginPage";
import FormPage from "@/pages/FormPage";
import AdminPanel from "@/pages/AdminPanel";
import NotFoundPage from "@/pages/NotFoundPage";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

function App() {
  // Start without authentication - login page will handle setting this
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [location, setLocation] = useLocation();
  
  // Function to be passed to login page
  const handleLogin = () => {
    setIsAuthenticated(true);
  };
  
  // Function to be passed to pages that need logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    setLocation("/");
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated && location !== "/" && location !== "") {
      setLocation("/");
    }
  }, [isAuthenticated, location, setLocation]);

  // Render login page at root
  if (location === "/" || location === "") {
    return <LoginPage onLoginSuccess={handleLogin} />;
  }

  // If authenticated, render the requested page, otherwise show NotFound
  if (isAuthenticated) {
    return (
      <Switch>
        <Route path="/form">
          <FormPage onLogout={handleLogout} />
        </Route>
        <Route path="/admin">
          <AdminPanel onLogout={handleLogout} />
        </Route>
        <Route>
          <NotFoundPage />
        </Route>
      </Switch>
    );
  } else {
    // Not authenticated, show NotFound for all routes except root
    return <NotFoundPage />;
  }
}

export default App;
