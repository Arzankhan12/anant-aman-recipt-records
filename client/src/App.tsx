import { Route, Switch } from "wouter";
import LoginPage from "@/pages/LoginPage";
import FormPage from "@/pages/FormPage";
import AdminPanel from "@/pages/AdminPanel";
import NotFoundPage from "@/pages/NotFoundPage";
import { useState, useEffect } from "react";

function App() {
  // Start without authentication - login page will handle setting this
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Function to be passed to login page
  const handleLogin = () => {
    setIsAuthenticated(true);
  };
  
  // Function to be passed to pages that need logout
  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  return (
    <Switch>
      <Route path="/" component={() => <LoginPage onLoginSuccess={handleLogin} />} />
      {isAuthenticated ? (
        <>
          <Route path="/form" component={() => <FormPage onLogout={handleLogout} />} />
          <Route path="/admin" component={() => <AdminPanel onLogout={handleLogout} />} />
        </>
      ) : (
        <>
          <Route path="/form" component={NotFoundPage} />
          <Route path="/admin" component={NotFoundPage} />
        </>
      )}
      <Route component={NotFoundPage} />
    </Switch>
  );
}

export default App;
