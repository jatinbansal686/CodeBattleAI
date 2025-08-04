import { createTheme } from "@mui/material/styles";

// Use a named export for the function
export const getTheme = (mode) =>
  createTheme({
    palette: {
      mode,
      ...(mode === "dark"
        ? {
            // Palette for dark mode
            primary: {
              main: "#00f5d4",
            },
            secondary: {
              main: "#ff00f8",
            },
            background: {
              default: "#0d1117",
              paper: "rgba(23, 29, 40, 0.8)",
            },
            text: {
              primary: "#c9d1d9",
              secondary: "#8b949e",
            },
          }
        : {
            // Palette for light mode
            primary: {
              main: "#1976d2",
            },
            secondary: {
              main: "#dc004e",
            },
            background: {
              default: "#f6f8fa",
              paper: "rgba(255, 255, 255, 0.9)",
            },
            text: {
              primary: "#24292e",
              secondary: "#586069",
            },
          }),
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h4: {
        fontWeight: 700,
      },
      h5: {
        fontWeight: 600,
      },
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: ({ theme }) => ({
            background:
              theme.palette.mode === "dark"
                ? "rgba(13, 17, 23, 0.7)"
                : "rgba(246, 248, 250, 0.7)",
            backdropFilter: "blur(10px)",
            boxShadow: "none",
            borderBottom: `1px solid ${theme.palette.divider}`,
          }),
        },
      },
      MuiButton: {
        styleOverrides: {
          containedPrimary: ({ theme }) => ({
            boxShadow: `0 0 10px ${theme.palette.primary.main}, 0 0 20px ${theme.palette.primary.main}33`,
            "&:hover": {
              boxShadow: `0 0 15px ${theme.palette.primary.main}, 0 0 30px ${theme.palette.primary.main}55`,
            },
          }),
        },
      },
      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({
            background: theme.palette.background.paper,
            backdropFilter: "blur(5px)",
            border: `1px solid ${theme.palette.divider}`,
          }),
        },
      },
    },
  });
