import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

export default function OAuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { loginWithToken, refreshUser } = useAuth();
  const [status, setStatus] = useState("Verificando autenticação...");

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const token = query.get("token");
    const success = query.get("success");

    const handleLogin = async () => {
      try {
        if (token) {
          setStatus("Concluindo login...");
          await loginWithToken(token, true);
        } else if (success === "true") {
          setStatus("Finalizando autenticação com Google...");
          await refreshUser();
        } else {
          throw new Error("Falha ao autenticar via OAuth.");
        }

        toast.success("Login via Google concluído!");
        navigate("/app/dashboard", { replace: true });
      } catch (error: any) {
        console.error("[OAuthCallback] Falha no login OAuth:", error);
        toast.error(error?.message || "Erro ao autenticar via OAuth.");
        navigate("/login", { replace: true });
      }
    };

    handleLogin();
  }, [location.search, loginWithToken, refreshUser, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 text-center">
      <div className="max-w-xl w-full rounded-3xl border border-border bg-surface p-10 shadow-lg">
        <h1 className="text-2xl font-semibold text-text">Autenticando...</h1>
        <p className="mt-4 text-sm text-muted">{status}</p>
      </div>
    </div>
  );
}
