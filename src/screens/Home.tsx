import { Wordmark } from "../components/Brand";
import { Icon } from "../components/Icon";
import { Stage } from "../components/Stage";
import type { Scene } from "../lib/scene";

const DEMO_SCENE: Scene = {
  speaker: 1,
  bubble: "J'ai une question qui va te faire sourire…",
  bubbleSeat: 1,
  states: { 1: "speaking", 2: "listening" }
};

interface HomeProps {
  onCreate: () => void;
  onJoin: () => void;
}

export function Home({ onCreate, onJoin }: HomeProps) {
  return (
    <main className="home">
      <section className="home__hero">
        <div className="home__copy">
          <span className="eyebrow">Jeu de complicité · à deux</span>
          <Wordmark as="h1" size={64} className="home__logo" />
          <p className="home__lead">
            Deux personnages, une seule conversation. Des questions qui font rire, des confidences qui
            rapprochent, et quelques défis que l'on peut toujours refuser.
          </p>
          <div className="home__actions">
            <button className="primary" type="button" data-testid="create-room" onClick={onCreate}>
              Créer une partie <Icon name="arrow" />
            </button>
            <button className="secondary" type="button" data-testid="join-room" onClick={onJoin}>
              <Icon name="link" /> Rejoindre une partie
            </button>
          </div>
          <p className="home__age">
            <Icon name="shield" size={15} /> Réservé aux 18 ans et plus · Gratuit · Sans compte
          </p>
        </div>

        <div className="home__scene" aria-hidden="true">
          <span className="home__glow" />
          <Stage
            variant="hero"
            scene={DEMO_SCENE}
            me={{ nickname: "Tao", persona: "masculin", online: true, seat: 1 }}
            other={{ nickname: "Naya", persona: "feminin", online: true, seat: 2 }}
            size={252}
          />
        </div>
      </section>

      <section className="home__strip">
        <article>
          <span className="home__strip-icon"><Icon name="link" /></span>
          <h3>Un lien privé</h3>
          <p>Vous créez une salle, vous partagez un lien. Personne d'autre n'entre.</p>
        </article>
        <article>
          <span className="home__strip-icon"><Icon name="users" /></span>
          <h3>Deux personnages</h3>
          <p>Tao et Naya incarnent la conversation : ils écoutent, réagissent, prennent la parole.</p>
        </article>
        <article>
          <span className="home__strip-icon"><Icon name="shield" /></span>
          <h3>Chacun ses limites</h3>
          <p>Passer une question ne coûte rien, et quitter la partie reste toujours possible.</p>
        </article>
      </section>
    </main>
  );
}
