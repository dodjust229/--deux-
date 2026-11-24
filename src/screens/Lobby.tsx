import { Icon } from "../components/Icon";
import { InfoTip } from "../components/InfoTip";
import { CustomQuestions } from "../components/CustomQuestions";
import type { Lang } from "../lib/i18n";
import { Stage } from "../components/Stage";
import type { StagePlayer } from "../components/Stage";
import type { Scene } from "../lib/scene";
import type { Category, Interaction, Player } from "../types";
import { categoryLabels, categoryDescriptions } from "../content";

const CATEGORIES: Category[] = ["decouverte", "complicite", "profondeur", "seduction", "audacieux"];

const WAITING_SCENE: Scene = {
  speaker: null,
  bubble: null,
  bubbleSeat: null,
  states: { 1: "idle", 2: "idle" }
};

interface LobbyProps {
  me: StagePlayer;
  other: StagePlayer | null;
  otherPlayer: Player | null;
  inviteUrl: string;
  copied: boolean;
  onCopy: () => void;
  selected: Category[];
  shared: Category[];
  onToggleCategory: (category: Category) => void;
  myConsent: boolean;
  otherConsent: boolean;
  onToggleConsent: (value: boolean) => void;
  onLaunch: () => void;
  busy: boolean;
  excluded?: Category[];
  lang?: Lang;
  /** « custom » remplace les ambiances par l'écriture des questions. */
  kind?: "couple" | "custom";
  customCatalog: readonly Interaction[];
  onLaunchCustom?: (questions: string[]) => void;
  customError?: string;
  isHost?: boolean;
  gameLevel?: 1 | 2 | 3 | 4;
  onOpenGuide?: () => void;
  onOpenSettings?: () => void;
}

export function Lobby({
  me,
  other,
  otherPlayer,
  inviteUrl,
  copied,
  onCopy,
  selected,
  shared,
  onToggleCategory,
  myConsent,
  otherConsent,
  onToggleConsent,
  onLaunch,
  busy,
  excluded = [],
  lang = "fr",
  kind = "couple",
  customCatalog,
  onLaunchCustom,
  customError,
  isHost = true,
  gameLevel = 2,
  onOpenGuide,
  onOpenSettings
}: LobbyProps) {
  const custom = kind === "custom";
  const bothPresent = Boolean(other);
  const wantsAdult = shared.includes("audacieux") || gameLevel >= 3;
  const blocked = busy || shared.length === 0 || (wantsAdult && !(myConsent && otherConsent));

  return (
    <main className="lobby page">
      <header className="lobby__head">
        <div>
          <span className="eyebrow">{bothPresent ? "Vous êtes deux" : "Salle privée ouverte"}</span>
          <h1>{bothPresent ? "La scène est prête." : "Plus qu'une personne…"}</h1>
          <p className="muted">
            {custom
              ? bothPresent
                ? "Vos questions remplacent le catalogue. Elles se jouent dans l'ordre écrit."
                : "Envoie ce lien à la personne avec qui tu veux jouer. Les questions s'écrivent en attendant."
              : bothPresent
                ? "Choisissez ensemble les ambiances. Seules les catégories communes seront tirées."
                : "Envoie ce lien à la personne avec qui tu veux jouer. Elle seule pourra entrer."}
          </p>
        </div>
        <div className="lobby__tools">
          {onOpenGuide && (
            <button className="icon-button" type="button" data-testid="lobby-guide" onClick={onOpenGuide}
              aria-label={lang === "en" ? "Open the guide" : "Ouvrir le guide"} title={lang === "en" ? "User guide" : "Guide d'utilisation"}>
              <Icon name="info" />
            </button>
          )}
          {onOpenSettings && (
            <button className="icon-button" type="button" data-testid="open-settings" onClick={onOpenSettings}
              aria-label={lang === "en" ? "Settings" : "Réglages"} title={lang === "en" ? "Settings" : "Réglages"}>
              <Icon name="settings" />
            </button>
          )}
        </div>
        <div className="lobby__invite">
          <span className="lobby__invite-label">
            Lien d'invitation <InfoTip tip="invite" lang={lang} />
          </span>
          <div className="lobby__invite-row">
            <code data-testid="invite-url">{inviteUrl}</code>
            <button type="button" className="secondary" onClick={onCopy}>
              <Icon name="copy" size={16} /> {copied ? "Copié" : "Copier"}
            </button>
          </div>
        </div>
      </header>

      <Stage scene={WAITING_SCENE} me={me} other={other} size={190} variant="lobby" />

      {!bothPresent ? (
        <p className="lobby__waiting" role="status">
          <span className="pulse" aria-hidden="true" /> En attente de la deuxième personne… La page se met à jour
          toute seule.
        </p>
      ) : (
        <>
          {custom ? (
            <CustomQuestions
              lang={lang}
              catalog={customCatalog}
              onLaunch={onLaunchCustom ?? (() => {})}
              isHost={isHost}
              partnerHere={bothPresent}
              busy={busy}
              serverError={customError}
            />
          ) : (
          <>
          <section className="panel" aria-labelledby="ambiances">
            <div className="panel__head">
              <h2 id="ambiances">
                Vos ambiances <InfoTip tip="categories" lang={lang} />
              </h2>
              <span className="muted small">
                {shared.length > 0
                  ? `En commun : ${shared.map((category) => categoryLabels[category]).join(" · ")}`
                  : "Aucune catégorie commune pour l'instant"}
              </span>
            </div>
            <div className="chips" role="group" aria-label={lang === "en" ? "Game categories" : "Catégories de la partie"}>
              {CATEGORIES.map((category) => {
                const on = selected.includes(category);
                const refused = excluded.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={on}
                    aria-disabled={refused}
                    title={refused ? "Exclu dans tes préférences" : undefined}
                    className={`chip chip--${category} ${on ? "is-on" : ""} ${refused ? "is-off" : ""}`}
                    disabled={busy || refused}
                    onClick={() => onToggleCategory(category)}
                  >
                    <span className="chip__check" aria-hidden="true">{on ? "✓" : "+"}</span>
                    <strong>{categoryLabels[category]}</strong>
                    <small>{categoryDescriptions[category]}</small>
                  </button>
                );
              })}
            </div>
            {selected.includes("audacieux") && !shared.includes("audacieux") && (
              <p className="muted small">
                « Audacieux » ne sera tiré que si vous le choisissez tous les deux et que vous cochez le
                consentement 18+.
              </p>
            )}
          </section>

          <section className={`consent ${wantsAdult ? "is-required" : ""}`}>
            <label className="consent__line">
              <input
                type="checkbox"
                checked={myConsent}
                disabled={busy}
                onChange={(event) => onToggleConsent(event.target.checked)}
              />
              <span>
                <strong>{gameLevel >= 3 ? "J'ai 18 ans ou plus et j'accepte les paliers 3–4." : "J'ai 18 ans ou plus et j'accepte la catégorie « Audacieux »."}</strong>
                <small>
                  {gameLevel >= 3 ? "Obligatoire pour les paliers 3–4. Accord révocable à tout moment." : "Facultatif pour les autres paliers ; accord révocable à tout moment."} Les deux joueurs doivent être d’accord.
                </small>
              </span>
            </label>
            <p className="consent__status">
              {otherConsent
                ? `${otherPlayer?.nickname ?? "L'autre personne"} a donné son accord.`
                : `${otherPlayer?.nickname ?? "L'autre personne"} n'a pas encore donné son accord.`}
            </p>
          </section>

          <button className="primary full" type="button" data-testid="launch" disabled={blocked} onClick={onLaunch}>
            {shared.length === 0
              ? "Choisissez au moins une catégorie commune"
              : wantsAdult && !(myConsent && otherConsent)
                ? "En attente de l'accord 18+ des deux"
                : "Lancer la partie"}
            {!blocked && <Icon name="arrow" />}
          </button>
          </>
          )}
        </>
      )}
    </main>
  );
}
