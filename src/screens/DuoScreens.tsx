import { useEffect, useState } from "react";
import { Character } from "../components/Character";
import { Icon } from "../components/Icon";
import { InfoTip } from "../components/InfoTip";
import { getRoundMoments } from "../lib/round-moments";
import { decodePrediction, encodePrediction } from "../lib/protocol";
import { getRoundEvent } from "../lib/round-events";
import { categoryLabels, categoryDescriptions, intensityLabels, kindLabels, audienceLabels } from "../content";
import type { Category, DuoPermissions, DuoSnapshot, Interaction } from "../types";

const CATEGORIES: Category[] = ["decouverte", "complicite", "profondeur", "seduction", "audacieux"];
const duoName = (n: number) => (n === 1 ? "Duo A" : "Duo B");

/** Tao et Naya animent le salon : présents, silencieux, jamais interactifs. */
function Hosts({ note }: { note: string }) {
  return (
    <div className="duo-hosts">
      <Character persona="masculin" state="listening" size={92} />
      <Character persona="feminin" state="amused" size={92} />
      <p>
        <strong>Tao et Naya</strong>
        <small>{note}</small>
      </p>
    </div>
  );
}

export function DuoLobby({ snap, inviteUrl, copied, onCopy, selected, shared, onToggleCategory, onToggleConsent, onStart, onPermissions, busy, onSafe, onOpenGuide, lang = "fr", gameLevel = 2, isHost = false, allowedCategories = CATEGORIES }: {
  snap: DuoSnapshot; inviteUrl: string; copied: boolean; onCopy: () => void; selected: Category[]; shared: Category[];
  onToggleCategory: (c: Category) => void; onToggleConsent: (v: boolean) => void; onStart: () => void;
  onPermissions: (p: { cross_participation: boolean; receive_media: boolean; share_answers: boolean }) => void; busy: boolean; onSafe: () => void;
  onOpenGuide?: () => void; lang?: "fr" | "en"; gameLevel?: 1 | 2 | 3 | 4; isHost?: boolean; allowedCategories?: Category[];
}) {
  const ready = snap.players.length === 4;
  const adult = shared.includes("audacieux") || gameLevel >= 3;
  const blocked = busy || !ready || !shared.length || (adult && !snap.players.every((p) => p.adult_consent));
  const perm = snap.permissions;

  return (
    <main className="duo-page page">
      <header className="duo-head">
        <div>
          <span className="eyebrow">QSPICY · DUOS · {isHost ? "HÔTE" : "INVITÉ"}</span>
          <h1>Quatre joueurs. Deux complicités.</h1>
          <p className="muted">
            Les duos sont fixes : sièges 1–2 et 3–4. Chaque duo garde son espace privé, avec un salon commun
            seulement si tout le monde l'autorise.
          </p>
        </div>
        <div className="duo-invite">
          <small>{ready ? "Salon complet" : isHost ? `Lien à partager · ${snap.players.length}/4` : "En attente des autres invités"}</small>
          {isHost && <>
            <code data-testid="duo-invite">{inviteUrl}</code>
            <button className="secondary" type="button" onClick={onCopy}>
              <Icon name="copy" /> {copied ? "Copié" : "Copier le lien"}
            </button>
          </>}
          {onOpenGuide && (
            <button className="icon-button" type="button" data-testid="duo-guide" onClick={onOpenGuide}
              aria-label={lang === "fr" ? "Ouvrir le guide" : "Open the guide"} title={lang === "fr" ? "Guide d'utilisation" : "User guide"}>
              <Icon name="info" />
            </button>
          )}
          <button className="safe-button" type="button" data-testid="safe-button" onClick={onSafe}>SAFE</button>
        </div>
      </header>

      <Hosts note="Ils animent la soirée et rappellent les règles." />

      <section className="duo-roster">
        {[1, 2, 3, 4].map((seat) => {
          const p = snap.players.find((x) => x.seat === seat);
          return (
            <article className={`duo-seat ${p ? "" : "is-empty"}`} key={seat}>
              {p ? (
                <>
                  <Character persona={p.avatar} name={p.nickname} size={94} state={p.online ? "idle" : "shy"} />
                  <strong>{p.nickname}</strong>
                  <small>{duoName(p.duo_no ?? (seat <= 2 ? 1 : 2))} · {categoryLabels[p.selected_categories?.[0] ?? "decouverte"]}</small>
                  <span className={p.online ? "duo-online" : "duo-offline"}>{p.online ? "En ligne" : "Absent"}</span>
                </>
              ) : (
                <>
                  <div className="duo-empty">+</div>
                  <strong>Place {seat}</strong>
                  <small>{duoName(seat <= 2 ? 1 : 2)}</small>
                  <span className="duo-offline">En attente</span>
                </>
              )}
            </article>
          );
        })}
      </section>

      <section className="panel">
        <h2>Ton centre d'intérêt</h2>
        <p className="muted small">Chaque participant choisit un seul intérêt. QSPICY combine les choix des quatre joueurs.</p>
        <div className="chips" role="radiogroup" aria-label="Ton centre d'intérêt">
          {allowedCategories.map((c) => (
            <button key={c} role="radio" aria-checked={selected.includes(c)} className={`chip chip--${c} ${selected.includes(c) ? "is-on" : ""}`} onClick={() => onToggleCategory(c)} disabled={busy}>
              <span className="chip__check" aria-hidden="true">{selected.includes(c) ? "✓" : "+"}</span>
              <strong>{categoryLabels[c]}</strong>
              <small>{categoryDescriptions[c]}</small>
            </button>
          ))}
        </div>
        <p className="muted small">Intérêts réunis : {shared.map((c) => categoryLabels[c]).join(" · ") || "en attente des choix"}</p>
      </section>

      <section className="panel">
        <h2>{lang === "fr" ? "Consentement et limites" : "Consent and limits"} <InfoTip tip="duos" lang={lang} /></h2>
        <p className="muted small">
          {lang === "fr"
            ? "Chaque autorisation est personnelle et révocable. Sans elle, l'option correspondante reste fermée."
            : "Every permission is personal and revocable. Without it the matching option stays closed."}
        </p>
        <h3 className="duo-subhead">
          {lang === "fr" ? "Accord 18+ : les quatre participants" : "18+ consent: all four players"} <InfoTip tip="levels" lang={lang} />
        </h3>
        <label className="duo-toggle">
          <input type="checkbox" checked={snap.my_consent} onChange={(e) => onToggleConsent(e.target.checked)} />
          <span>{lang === "fr" ? "J’ai 18 ans ou plus et j’accepte les contenus 18+ s’ils sont sélectionnés." : "I am 18 or over and agree to adult content if selected."}</span>
        </label>
        <p className="muted small">
          {lang === "fr"
            ? `${snap.players.filter((p) => p.adult_consent).length}/4 ont donné leur accord. Un contenu 18+ exige l'accord des quatre ; chacun peut le retirer.`
            : `${snap.players.filter((p) => p.adult_consent).length}/4 have consented. Adult content requires all four; anyone can withdraw.`}
        </p>
        <label className="duo-toggle">
          <input type="checkbox" data-testid="duo-cross-consent" checked={perm.cross_participation} onChange={(e) => onPermissions({ ...perm, cross_participation: e.target.checked, share_answers: e.target.checked ? perm.share_answers : false })} />
          <span>J'autorise les interactions dans l'espace commun (désactivé par défaut).</span>
        </label>
        <label className="duo-toggle">
          <input type="checkbox" checked={perm.receive_media} onChange={(e) => onPermissions({ ...perm, receive_media: e.target.checked })} />
          <span>{lang === "en" ? "I agree to receive messages and personal photos." : "J'accepte de recevoir des messages et des photos personnelles."}</span>
        </label>
        <label className="duo-toggle">
          <input type="checkbox" data-testid="duo-share" checked={perm.share_answers} onChange={(e) => onPermissions({ ...perm, share_answers: e.target.checked })} />
          <span>J'autorise le partage de mes réponses (chaque partage reste choisi au moment de répondre).</span>
        </label>
      </section>

      {isHost ? (
        <button className="primary full" type="button" data-testid="duo-start" disabled={blocked} onClick={onStart}>
          {!ready ? `En attente des quatre joueurs (${snap.players.length}/4)` : !shared.length ? "Choisissez un centre d'intérêt" : adult && !snap.players.every((p) => p.adult_consent) ? "Accord 18+ requis par les quatre" : "Lancer la partie DUOS"} <Icon name="arrow" />
        </button>
      ) : (
        <p className="lobby__waiting" role="status">Ton intérêt et tes autorisations sont enregistrés. En attente du lancement par l'hôte…</p>
      )}
    </main>
  );
}

export function DuoGame({ snap, interaction, busy, onSubmit, onPass, onNext, onSendMessage, onLeave, onSafe, onResume, onPermissions, paused = false, onOpenGuide, lang = "fr" }: {
  snap: DuoSnapshot; interaction: Interaction; busy: boolean; paused?: boolean; onSubmit: (answer: string, visibility: "private" | "duo" | "group") => void;
  onPass: () => void; onNext: () => void; onSendMessage: (space: "group" | "duo_a" | "duo_b", body: string) => void; onLeave: () => void; onSafe: () => void; onOpenGuide?: () => void; lang?: "fr" | "en";
  onResume: () => void; onPermissions: (p: DuoPermissions) => void;
}) {
  const [answer, setAnswer] = useState("");
  const [guess, setGuess] = useState("");
  const [visibility, setVisibility] = useState<"private" | "duo" | "group">("private");
  const [space, setSpace] = useState<"group" | "duo_a" | "duo_b">(snap.my_duo_no === 1 ? "duo_a" : "duo_b");
  const [message, setMessage] = useState("");
  const [selectedMoment, setSelectedMoment] = useState<string | null>(null);
  const roundMoments = getRoundMoments(interaction);
  const roundEvent = getRoundEvent(snap.room.id, snap.room.current_index, snap.room.total, interaction, lang);
  const isSecret = interaction.kind === "secret";
  const isPrediction = interaction.kind === "prediction";
  const isChallenge = interaction.kind === "challenge";
  const duoCrossRole = snap.my_seat % 2 === 1 ? "first" : "second";
  const answerPayload = () => isPrediction
    ? answer.trim() && guess.trim() ? encodePrediction(answer, guess) : ""
    : isChallenge ? answer.trim() || "Défi relevé ✓" : answer.trim();
  useEffect(() => {
    setAnswer("");
    setGuess("");
    setSelectedMoment(null);
    setVisibility("private");
  }, [interaction.id]);
  const ownSpace = snap.my_duo_no === 1 ? "duo_a" : "duo_b";
  const canGroup = snap.players.length === 4 && snap.players.every((p) => p.cross_participation === true);
  const answered = snap.my_answer !== null;
  const sendMessage = () => {
    if (message.trim()) {
      onSendMessage(space, message.trim());
      setMessage("");
    }
  };
  useEffect(() => {
    if (space === "group" && !canGroup) setSpace(ownSpace);
  }, [space, canGroup, ownSpace]);
  const name = (id: string) => snap.players.find((p) => p.id === id)?.nickname ?? "Joueur";
  const visibilityLabel: Record<string, string> = { private: "Visible par toi", duo: "Partagée à ton duo", group: "Partagée aux quatre" };

  return (
    <main className="duo-page page">
      <header className="duo-head">
        <div>
          <span className="eyebrow">DUOS · {snap.my_duo_no === 1 ? "DUO A" : "DUO B"}</span>
          <h1>Votre espace à quatre.</h1>
          <p className="muted">Votre duo privé reste séparé. Le salon commun dépend du consentement de chacun.</p>
        </div>
        <div className="duo-head-actions">
          {onOpenGuide && (
            <button className="icon-button" type="button" data-testid="duo-guide" onClick={onOpenGuide}
              aria-label={lang === "fr" ? "Ouvrir le guide" : "Open the guide"} title={lang === "fr" ? "Guide d'utilisation" : "User guide"}>
              <Icon name="info" />
            </button>
          )}
          <button className="safe-button" type="button" data-testid="safe-button" onClick={onSafe}>SAFE</button>
          <button className="secondary" type="button" onClick={onLeave}>
            <Icon name="log-out" /> Quitter
          </button>
        </div>
      </header>

      <Hosts note={paused ? "La partie est en pause." : "Ils suivent la conversation."} />

      <section className="duo-roster duo-roster--compact">
        {snap.players.map((p) => (
          <article className="duo-seat" key={p.id}>
            <Character persona={p.avatar} name={p.nickname} size={72} state={p.online ? "reacting" : "idle"} />
            <strong>{p.nickname}</strong>
            <small>{duoName(p.duo_no ?? 1)}</small>
          </article>
        ))}
      </section>

      <section className="duo-question">
        <div className="prompt__meta">
          <span className={`tag tag--${interaction.category}`}>{categoryLabels[interaction.category]}</span>
          <span className="tag tag--ghost">{kindLabels[interaction.kind]}</span>
          <span className="tag tag--level">{intensityLabels[interaction.intensity]}</span>
        </div>
        <small>Question {snap.room.current_index + 1} / {snap.room.total}</small>
        <h2>{interaction.title}</h2>
        <p>{interaction.prompt}</p>
        <small className="muted">Public : {audienceLabels[interaction.audience]}</small>
      </section>

      {interaction.kind === "cross" && (
        <aside className="duo-cross-role" aria-label={lang === "fr" ? "Rôle de la question croisée" : "Cross-question role"}>
          <span>{lang === "fr" ? (duoCrossRole === "first" ? "TON RÔLE · PREMIER" : "TON RÔLE · SECOND") : (duoCrossRole === "first" ? "YOUR ROLE · FIRST" : "YOUR ROLE · SECOND")}</span>
          <p>{lang === "fr"
            ? (duoCrossRole === "first" ? "Dans ton duo, réponds à la première partie de la consigne. Ton partenaire répondra à la seconde. Comparez vos versions après la révélation." : "Dans ton duo, réponds à la seconde partie de la consigne. Ton partenaire répond à la première. Comparez vos versions après la révélation.")
            : (duoCrossRole === "first" ? "In your duo, answer the first part of the prompt. Your partner answers the second. Compare your versions after the reveal." : "In your duo, answer the second part of the prompt. Your partner answers the first. Compare your versions after the reveal.")}</p>
          <small>{lang === "fr" ? "Vous choisissez librement si vos réponses sont privées ou partagées au duo." : "You choose whether your answers stay private or are shared with your duo."}</small>
        </aside>
      )}

      {roundEvent && (
        <aside className="round-event" aria-label="Événement spécial de la manche">
          <div className="round-event__top"><span>{roundEvent.subtitle}</span><span>✦</span></div>
          <h2>{roundEvent.title}</h2>
          <p>{roundEvent.instruction}</p>
          <small>{roundEvent.cue}</small>
        </aside>
      )}

      {paused ? (
        <section className="panel">
          <h2>Partie en pause</h2>
          <p className="muted">La partie est en pause. Les réponses et les validations sont suspendues.</p>
          <button className="primary full" type="button" data-testid="duo-resume" onClick={onResume} disabled={busy}>
            Reprendre la partie <Icon name="play" />
          </button>
        </section>
      ) : !snap.revealed ? (
        <section className="panel">
          <h2>Ta réponse</h2>
          <label className="field">
            <span>Qui peut la voir ?</span>
            <select data-testid="duo-visibility" value={visibility} onChange={(e) => setVisibility(e.target.value as typeof visibility)} disabled={busy}>
              <option value="private">Moi uniquement</option>
              <option value="duo" disabled={!snap.permissions.share_answers}>Mon duo (autorisation de partage requise)</option>
              <option value="group" disabled={!snap.permissions.share_answers || !canGroup}>Les quatre (accord de tous requis)</option>
            </select>
          </label>
          {isSecret ? (
            <div className="options" role="radiogroup" aria-label={lang === "fr" ? "Choisis une option" : "Choose an option"}>
              {(interaction.options ?? []).map((option) => (
                <button key={option} type="button" role="radio" aria-checked={answer === option}
                  className={"option " + (answer === option ? "is-selected" : "")} disabled={busy || paused || answered}
                  onClick={() => setAnswer(option)}>
                  <span>{option}</span>{answer === option && <Icon name="check" size={16} />}
                </button>
              ))}
            </div>
          ) : (
            <>
              <textarea className="input duo-answer" data-testid="duo-answer" rows={isPrediction ? 3 : 4} maxLength={2000}
                value={answer} onChange={(e) => setAnswer(e.target.value)}
                placeholder={lang === "fr" ? (isChallenge ? "Décris ton défi, ou valide simplement « défi relevé »." : "Écris ta réponse…") : (isChallenge ? "Describe your challenge, or simply mark it as completed." : "Write your answer…")}
                disabled={busy || paused || answered} />
              {isPrediction && (
                <label className="field">
                  <span>{lang === "fr" ? "Ton pronostic sur la réponse de l'autre" : "Your prediction of the other person's answer"}</span>
                  <input className="input" value={guess} maxLength={2000} onChange={(e) => setGuess(e.target.value)}
                    placeholder={lang === "fr" ? "Ce que l'autre va répondre…" : "What the other person will answer…"} disabled={busy || paused || answered} />
                </label>
              )}
            </>
          )}
          <div className="composer__actions">
            <button className="secondary" type="button" onClick={onPass} disabled={busy || answered}>{lang === "fr" ? "Passer" : "Pass"}</button>
            <button className="primary" type="button" data-testid="duo-send" onClick={() => onSubmit(answerPayload(), visibility)} disabled={busy || paused || answered || !answerPayload()}>
              {isChallenge && !answer.trim() ? (lang === "fr" ? "Défi relevé" : "Challenge completed") : (lang === "fr" ? "Envoyer ma réponse" : "Submit answer")} <Icon name="send" />
            </button>
          </div>
          {answered && <p className="muted">Réponse enregistrée : {visibilityLabel[visibility]}.</p>}
        </section>
      ) : (
        <section className="panel">
          <h2>Réponses visibles</h2>
          <p className="muted small">Chaque réponse n'apparaît que selon l'autorisation de la personne qui l'a écrite.</p>
          <div className="duo-answers" data-testid="duo-answers">
            {snap.answers.map((a) => (
              <article key={a.player_id}>
                <strong>{name(a.player_id)}</strong>
                {(() => {
                  const prediction = !a.passed && interaction.kind === "prediction" ? decodePrediction(a.answer) : null;
                  return prediction ? (
                    <dl className="answer-pair">
                      <div><dt>{lang === "fr" ? "Sa réponse" : "Their answer"}</dt><dd>{prediction.own}</dd></div>
                      <div><dt>{lang === "fr" ? "Son pronostic" : "Their prediction"}</dt><dd>{prediction.guess}</dd></div>
                    </dl>
                  ) : <p>{a.passed ? (lang === "fr" ? "A choisi de passer." : "Chose to pass.") : a.answer}</p>;
                })()}
                {a.visibility && <small>{visibilityLabel[a.visibility] ?? a.visibility}</small>}
              </article>
            ))}
          </div>
          <section className="round-moments" aria-labelledby="duo-round-moments-title">
            <div className="round-moments__intro">
              <span className="round-moments__eyebrow">APRÈS LA RÉVÉLATION</span>
              <h3 id="duo-round-moments-title">Faites vivre la discussion.</h3>
              <p>Choisissez ensemble une relance bonus. Respectez toujours la visibilité choisie par chaque personne.</p>
            </div>
            <div className="round-moments__choices">
              {roundMoments.map((moment, index) => (
                <button key={moment.id} type="button" className={`round-moment ${selectedMoment === moment.id ? "is-selected" : ""}`}
                  aria-pressed={selectedMoment === moment.id}
                  onClick={() => setSelectedMoment(selectedMoment === moment.id ? null : moment.id)}>
                  <span className="round-moment__number">0{index + 1}</span>
                  <span className="round-moment__copy"><strong>{moment.title}</strong><small>{moment.label}</small></span>
                  <span className="round-moment__mark">{selectedMoment === moment.id ? "−" : "+"}</span>
                </button>
              ))}
            </div>
            {selectedMoment && (
              <div className="round-moments__prompt" role="status" aria-live="polite">
                <span>VOTRE RELANCE</span>
                <p>{roundMoments.find((moment) => moment.id === selectedMoment)?.prompt}</p>
                <button type="button" className="round-moments__close" onClick={() => setSelectedMoment(null)}>Fermer</button>
              </div>
            )}
          </section>
          <button className="primary full" type="button" data-testid="duo-next" onClick={onNext} disabled={busy || paused || snap.i_acked}>
            {snap.i_acked ? "En attente des trois autres…" : "Question suivante"}
          </button>
          <p className="muted small">{snap.i_acked ? "Les quatre doivent valider." : "Chacun valide pour avancer ensemble."}</p>
        </section>
      )}

      <details className="panel duo-permissions">
        <summary>Mes autorisations <small>· effet immédiat</small></summary>
        <p className="muted small">
          Chaque autorisation t'appartient. La retirer s'applique tout de suite : l'espace commun se ferme et
          les réponses déjà partagées aux quatre cessent d'être visibles.
        </p>
        <label className="duo-toggle">
          <input type="checkbox" data-testid="duo-live-cross" checked={snap.permissions.cross_participation} onChange={(e) => onPermissions({ ...snap.permissions, cross_participation: e.target.checked, share_answers: e.target.checked ? snap.permissions.share_answers : false })} />
          <span>J'autorise l'espace commun et les interactions croisées.</span>
        </label>
        <label className="duo-toggle">
          <input type="checkbox" data-testid="duo-live-media" checked={snap.permissions.receive_media} onChange={(e) => onPermissions({ ...snap.permissions, receive_media: e.target.checked })} />
          <span>J'accepte de recevoir des messages et des photos personnelles.</span>
        </label>
        <label className="duo-toggle">
          <input type="checkbox" data-testid="duo-live-share" checked={snap.permissions.share_answers} onChange={(e) => onPermissions({ ...snap.permissions, share_answers: e.target.checked })} />
          <span>J'autorise le partage de mes réponses.</span>
        </label>
      </details>

      <section className="panel duo-chat">
        <h2>Les trois espaces</h2>
        <div className="duo-tabs">
          <button type="button" data-testid="duo-tab-group" className={space === "group" ? "is-active" : ""} disabled={!canGroup} onClick={() => setSpace("group")}>
            Tous ensemble{canGroup ? "" : " · accord requis"}
          </button>
          <button type="button" className={space === ownSpace ? "is-active" : ""} onClick={() => setSpace(ownSpace)}>
            Mon duo
          </button>
          <button type="button" disabled title="Espace privé de l'autre duo : personne d'autre n'y entre.">
            L'autre duo · privé
          </button>
        </div>
        <div className="duo-messages">
          {snap.messages.filter((m) => m.space === space).map((m) => (
            <article key={m.id} className={m.sender_player_id === snap.my_player_id ? "mine" : ""}>
              <small>{name(m.sender_player_id)}</small>
              <p>{m.body}</p>
            </article>
          ))}
          {snap.messages.filter((m) => m.space === space).length === 0 && <p className="muted small">Aucun message dans cet espace.</p>}
        </div>
        <div className="duo-chat-send">
          <input className="input" data-testid="duo-msg-input" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} placeholder="Écrire un message…" />
          <button className="primary" type="button" data-testid="duo-msg-send" onClick={sendMessage} disabled={busy || paused || !message.trim() || (space === "group" && !canGroup)}>Envoyer</button>
        </div>
      </section>
    </main>
  );
}

export function DuoEnd({ snap, busy, onReplay, onLeave }: { snap: DuoSnapshot; busy: boolean; onReplay: () => void; onLeave: () => void }) {
  const votes = snap.replay?.votes ?? 0;
  const mine = snap.replay?.mine ?? false;
  return (
    <main className="duo-page page">
      <span className="eyebrow">Fin de la partie DUOS</span>
      <h1>Quatre personnes, un moment à vous.</h1>
      <p className="muted">Les espaces privés sont restés séparés. Les réponses partagées ne sont visibles que selon les autorisations de chacun.</p>
      <section className="duo-roster">
        {snap.players.map((p) => (
          <article className="duo-seat" key={p.id}>
            <Character persona={p.avatar} name={p.nickname} size={86} state="celebrating" />
            <strong>{p.nickname}</strong>
            <small>{duoName(p.duo_no ?? 1)}</small>
          </article>
        ))}
      </section>
      <section className="panel">
        <h2>Rejouer</h2>
        <p className="muted small">
          La revanche repart dans le même salon, avec le même lien. Il faut l'accord des quatre joueurs.
          Les réponses et les messages de cette partie seront effacés au redémarrage.
        </p>
        <button className="primary full" type="button" data-testid="duo-replay" onClick={onReplay} disabled={busy || mine}>
          {mine ? `En attente des autres · ${votes}/${snap.replay?.needed ?? 4}` : `Rejouer à quatre · ${votes}/${snap.replay?.needed ?? 4}`} <Icon name="play" />
        </button>
        <p className="muted small">{votes}/{snap.replay?.needed ?? 4} ont validé.</p>
      </section>
      <button className="secondary full" type="button" onClick={onLeave}>Quitter</button>
    </main>
  );
}
