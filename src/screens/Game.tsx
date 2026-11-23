import { useEffect, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { Stage } from "../components/Stage";
import type { StagePlayer } from "../components/Stage";
import { Composer } from "../components/Composer";
import { InfoTip } from "../components/InfoTip";
import { LevelCurtain } from "../components/LevelCurtain";
import { MediaView } from "../components/MediaContent";
import type { Scene } from "../lib/scene";
import { decodePrediction } from "../lib/protocol";
import { PRIVATE_STORAGE_PREFIX, parseContent } from "../lib/media";
import { audienceLabels, categoryLabels, kindLabels, levelLabels } from "../content";
import type { Lang } from "../lib/i18n";
import type { Answer, Interaction, Snapshot } from "../types";

interface GameProps {
  snap: Snapshot;
  interaction: Interaction;
  scene: Scene;
  me: StagePlayer;
  other: StagePlayer | null;
  busy: boolean;
  paused: boolean;
  hint: string;
  canSend: boolean;
  onOpenSettings: () => void;
  onSubmit: (payload: string) => void;
  onPass: () => void;
  onNext: () => void;
  onResume: () => void;
  onSafe: () => void;
  onOpenGuide: () => void;
  lang: Lang;
}

function AnswerBody({
  answer,
  kind,
  interaction,
  isMe,
  roomId
}: {
  answer: Answer;
  kind: Interaction["kind"];
  interaction: Interaction;
  isMe: boolean;
  roomId: string;
}) {
  if (answer.passed) return <p className="muted">A choisi de passer, sans justification.</p>;
  const content = parseContent(answer.answer);
  if (content.kind === "private") {
    if (!isMe) return <p className="content-private">Confidence gardée pour soi.</p>;
    let mine = "";
    try {
      mine = window.localStorage.getItem(`${PRIVATE_STORAGE_PREFIX}${roomId}.${interaction.id}`) ?? "";
    } catch {
      mine = "";
    }
    return mine ? (
      <div className="private-note">
        <span>Visible par toi seulement</span>
        <p>{mine}</p>
      </div>
    ) : (
      <p className="content-private">Confidence gardée pour soi.</p>
    );
  }
  if (kind === "prediction") {
    const prediction = decodePrediction(answer.answer);
    if (prediction) {
      return (
        <dl className="answer-pair">
          <div>
            <dt>Sa réponse</dt>
            <dd>{prediction.own}</dd>
          </div>
          <div>
            <dt>Son pronostic</dt>
            <dd>{prediction.guess}</dd>
          </div>
        </dl>
      );
    }
  }
  return <MediaView content={content} />;
}

export function Game({
  snap,
  interaction,
  scene,
  me,
  other,
  busy,
  paused,
  hint,
  canSend,
  onOpenSettings,
  onSubmit,
  onPass,
  onNext,
  onResume,
  onSafe,
  onOpenGuide,
  lang
}: GameProps) {
  const [curtain, setCurtain] = useState<1 | 2 | 3 | 4 | null>(null);
  const lastLevel = useRef<number | null>(null);

  useEffect(() => {
    const previous = lastLevel.current;
    lastLevel.current = interaction.level;
    if (previous === null || previous === interaction.level) return;
    setCurtain(interaction.level);
    if (document.documentElement.dataset.motion !== "reduced") navigator.vibrate?.(28);
    const timer = window.setTimeout(() => setCurtain(null), 1800);
    return () => window.clearTimeout(timer);
  }, [interaction.id, interaction.level]);
  const nameOf = (id: string) => snap.players.find((player) => player.id === id)?.nickname ?? "Joueur";
  const position = snap.room.current_index + 1;
  const progress = Math.min(100, Math.round((position / Math.max(1, snap.room.total)) * 100));
  const isLast = position >= snap.room.total;
  const crossAnswer = interaction.kind === "cross" && snap.my_seat === 2 && snap.first_answer;

  return (
    <main className="game">
      {curtain && <LevelCurtain level={curtain} lang={lang} />}
      <header className="game__bar">
        <div className="game__progress" aria-label={`Question ${position} sur ${snap.room.total}`}>
          <span className="game__progress-track">
            <span className="game__progress-fill" style={{ width: `${progress}%` }} />
          </span>
          <span className="game__progress-label">
            {position} / {snap.room.total}
          </span>
        </div>
        <div className="game__bar-actions">
          <button className="safe-button" type="button" onClick={onSafe}>
            SAFE
          </button>
          <button className="icon-button" type="button" data-testid="open-guide" onClick={onOpenGuide} aria-label="Guide d'utilisation">
            <Icon name="info" />
          </button>
          <button className="icon-button" type="button" data-testid="open-settings" onClick={onOpenSettings} aria-label="Réglages et pause">
            <Icon name="settings" />
          </button>
        </div>
      </header>

      <Stage scene={scene} me={me} other={other} size={215} />

      <section className="prompt" key={interaction.id} aria-labelledby="prompt-title">
        <div className="prompt__meta">
          <span className={`tag tag--${interaction.category}`}>{categoryLabels[interaction.category]}</span>
          <span className="tag tag--ghost">{kindLabels[interaction.kind]}</span>
          <span className="tag tag--level">
            {levelLabels[interaction.level]} <InfoTip tip="levels" lang={lang} />
          </span>
        </div>
        <h1 id="prompt-title">{interaction.title}</h1>
        <p className="prompt__text">{interaction.prompt}</p>
        <p className="prompt__audience">
          <Icon name="users" size={13} /> {audienceLabels[interaction.audience]}
          {interaction.visibility === "privee" && " · réponse gardée pour toi"}
        </p>

        {crossAnswer && (
          <blockquote className="prompt__cross">
            <span>Ce que {other?.nickname ?? "l'autre"} a répondu</span>
            <MediaView content={parseContent(snap.first_answer ?? "")} compact />
          </blockquote>
        )}
      </section>

      {paused ? (
        <section className="panel panel--pause" role="status">
          <h2>Partie en pause</h2>
          <p>Les deux joueurs voient la même pause. Rien ne se perd.</p>
          <button className="primary full" type="button" onClick={onResume} disabled={busy}>
            <Icon name="play" /> Reprendre la partie
          </button>
        </section>
      ) : snap.revealed ? (
        <section className="reveal" aria-labelledby="reveal-title" data-testid="reveal">
          <h2 id="reveal-title" className="reveal__title">Vos réponses</h2>
          <div className="reveal__grid">
            {snap.answers.map((answer) => (
              <article key={answer.player_id} className="reveal__card">
                <header>{nameOf(answer.player_id)}</header>
                <AnswerBody
                  answer={answer}
                  kind={interaction.kind}
                  interaction={interaction}
                  isMe={answer.player_id === snap.my_player_id}
                  roomId={snap.room.id}
                />
              </article>
            ))}
          </div>
          <button className="primary full" type="button" data-testid="next" onClick={onNext} disabled={busy || snap.i_acked}>
            {snap.i_acked ? "En attente de l'autre…" : isLast ? "Terminer la partie" : "Question suivante"}
            {!snap.i_acked && <Icon name="arrow" />}
          </button>
          <p className="composer__hint" role="status">
            {snap.i_acked
              ? snap.other_acked
                ? "Les deux joueurs sont prêts."
                : "L'autre personne découvre vos réponses."
              : "Chacun valide pour passer à la suite : la partie n'avance qu'avec votre accord à tous les deux."}
          </p>
        </section>
      ) : (
        <Composer
          interaction={interaction}
          busy={busy}
          alreadyAnswered={snap.my_answer != null}
          canSend={canSend}
          hint={hint}
          onSubmit={onSubmit}
          onPass={onPass}
        />
      )}
    </main>
  );
}
