export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth-side">
        <div className="brand"><span className="mark">40h</span>Jornada 40h</div>
        <div>
          <h2>A escala 5x2 da sua equipe, pronta para a nova jornada.</h2>
          <p>Edite turnos e folgas, veja quanto custa cobrir cada horário e baixe em PDF ou planilha.</p>
        </div>
        <small>Seus dados ficam guardados na sua conta.</small>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <div className="brand mobile-brand"><span className="mark">40h</span>Jornada 40h</div>
          {children}
        </div>
      </main>
    </div>
  );
}
