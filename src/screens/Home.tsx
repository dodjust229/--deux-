import { Wordmark } from "../components/Brand";
import { Icon } from "../components/Icon";
import { asset } from "../lib/assets";

interface HomeProps {
  onCreate: () => void;
  onCreateDuo: () => void;
  onJoin: () => void;
}

export function Home({ onCreate, onCreateDuo, onJoin }: HomeProps) {
  return (
    <main className="home">
      <section className="home__hero">
        <div className="home__copy">
          <span className="eyebrow">Jeu de conversation · 18 ans et plus</span>
          <Wordmark as="h1" size={200} className="home__logo" />
          <p className="home__lead">
            Deux ou quatre personnes, une conversation qui ose. Des questions qui font rire, des confidences qui
            rapprochent, des défis qu'on peut toujours refuser — et deux personnages qui les mettent en
            scène.
          </p>
          <div className="home__actions">
            <button className="primary" type="button" data-testid="create-room" onClick={onCreate}>
              Créer une partie <Icon name="arrow" />
            </button>
            <button className="secondary" type="button" data-testid="create-duos" onClick={onCreateDuo}> <Icon name="users" /> Créer un salon DUOS · 4 joueurs</button>
            <button className="secondary" type="button" data-testid="join-room" onClick={onJoin}>
              <Icon name="link" /> Rejoindre une partie
            </button>
          </div>
          <p className="home__age">
            <Icon name="shield" size={15} /> Gratuit · Sans compte · Chacun peut passer ou s'arrêter
          </p>
        </div>

        <figure className="home__visual">
          <img
            src={asset("brand/accueil-qspicy.webp")}
            alt="Deux adultes dans une chambre, lumière chaude et cœur de néon"
            width={1310}
            height={1400}
            decoding="async"
          />
          <figcaption>Un espace privé, à deux ou à quatre.</figcaption>
        </figure>
      </section>

      <section className="home__strip">
        <article>
          <span className="home__strip-icon"><Icon name="link" /></span>
          <h3>Un lien privé</h3>
          <p>Vous créez une salle, vous partagez un lien. Personne d'autre n'entre.</p>
        </article>
        <article>
          <span className="home__strip-icon"><Icon name="bolt" /></span>
          <h3>Quatre niveaux d'audace</h3>
          <p>De la première taquinerie aux questions sans filtre, chacun choisit jusqu'où aller.</p>
        </article>
        <article>
          <span className="home__strip-icon"><Icon name="shield" /></span>
          <h3>Chacun ses limites</h3>
          <p>Passer ne coûte rien, une confidence peut rester privée, et quitter reste toujours possible.</p>
        </article>
      </section>
    </main>
  );
}
