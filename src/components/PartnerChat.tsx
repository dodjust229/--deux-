import { useState } from "react";
import { Icon } from "./Icon";
import type { PartnerMessage } from "../types";
import type { Lang } from "../lib/i18n";

interface Props {
  messages: readonly PartnerMessage[];
  myPlayerId: string;
  partnerName: string;
  busy: boolean;
  paused: boolean;
  onSend: (body: string) => void;
  lang: Lang;
}

const REACTIONS = ["❤️", "😏", "🔥", "👏", "😂"];

export function PartnerChat({ messages, myPlayerId, partnerName, busy, paused, onSend, lang }: Props) {
  const en = lang === "en";
  const [draft, setDraft] = useState("");
  const locked = busy || paused;

  const send = (value = draft) => {
    const body = value.trim();
    if (!body || locked) return;
    onSend(body);
    setDraft("");
  };

  return (
    <section className="panel partner-chat" aria-labelledby="partner-chat-title" data-testid="partner-chat">
      <header className="partner-chat__head">
        <div>
          <span className="partner-chat__eyebrow">{en ? "PRIVATE EXCHANGE" : "ÉCHANGE PRIVÉ"}</span>
          <h3 id="partner-chat-title">{en ? "Keep the conversation going" : "Prolongez l'échange à deux"}</h3>
          <p>{en ? "Comment on your answers or send a quick reaction." : "Commentez vos réponses ou envoyez une réaction rapide."}</p>
        </div>
        <Icon name="quote" size={20} />
      </header>

      <div className="partner-chat__messages" role="log" aria-live="polite" aria-relevant="additions text">
        {messages.length === 0 ? (
          <p className="partner-chat__empty">{en ? "Your private conversation starts here." : "Votre conversation privée commence ici."}</p>
        ) : messages.map((message) => (
          <article key={message.id} className={message.sender_player_id === myPlayerId ? "partner-chat__message is-mine" : "partner-chat__message"}>
            <small>{message.sender_player_id === myPlayerId ? (en ? "You" : "Vous") : partnerName}</small>
            <p>{message.body}</p>
          </article>
        ))}
      </div>

      <div className="partner-chat__reactions" role="group" aria-label={en ? "Quick reactions" : "Réactions rapides"}>
        {REACTIONS.map((reaction) => (
          <button key={reaction} type="button" className="partner-chat__reaction" disabled={locked} onClick={() => send(reaction)} aria-label={en ? `Send reaction ${reaction}` : `Envoyer la réaction ${reaction}`}>
            {reaction}
          </button>
        ))}
      </div>

      <div className="partner-chat__composer">
        <input
          data-testid="partner-message-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value.slice(0, 2000))}
          maxLength={2000}
          disabled={locked}
          placeholder={en ? "Write a comment…" : "Écrire un commentaire…"}
          onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }}
        />
        <button type="button" className="primary" data-testid="partner-message-send" onClick={() => send()} disabled={locked || !draft.trim()}>
          {en ? "Send" : "Envoyer"} <Icon name="send" size={15} />
        </button>
      </div>
    </section>
  );
}
