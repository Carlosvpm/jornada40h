import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/auth";
import { AuthShell } from "../auth-shell";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await usuarioAtual()) redirect("/");
  return (
    <AuthShell>
      <h1>Entrar no painel</h1>
      <p className="sub">Use o e-mail da sua compra e a senha que você criou.</p>
      <LoginForm />
      <p className="ajuda">Esqueceu a senha? Escreva para <a href="mailto:calculadora40h@gmail.com">calculadora40h@gmail.com</a> que mandamos um link novo.</p>
    </AuthShell>
  );
}
