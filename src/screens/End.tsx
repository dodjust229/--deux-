import { Icon } from "../components/Icon";
import { Stage } from "../components/Stage";
import type { StagePlayer } from "../components/Stage";
import type { Scene } from "../lib/scene";
import type { Snapshot } from "../types";

const FINAL_SCENE: Scene = {
  speaker: null,
  bubble: null,
  bubbleSeat: null,
  states: { 1: "celebrating", 2: "celebrating" }
};

interface EndProps {
  snap: Snapshot;
  me: StagePlayer;
  other: StagePlayer | null;
  busy: boolean;
  onRestart: () => void;
  onLeave: () => void;
}

export function End({ snap, me, other, busy, onRestart, onLeave }: EndProps) {
  const summary = snap.summary;
  return (
    <main className="end page">
      <Stage scene={FINAL_SCENE} me={me} other={other} size={190} variant="lobby" />

      <div className="end__card">
        <span className="eyebrow">Fin de la conversation</span>
        <h1>Ce moment est à vous.</h1>
        <p className="muted">
          Rien de ce qui s'est dit ne sort d'ici. Aucune note, aucun classement, aucune punition pour
          celles et ceux qui ont passé une question.
        </p>

        {summary && (
          <dl className="end__stats">
            <div>
              <dt>Réponses partagées</dt>
              <dd>{summary.answered}</dd>
            </div>
            <div>
              <dt>Questions passées</dt>
              <dd>{summary.passed}</dd>
            </div>
            <div>
              <dt>Questions tirées</dt>
              <dd>{summary.total}</dd>
            </div>
          </dl>
        )}

        <button className="primary full" type="button" onClick={onRestart} disabled={busy}>
          <Icon name="rotate" /> Rejouer une partie
        </button>
        <button className="secondary full" type="button" onClick={onLeave}>
          <Icon name="log-out" /> Quitter la salle
        </button>
      </div>
    </main>
  );
}
