import React, {
  useState,
  useMemo,
  createContext,
  useContext,
  useRef,
} from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link as RouterLink,
} from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
// --- CHANGE HERE: Use a named import with curly braces ---
import { getTheme } from "./theme";
import { SocketContext } from "./context/SocketContext";
import io from "socket.io-client";

// Pages and Components
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import ProblemsListPage from "./pages/ProblemsListPage";
import ProblemPage from "./pages/ProblemPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import LobbyPage from "./pages/LobbyPage";
import ProfilePage from "./pages/ProfilePage";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  IconButton,
  Box,
  CssBaseline,
} from "@mui/material";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";

// Create Contexts
const ColorModeContext = createContext({ toggleColorMode: () => {} });
const AuthContext = createContext(null);

// --- Navbar Component ---
const Navbar = () => {
  const colorMode = useContext(ColorModeContext);
  const { isAuthenticated, logout } = useContext(AuthContext);
  const currentMode = localStorage.getItem("themeMode") || "dark";

  return (
    <AppBar position="sticky">
      <Toolbar>
        <Typography
          variant="h6"
          component="div"
          sx={{ flexGrow: 1, fontWeight: "bold" }}
        >
          <RouterLink
            to="/"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            CodeBattle.AI
          </RouterLink>
        </Typography>
        <Button color="inherit" component={RouterLink} to="/lobby">
          Lobby
        </Button>
        <Button color="inherit" component={RouterLink} to="/problems">
          Problems
        </Button>
        <Button color="inherit" component={RouterLink} to="/leaderboard">
          Leaderboard
        </Button>
        {isAuthenticated ? (
          <>
            <Button color="inherit" component={RouterLink} to="/profile">
              Profile
            </Button>
            <Button color="inherit" onClick={logout}>
              Logout
            </Button>
          </>
        ) : (
          <>
            <Button color="inherit" component={RouterLink} to="/login">
              Login
            </Button>
            <Button color="inherit" component={RouterLink} to="/register">
              Register
            </Button>
          </>
        )}
        <IconButton
          sx={{ ml: 1 }}
          onClick={colorMode.toggleColorMode}
          color="inherit"
        >
          {currentMode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

// --- AppRoutes Component ---
function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Box textAlign="center" sx={{ mt: 8 }}>
            <Typography
              variant="h2"
              component="h1"
              gutterBottom
              sx={{ fontWeight: "bold", textShadow: "0 0 10px #00f5d455" }}
            >
              Welcome to CodeBattle.AI
            </Typography>
            <Typography variant="h5" color="text.secondary">
              The Ultimate Arena for Competitive Programming
            </Typography>
          </Box>
        }
      />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/problems" element={<ProblemsListPage />} />
      <Route path="/problems/:id" element={<ProblemPage />} />
      <Route path="/lobby" element={<LobbyPage />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="/profile" element={<ProfilePage />} />
    </Routes>
  );
}

// --- Main App Wrapper Component ---
function AppWrapper() {
  const [mode, setMode] = useState(localStorage.getItem("themeMode") || "dark");
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("token")
  );

  const socketInstance = useRef(null);
  if (!socketInstance.current) {
    socketInstance.current = io("http://localhost:5001");
  }

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => {
          const newMode = prevMode === "light" ? "dark" : "light";
          localStorage.setItem("themeMode", newMode);
          return newMode;
        });
      },
    }),
    []
  );

  const authContextValue = useMemo(
    () => ({
      isAuthenticated,
      login: () => setIsAuthenticated(true),
      logout: () => {
        localStorage.removeItem("token");
        setIsAuthenticated(false);
        window.location.href = "/login";
      },
    }),
    [isAuthenticated]
  );

  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <SocketContext.Provider value={socketInstance.current}>
      <AuthContext.Provider value={authContextValue}>
        <ColorModeContext.Provider value={colorMode}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
              <Navbar />
              <Container component="main" sx={{ mt: 4, mb: 4 }}>
                <AppRoutes />
              </Container>
            </Router>
          </ThemeProvider>
        </ColorModeContext.Provider>
      </AuthContext.Provider>
    </SocketContext.Provider>
  );
}

export default AppWrapper;
