import { getDb } from "@/lib/db";
import { hashToken } from "@/lib/auth";
import { AuthShell } from "../../auth-shell";
import { ConviteForm } from "./convite-form";

export const dynamic = "force-dynamic";

export default async function ConvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const c = getDb()
    .prepare("SELECT email, nome FROM convites WHERE token_hash = ? AND usado_em IS NULL AND expira_em > ?")
    .get(hashToken(token), Date.now()) as { email: string; nome: string } | undefined;
  return (
    <AuthShell>
      {c ? (
        <>
          <h1>Crie sua senha</h1>
          <p className="sub">É só uma vez. Depois você entra com o seu e-mail e esta senha.</p>
          <ConviteForm token={token} email={c.email} nome={c.nome} />
        </>
      ) : (
        <>
          <h1>Convite expirado</h1>
          <p className="sub">Este link já foi usado ou passou do prazo. Se você já criou sua senha, <a href="/painel/login">entre aqui</a>. Senão, peça um link novo pelo calculadora40h@gmail.com.</p>
        </>
      )}
    </AuthShell>
  );
}
