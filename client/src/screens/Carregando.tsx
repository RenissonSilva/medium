import { Dots } from '../components/Icon';

export function Carregando({ code }: { code: string }) {
  return (
    <main className="screen">
      <div className="loading" role="status">
        <div className="card yellow">
          <span className="card-label">Sala</span>
          <span className="card-word" style={{ fontSize: 64 }}>
            {code}
          </span>
        </div>
        <p>
          Entrando na sala <Dots />
        </p>
      </div>
    </main>
  );
}
