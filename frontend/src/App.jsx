import { BrowserRouter } from "react-router-dom";
import { ConfirmDialogProvider } from "./components/ui/ConfirmDialog";
import AppRoutes from "./routes/AppRoutes";

export default function App() {
  return (
    <BrowserRouter>
      <ConfirmDialogProvider>
        <AppRoutes />
      </ConfirmDialogProvider>
    </BrowserRouter>
  );
}
