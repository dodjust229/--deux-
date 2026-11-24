import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isConfigured } from "./supabase";
import {
  createRoom,
  createDuoRoom,
  getSessionSnapshot,
  joinRoom,
  leaveRoom,
  nextInteraction,
  restartGame,
  setAdultConsent,
  setPause,
  setPlayerCategories,
  startGame,
  submitAnswer,
  startCustomGame,
  getCustomDeck,
  startDuoGame,
  nextDuoInteraction,
  submitDuoAnswer,
  setDuoPermissions,
  sendDuoMessage,
  restartDuoGame,
  setRoomMediaPermission,
  clearRoomPhotos,
  cleanupExpiredRoomPhotos
} from "./api";
import { extractRoomId, getSelectedInterests, parseError, sessionFingerprint } from "./lib/protocol";
import { deriveScene } from "./lib/scene";
import { clearPrivateAnswers } from "./lib/media";
import { applyPreferences, categoriesForIntensity, readPreferences, writePreferences, type Preferences } from "./lib/prefs";
import { previewDuoSnapshot, previewSnapshot } from "./lib/preview";
import { playSound, stopAmbience } from "./lib/sound";
import type { Category, Player, Snapshot } from "./types";
import { interactions } from "./content";
import { explainCustomError, resolveCustomInteraction } from "./lib/custom";
import { Wordmark } from "./components/Brand";
import { Icon } from "./components/Icon";
import { PhotoShare } from "./components/PhotoShare";
import { Settings } from "./components/Settings";
import { Safety } from "./components/Safety";
import { Guide } from "./components/Guide";
import { Stage } from "./components/Stage";
import { SalonAmbiance } from "./components/SalonAmbiance";
import type { StagePlayer } from "./components/Stage";
import { Home } from "./screens/Home";
import { Mode } from "./screens/Mode";
import { Preferences as PreferencesScreen } from "./screens/Preferences";
import { Enter } from "./screens/Enter";
import { Lobby } from "./screens/Lobby";
import { Game } from "./screens/Game";
import { End } from "./screens/End";
import { DuoLobby, DuoGame, DuoEnd } from "./screens/DuoScreens";
import type { DuoSnapshot } from "./types";

type GameMode = "couple" | "duos" | "custom";
type Identity = { roomId: string; token: string; nickname: string; avatar: "masculin" | "feminin"; gameMode?: GameMode };
type Entry = { mode: "create" | "join"; code: string; gameMode?: GameMode } | null;
type FlowStage = "home" | "mode" | "prefs" | "enter";

const IDENTITY_KEY = "adeux_identity";
const IDENTITY_COOKIE = "qspicy_session";

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readIdentity(): Identity | null {
  try {
    const raw = storage()?.getItem(IDENTITY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Identity>;
    if (!parsed.roomId || !parsed.token || !parsed.nickname) return null;
    return {
      roomId: parsed.roomId,
      token: parsed.token,
      nickname: parsed.nickname,
      avatar: parsed.avatar === "feminin" ? "feminin" : "masculin",
      gameMode: parsed.gameMode === "duos" ? "duos" : parsed.gameMode === "custom" ? "custom" : "couple"
    };
  } catch {
    return null;
  }
}

function saveIdentity(identity: Identity | null): void {
  try {
    if (!identity) {
      storage()?.removeItem(IDENTITY_KEY);
      document.cookie = `${IDENTITY_COOKIE}=; max-age=0; path=/; samesite=lax`;
      return;
    }
    storage()?.setItem(IDENTITY_KEY, JSON.stringify(identity));
    // Repli par cookie (durée de la salle) quand le stockage local est bloqué en navigation privée.
    document.cookie = `${IDENTITY_COOKIE}=1; max-age=21600; path=/; samesite=lax`;
  } catch {
    /* stockage indisponible : la session reste en mémoire */
  }
}

export default function App() {
  const [prefs, setPrefs] = useState<Preferences>(() => readPreferences(storage()));
  const [systemReduced, setSystemReduced] = useState(false);
  const previewMode = import.meta.env.DEV ? new URLSearchParams(location.search).get("apercu") : null;
  const previewDuo = Boolean(previewMode?.startsWith("duo-"));
  const [identity, setIdentity] = useState<Identity | null>(() =>
    previewMode && previewMode !== "home"
      ? { roomId: "demo", token: "demo", nickname: "Tao", avatar: "masculin", gameMode: previewDuo ? "duos" : "couple" }
      : readIdentity()
  );
  const [snapshot, setSnapshot] = useState<Snapshot | null>(() =>
    previewMode && previewMode !== "home" ? (previewDuo ? previewDuoSnapshot(previewMode) : previewSnapshot(previewMode)) : null
  );
  const [entry, setEntry] = useState<Entry>(() => {
    const params = new URLSearchParams(location.search);
    const room = params.get("room");
    const mode: GameMode = params.get("mode") === "custom" ? "custom" : "couple";
    return room ? { mode: "join", code: room, gameMode: mode } : null;
  });
  const [flowMode, setFlowMode] = useState<GameMode>("couple");
  const [stage, setStage] = useState<FlowStage>(() =>
    new URLSearchParams(location.search).get("room") ? "enter" : "home"
  );
  const [selected, setSelected] = useState<Category[]>(() => categoriesForIntensity(prefs.gameLevel >= 3 ? "veryHot" : prefs.intensity, prefs.exclusions));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [partnerLeft, setPartnerLeft] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(() => import.meta.env.DEV && new URLSearchParams(location.search).has("reglages"));
  const [safeOpen, setSafeOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [customDeck, setCustomDeck] = useState<string[]>([]);
  const [customError, setCustomError] = useState("");
  const [copied, setCopied] = useState(false);

  const failures = useRef(0);
  const inFlight = useRef<string | null>(null);
  const lastQuestion = useRef<string | null>(null);
  const previous = useRef<Snapshot | null>(null);
  const activeSession = useRef<string | null>(null);
  const currentSession = sessionFingerprint(identity);
  if (activeSession.current !== currentSession) {
    activeSession.current = currentSession;
    previous.current = null;
    lastQuestion.current = null;
    failures.current = 0;
  }

  /* ---------- Préférences locales (jamais synchronisées) ---------- */
  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return;
    const update = () => setSystemReduced(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    applyPreferences(document.documentElement, prefs);
    if (systemReduced && !prefs.reducedMotion) document.documentElement.dataset.motion = "reduced";
    writePreferences(storage(), prefs);
  }, [prefs, systemReduced]);

  useEffect(() => {
    void cleanupExpiredRoomPhotos().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!identity || snapshot?.room.status === "finished") stopAmbience();
  }, [identity, snapshot?.room.status]);

  /* ---------- Session ---------- */
  const dropSession = useCallback((message: string) => {
    if (identity) void clearRoomPhotos(identity.roomId, identity.token).catch(() => undefined);
    const localStorage = storage();
    if (identity && localStorage) clearPrivateAnswers(identity.roomId, localStorage);
    activeSession.current = null;
    previous.current = null;
    lastQuestion.current = null;
    failures.current = 0;
    saveIdentity(null);
    setIdentity(null);
    setSnapshot(null);
    setPartnerLeft(null);
    setSettingsOpen(false);
    history.replaceState({}, "", location.pathname);
    setNotice(message);
  }, [identity]);

  const refresh = useCallback(async () => {
    if (!identity) return;
    const requestSession = sessionFingerprint(identity);
    if (!requestSession || inFlight.current === requestSession) return;
    inFlight.current = requestSession;
    try {
      const data = await getSessionSnapshot(identity.roomId, identity.token, identity.gameMode);
      if (activeSession.current !== requestSession) return;
      failures.current = 0;
      setOffline(false);
      setSnapshot(data);

      if (data.room.status === "waiting" && data.my_categories?.length) setSelected(data.my_categories);

      const key = `${data.room.current_index}:${data.interaction_id}`;
      if (key !== lastQuestion.current) {
        lastQuestion.current = key;
        setError("");
      }

      const before = previous.current;
      if (before) {
        if (!before.revealed && data.revealed) playSound("reveal", prefs);
        else if (before.room.current_index !== data.room.current_index) playSound("turn", prefs);

        const joined = data.players.filter((player) => !before.players.some((old) => old.id === player.id));
        const departed = before.players.filter((player) => !data.players.some((current) => current.id === player.id));
        const wentOffline = data.players.filter((player) =>
          player.id !== data.my_player_id && !player.online &&
          before.players.some((old) => old.id === player.id && old.online)
        );
        const cameBackOnline = data.players.filter((player) =>
          player.id !== data.my_player_id && player.online &&
          before.players.some((old) => old.id === player.id && !old.online)
        );
        if (joined.length > 0) {
          playSound("join", prefs);
          setNotice(data.my_seat === 1
            ? `Invitation acceptée : ${joined[0].nickname} a rejoint le salon.`
            : `${joined[0].nickname} a rejoint le salon.`);
          setPartnerLeft(null);
        }
        if (departed.length > 0 || wentOffline.length > 0) {
          const person = departed[0] ?? wentOffline[0];
          if (identity.gameMode === "duos") setNotice(`${person.nickname} a quitté le salon ou perdu la connexion.`);
          else {
            setNotice("");
            setPartnerLeft(person.nickname);
          }
        }
        if (cameBackOnline.length > 0) {
          setPartnerLeft(null);
          setNotice(`${cameBackOnline[0].nickname} est de retour dans le salon.`);
        }
      }
      previous.current = data;
    } catch (caught) {
      if (activeSession.current !== requestSession) return;
      const parsed = parseError(caught);
      if (parsed.fatal) dropSession(parsed.message);
      else {
        failures.current += 1;
        setOffline(true);
      }
    } finally {
      if (inFlight.current === requestSession) inFlight.current = null;
    }
  }, [identity, dropSession, prefs]);

  useEffect(() => {
    if (identity && !previewMode) void refresh();
  }, [identity, refresh, previewMode]);

  useEffect(() => {
    if (!identity || previewMode) return;
    let stopped = false;
    let timer = 0;
    const loop = () => {
      if (stopped) return;
      void refresh().finally(() => {
        timer = window.setTimeout(loop, Math.min(10000, 2200 + failures.current * 1500));
      });
    };
    timer = window.setTimeout(loop, 2200);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [identity, refresh, previewMode]);

  useEffect(() => {
    if (!identity || previewMode || snapshot?.room.status !== "finished") return;
    void clearRoomPhotos(identity.roomId, identity.token).catch(() => undefined);
  }, [identity, snapshot?.room.status, previewMode]);

  /* Mode Personnalisé : la séquence appartient à la salle, l'écran ne fait que la relire. */
  useEffect(() => {
    if (previewMode || !identity || identity.gameMode !== "custom") return;
    const status = snapshot?.room.status;
    if (status !== "playing" && status !== "paused" && status !== "finished") return;
    let alive = true;
    getCustomDeck(identity.roomId, identity.token)
      .then((deck) => { if (alive) setCustomDeck(Array.isArray(deck) ? deck : []); })
      .catch((caught) => { if (alive) setCustomError(parseError(caught).message); });
    return () => { alive = false; };
  }, [identity, snapshot?.room.status, snapshot?.interaction_id, previewMode]);

  const run = useCallback(
    async (action: () => Promise<unknown>, after = true) => {
      setBusy(true);
      setError("");
      try {
        await action();
        if (after) await refresh();
      } catch (caught) {
        const parsed = parseError(caught);
        if (parsed.fatal) dropSession(parsed.message);
        else setError(parsed.message);
      } finally {
        setBusy(false);
      }
    },
    [dropSession, refresh]
  );

  /* ---------- Entrées / sorties ---------- */
  async function enter({ nickname, persona, code }: { nickname: string; persona: "masculin" | "feminin"; code: string }) {
    const name = nickname.trim();
    if (name.length < 2) return setError("Choisis un prénom de jeu d'au moins 2 caractères.");
    const mode = entry?.mode ?? "create";
    let roomId = "";
    if (mode === "join") {
      const id = extractRoomId(code);
      if (!id) return setError("Ce lien ou identifiant de salle est invalide.");
      try {
        const blockedRooms: string[] = JSON.parse(window.localStorage.getItem("qspicy.blockedRooms") ?? "[]");
        if (blockedRooms.includes(id)) return setError("Tu as bloqué cette salle sur cet appareil. Tu ne peux pas la rejoindre à nouveau.");
      } catch { /* stockage indisponible : la session reste utilisable */ }
      roomId = id;
    }
    setBusy(true);
    setError("");
    try {
      const result = mode === "create" ? (entry?.gameMode === "duos" ? await createDuoRoom(name, persona) : await createRoom(name, persona)) : await joinRoom(roomId, name, persona);
      if (mode === "create") {
        await setPlayerCategories(result.room_id, result.player_token, [selected[0] ?? "decouverte"]);
      }
      // Le salon Personnalisé utilise la salle à deux du serveur : on garde le mode choisi
      // à l'écran, sinon un invité retomberait sur le lobby du catalogue.
      const gameMode: GameMode = entry?.gameMode === "custom" ? "custom" : (result.mode ?? entry?.gameMode ?? "couple");
      const nextIdentity: Identity = { roomId: result.room_id, token: result.player_token, nickname: name, avatar: persona, gameMode };
      saveIdentity(nextIdentity);
      activeSession.current = sessionFingerprint(nextIdentity);
      lastQuestion.current = null;
      previous.current = null;
      failures.current = 0;
      setNotice("");
      setPartnerLeft(null);
      setIdentity(nextIdentity);
      setEntry(null);
      history.replaceState({}, "", `${location.pathname}?room=${result.room_id}`);
    } catch (caught) {
      setError(parseError(caught).message);
    } finally {
      setBusy(false);
    }
  }

  const launchCustom = (interactionIds: string[]) =>
    run(async () => {
      if (!identity) return;
      try {
        await startCustomGame(identity.roomId, identity.token, interactionIds);
        setCustomError("");
      } catch (caught) {
        // Le serveur valide les identifiants, les catégories communes et le consentement 18+.
        setCustomError(explainCustomError(prefs.language, parseError(caught).message));
      }
    });

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Copie impossible : sélectionne le lien affiché à la main.");
    }
  };

  async function exitRoom() {
    setPartnerLeft(null);
    if (identity) {
      try {
        await clearRoomPhotos(identity.roomId, identity.token);
      } catch {
        /* la sortie reste possible même si le nettoyage photo échoue */
      }
      try {
        await leaveRoom(identity.roomId, identity.token);
      } catch {
        /* on quitte quand même */
      }
    }
    dropSession("Tu as quitté la salle.");
  }

  /* ---------- Données dérivées ---------- */
  const mePlayer: Player | undefined = snapshot?.players.find((player) => player.id === snapshot.my_player_id);
  const otherPlayer: Player | null = snapshot?.players.find((player) => player.id !== snapshot?.my_player_id && (identity?.gameMode !== "duos" || player.duo_no === mePlayer?.duo_no)) ?? null;

  const me: StagePlayer = {
    nickname: mePlayer?.nickname ?? identity?.nickname ?? "Toi",
    persona: mePlayer?.avatar ?? identity?.avatar ?? "masculin",
    online: mePlayer?.online ?? true,
    seat: snapshot?.my_seat === 2 || snapshot?.my_seat === 4 ? 2 : 1
  };
  const other: StagePlayer | null = otherPlayer
    ? { nickname: otherPlayer.nickname, persona: otherPlayer.avatar, online: otherPlayer.online, seat: otherPlayer.seat === 1 || otherPlayer.seat === 3 ? 1 : 2 }
    : null;

  const inviteUrl = useMemo(() => {
    if (!identity) return "";
    const suffix = identity.gameMode === "custom" ? "&mode=custom" : "";
    return `${location.origin}${location.pathname}?room=${identity.roomId}${suffix}`;
  }, [identity]);

  const interaction = useMemo(() => {
    const custom = identity?.gameMode === "custom" ? resolveCustomInteraction(snapshot?.interaction_id ?? null, customDeck) : null;
    return custom ?? snapshot?.interaction ?? null;
  }, [identity?.gameMode, snapshot?.interaction, snapshot?.interaction_id, customDeck]);
  const shared = useMemo(() => identity?.gameMode === "duos" && snapshot
    ? getSelectedInterests([], snapshot.players.map(player => player.selected_categories))
    : getSelectedInterests(selected, [snapshot?.other_categories]), [identity?.gameMode, snapshot, selected]);
  const bothConsent = Boolean(snapshot && snapshot.players.length === (identity?.gameMode === "duos" ? 4 : 2) && snapshot.players.every((player) => player.adult_consent));

  const scene = useMemo(() => {
    if (!snapshot) return null;
    const status = snapshot.room.status === "finished" ? "finished" : snapshot.room.status === "paused" ? "paused" : "playing";
    const kind = interaction?.kind ?? null;
    const firstDone =
      kind === "cross"
        ? (snapshot.my_seat === 1 || snapshot.my_seat === 3)
          ? snapshot.my_answer != null
          : snapshot.other_submitted || !snapshot.first_player_present
        : false;
    return deriveScene({
      status,
      kind,
      index: snapshot.room.current_index,
      mySeat: snapshot.my_seat === 2 || snapshot.my_seat === 4 ? 2 : 1,
      myAnswer: snapshot.my_answer,
      otherSubmitted: snapshot.other_submitted,
      firstDone,
      prompt: interaction?.prompt ?? "",
      revealed: snapshot.revealed,
      otherOnline: otherPlayer?.online ?? false
    });
  }, [snapshot, interaction, otherPlayer?.online]);

  const canSend = Boolean(
    snapshot &&
      interaction &&
      !busy &&
      snapshot.my_answer == null &&
      snapshot.room.status === "playing" &&
      !(interaction.kind === "cross" && snapshot.my_seat === 2 && snapshot.first_answer == null && snapshot.first_player_present && !snapshot.other_submitted)
  );

  const hint = (() => {
    if (!snapshot) return "";
    if (snapshot.my_answer != null) return "";
    if (interaction?.kind === "cross" && snapshot.my_seat === 2 && snapshot.first_answer == null)
      return "Attends la réponse du premier joueur pour pouvoir réagir.";
    if (snapshot.other_submitted) return `${other?.nickname ?? "L'autre personne"} a répondu. À toi.`;
    if (interaction?.kind === "challenge") return "Défi facultatif : tu peux l'écrire, ou simplement dire que tu le relèves.";
    return "Les réponses restent cachées jusqu'à ce que vous ayez répondu tous les deux.";
  })();

  const toggleCategory = (category: Category) => {
    const next = [category]; // un seul centre d'intérêt par participant
    setSelected(next);
    if (identity && snapshot?.room.status === "waiting") void run(() => setPlayerCategories(identity.roomId, identity.token, next));
  };

  const submit = (payload: string) => {
    if (!identity) return;
    void run(async () => {
      await submitAnswer(identity.roomId, identity.token, payload, false);
      playSound("send", prefs);
    });
  };

  const pass = () => {
    if (!identity) return;
    void run(() => submitAnswer(identity.roomId, identity.token, "", true));
  };

  /* ---------- Rendu ---------- */
  const toast = (message: string, kind: "error" | "notice") => (
    <div className={`toast toast--${kind}`} role={kind === "error" ? "alert" : "status"}>
      <span>{message}</span>
      <button
        type="button"
        aria-label="Fermer le message"
        onClick={() => (kind === "error" ? setError("") : setNotice(""))}
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  );

  return (
    <div className="app">
      {/* Fond animé du salon : monté à la racine. Dans un écran animé (.game, .duo-page),
          le transform de page-in crée un bloc conteneur et rogne le calque fixed. */}
      {snapshot && (
        <SalonAmbiance
          salon={identity?.gameMode === "duos" ? "duos" : "couple"}
          level={(snapshot.interaction?.level ?? 1) as 1 | 2 | 3 | 4}
          paused={snapshot.room.status === "paused"}
          waiting={Boolean(snapshot.my_answer && !snapshot.revealed)}
        />
      )}
      {!(
        identity &&
        snapshot &&
        (snapshot.room.status === "playing" || snapshot.room.status === "paused")
      ) && (
        <header className={`topbar${!identity && stage === "home" ? " topbar--over" : ""}`}>
          <button className="topbar__brand" type="button" onClick={() => { if (!identity) { setEntry(null); setError(""); } }}>
            <Wordmark size={38} />
          </button>
          <div className="topbar__right">
            <span className="topbar__private">
              <Icon name="lock" size={14} /> Partie privée
            </span>
            {identity && (
              <button className="icon-button" type="button" onClick={() => setSettingsOpen(true)} aria-label="Réglages">
                <Icon name="settings" />
              </button>
            )}
          </div>
        </header>
      )}

      {offline && (
        <div className="toast toast--notice" role="status">
          <Icon name="wifiOff" size={16} /> Reconnexion… la partie est conservée.
        </div>
      )}
      {notice && toast(notice, "notice")}
      {error && toast(error, "error")}
      {partnerLeft && identity && identity.gameMode !== "duos" && (
        <div className="sheet" role="alertdialog" aria-modal="true" aria-labelledby="partner-left-title">
          <button className="sheet__backdrop" type="button" aria-label="Fermer" onClick={() => setPartnerLeft(null)} />
          <div className="sheet__panel">
            <header className="sheet__head">
              <h2 id="partner-left-title">Connexion interrompue avec {partnerLeft}.</h2>
            </header>
            <p className="sheet__note">Cette personne a quitté le salon ou perdu la connexion. Voulez-vous toujours continuer ? Tu peux poursuivre seul(e), ou quitter la partie.</p>
            <div className="sheet__actions">
              <button className="primary full" type="button" onClick={() => setPartnerLeft(null)}>
                Continuer la partie
              </button>
              <button className="secondary full" type="button" onClick={() => void exitRoom()}>
                Retourner à l'accueil
              </button>
            </div>
          </div>
        </div>
      )}

      {!isConfigured && !previewMode ? (
        <main className="setup page">
          <div className="panel">
            <Wordmark size={30} />
            <h1>Connexion au serveur à configurer.</h1>
            <p className="muted">
              Il manque les variables <code>VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_ANON_KEY</code>.
              Elles se règlent dans le fichier <code>.env</code> (voir INSTALLATION.md) — les joueurs n'ont jamais
              à faire cette manipulation.
            </p>
          </div>
        </main>
      ) : !identity ? (
        stage === "home" ? (
          <Home
            lang={prefs.language}
            onEnter={() => {
              setError("");
              setStage("mode");
            }}
            onInvite={() => {
              const room = new URLSearchParams(location.search).get("room") ?? "";
              setEntry({ mode: "join", code: room, gameMode: "couple" });
              setError("");
              setStage("enter");
            }}
          />
        ) : stage === "mode" ? (
          <Mode
            lang={prefs.language}
            onSelect={(mode) => {
              setFlowMode(mode);
              setError("");
              setStage("prefs");
            }}
            onBack={() => setStage("home")}
          />
        ) : stage === "prefs" ? (
          <PreferencesScreen
            lang={prefs.language}
            prefs={prefs}
            onChange={setPrefs}
            onContinue={() => {
              setSelected(categoriesForIntensity(prefs.gameLevel >= 3 ? "veryHot" : prefs.intensity, prefs.exclusions));
              setEntry({ mode: "create", code: "", gameMode: flowMode });
              setError("");
              setStage("enter");
            }}
            onBack={() => setStage("mode")}
          />
        ) : (
          <Enter
            mode={entry?.mode ?? "create"}
            duoMode={entry?.gameMode === "duos"}
            initialCode={entry?.code ?? ""}
            lang={prefs.language}
            busy={busy}
            error={error}
            onBack={() => {
              setError("");
              setStage(entry?.mode === "join" ? "home" : "prefs");
            }}
            onSubmit={enter}
          />
        )
      ) : !snapshot || !scene ? (
        <main className="page loading">
          <p className="muted" role="status">
            {offline ? "Connexion impossible pour le moment… nouvelle tentative." : "Ouverture de la salle…"}
          </p>
        </main>
      ) : snapshot.room.status === "waiting" ? (
        identity.gameMode === "duos" ? (
          <DuoLobby
            snap={snapshot as DuoSnapshot}
            inviteUrl={inviteUrl}
            copied={copied}
            onCopy={copyInvite}
            selected={selected}
            shared={shared}
            onToggleCategory={toggleCategory}
            onToggleConsent={(value) => identity && void run(() => setAdultConsent(identity.roomId, identity.token, value))}
            onPermissions={(permissions) => identity && void run(() => setDuoPermissions(identity.roomId, identity.token, permissions))}
            onStart={() => identity && void run(() => startDuoGame(identity.roomId, identity.token, prefs.gameLevel))}
            gameLevel={prefs.gameLevel}
            isHost={snapshot.my_seat === 1}
            busy={busy}
            onSafe={() => setSafeOpen(true)}
            onOpenGuide={() => setGuideOpen(true)}
            lang={prefs.language}
          />
        ) : (
          <Lobby
            me={me}
            other={other}
            otherPlayer={otherPlayer}
            inviteUrl={inviteUrl}
            copied={copied}
            onCopy={copyInvite}
            selected={selected}
            shared={shared}
            onToggleCategory={toggleCategory}
            myConsent={snapshot.my_consent}
            otherConsent={Boolean(otherPlayer?.adult_consent)}
            gameLevel={prefs.gameLevel}
            onToggleConsent={(value) => identity && void run(() => setAdultConsent(identity.roomId, identity.token, value))}
            onLaunch={() => identity && void run(() => startGame(identity.roomId, identity.token, selected, prefs.gameLevel))}
            busy={busy}
            kind={identity.gameMode === "custom" ? "custom" : "couple"}
            customCatalog={interactions}
            selectedCategories={shared}
            onLaunchCustom={launchCustom}
            customError={customError}
            isHost={snapshot.my_seat === 1}
            onOpenGuide={() => setGuideOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        )
      ) : snapshot.room.status === "finished" ? (
        identity.gameMode === "duos" ? (
          <DuoEnd snap={snapshot as DuoSnapshot} busy={busy}
            onReplay={() => identity && void run(() => restartDuoGame(identity.roomId, identity.token))}
            onLeave={exitRoom}/>
        ) : (
          <End snap={snapshot} me={me} other={other} busy={busy}
            onRestart={() => identity && void run(() => restartGame(identity.roomId, identity.token))}
            onLeave={exitRoom}/>
        )
      ) : interaction ? (
        identity.gameMode === "duos" ? (
          <DuoGame
            snap={snapshot as DuoSnapshot}
            interaction={interaction}
            busy={busy}
            paused={snapshot.room.status === "paused"}
            onSubmit={(answer, visibility) => identity && void run(() => submitDuoAnswer(identity.roomId, identity.token, interaction.id, answer, false, visibility))}
            onPass={() => identity && void run(() => submitDuoAnswer(identity.roomId, identity.token, interaction.id, "", true, "private"))}
            onNext={() => identity && void run(() => nextDuoInteraction(identity.roomId, identity.token))}
            onSendMessage={(space, body) => identity && void run(() => sendDuoMessage(identity.roomId, identity.token, space, body))}
            onResume={() => identity && void run(() => setPause(identity.roomId, identity.token, false))}
            onPermissions={(permissions) => identity && void run(() => setDuoPermissions(identity.roomId, identity.token, permissions))}
            onLeave={exitRoom}
            onSafe={() => setSafeOpen(true)}
            onOpenGuide={() => setGuideOpen(true)}
            lang={prefs.language}
          />
        ) : (
          <Game
            snap={snapshot}
            interaction={interaction}
            scene={scene}
            me={me}
            other={other}
            busy={busy}
            paused={snapshot.room.status === "paused"}
            hint={hint}
            canSend={canSend}
            onOpenSettings={() => setSettingsOpen(true)}
            onSubmit={submit}
            onPass={pass}
            onNext={() => identity && void run(() => nextInteraction(identity.roomId, identity.token))}
            onResume={() => identity && void run(() => setPause(identity.roomId, identity.token, false))}
            onSafe={() => setSafeOpen(true)}
            onOpenGuide={() => setGuideOpen(true)}
            lang={prefs.language}
          />
        )
      ) : (
        <main className="page loading">
          <Stage
            scene={scene}
            me={me}
            other={other}
            size={190}
          />
          <p className="muted">La partie se prépare…</p>
        </main>
      )}

      {!previewMode && identity && snapshot && snapshot.room.status !== "finished" && (
        <PhotoShare
          roomId={identity.roomId}
          token={identity.token}
          myPlayerId={snapshot.my_player_id}
          mode={identity.gameMode === "duos" ? "duos" : "couple"}
          lang={prefs.language}
          onPermissionChange={(allow) => void run(() => setRoomMediaPermission(identity.roomId, identity.token, allow), false)}
        />
      )}

      <footer className="footer">
        <span>QSPICY · un espace pour se parler vraiment</span>
        <span>Consentement · Respect · Complicité</span>
      </footer>

      <Guide open={guideOpen} lang={prefs.language} reducedMotion={prefs.reducedMotion || systemReduced} onClose={() => setGuideOpen(false)} />

      <Safety
        open={safeOpen}
        canPause={snapshot?.room.status === "playing" || snapshot?.room.status === "paused"}
        lang={prefs.language}
        onClose={() => setSafeOpen(false)}
        onPause={() => {
          setSafeOpen(false);
          if (identity && snapshot) void run(() => setPause(identity.roomId, identity.token, true));
        }}
        onQuit={() => {
          setSafeOpen(false);
          void exitRoom();
        }}
        onBlock={() => {
          setSafeOpen(false);
          try {
            const blockedKey = "qspicy.bloques";
            const blocked: string[] = JSON.parse(window.localStorage.getItem(blockedKey) ?? "[]");
            const currentSnapshot = snapshot;
            const targets = currentSnapshot
              ? currentSnapshot.players.filter((player) => player.id !== currentSnapshot.my_player_id).map((player) => player.id)
              : (otherPlayer?.id ? [otherPlayer.id] : []);
            const nextBlocked = [...new Set([...blocked, ...targets])];
            window.localStorage.setItem(blockedKey, JSON.stringify(nextBlocked));

            const roomsKey = "qspicy.blockedRooms";
            const blockedRooms: string[] = JSON.parse(window.localStorage.getItem(roomsKey) ?? "[]");
            if (identity?.roomId && !blockedRooms.includes(identity.roomId)) {
              window.localStorage.setItem(roomsKey, JSON.stringify([...blockedRooms, identity.roomId]));
            }
          } catch {
            /* stockage indisponible : le joueur quitte tout de même la salle */
          }
          void exitRoom();
        }}
      />

      <Settings
        open={settingsOpen}
        prefs={prefs}
        onChange={setPrefs}
        onClose={() => setSettingsOpen(false)}
        playing={snapshot?.room.status === "playing" || snapshot?.room.status === "paused"}
        paused={snapshot?.room.status === "paused"}
        onTogglePause={() =>
          identity &&
          snapshot &&
          void run(() => setPause(identity.roomId, identity.token, snapshot.room.status === "playing"))
        }
        adultEnabled={Boolean(snapshot?.room.adult_enabled)}
        onLeaveAdult={() => identity && void run(() => setAdultConsent(identity.roomId, identity.token, false))}
        onLeaveRoom={exitRoom}
        onOpenGuide={() => { setSettingsOpen(false); setGuideOpen(true); }}
        lang={prefs.language}
        busy={busy}
      />
    </div>
  );
}
