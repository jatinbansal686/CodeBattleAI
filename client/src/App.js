import React, {
  useState,
  useMemo,
  createContext,
  useContext,
  useRef,
  useEffect,
} from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link as RouterLink,
} from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { getTheme } from "./theme";
import { SocketContext } from "./context/SocketContext";
import io from "socket.io-client";

// Pages and Components
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import ProblemsListPage from "./pages/ProblemsListPage";
import BattlePage from "./pages/BattlePage"; // <-- Correctly named
import PracticePage from "./pages/PracticePage"; // <-- New practice page
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

// Create and Export Contexts
const ColorModeContext = createContext({ toggleColorMode: () => {} });
export const AuthContext = createContext(null);

// --- Navbar Component (No changes needed) ---
const Navbar = () => {
  const colorMode = useContext(ColorModeContext);
  const { isAuthenticated, logout, user } = useContext(AuthContext);
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
            <Typography sx={{ mr: 2 }}>Welcome, {user?.username}</Typography>
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

// --- AppRoutes Component (Updated) ---
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
              sx={{ fontWeight: "bold" }}
            >
              Welcome to CodeBattle.AI
            </Typography>
          </Box>
        }
      />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/problems" element={<ProblemsListPage />} />

      {/* --- NEW ROUTE for solo practice --- */}
      <Route path="/practice/:problemId" element={<PracticePage />} />

      {/* --- UPDATED ROUTE for competitive battles --- */}
      <Route path="/battle/:roomId/:problemId" element={<BattlePage />} />

      <Route path="/lobby" element={<LobbyPage />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="/profile" element={<ProfilePage />} />
    </Routes>
  );
}

// --- Main App Wrapper (No changes needed) ---
function AppWrapper() {
  const [mode, setMode] = useState(localStorage.getItem("themeMode") || "dark");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

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
      isAuthenticated: !!localStorage.getItem("token"),
      user,
      login: (userData) => setUser(userData),
      logout: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        window.location.href = "/login";
      },
    }),
    [user]
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
