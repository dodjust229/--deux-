import { Icon } from "../components/Icon";
import { asset } from "../lib/assets";
import { translator, type Lang } from "../lib/i18n";

interface HomeProps {
  lang: Lang;
  onEnter: () => void;
  onInvite: () => void;
}

const salons = [
  { id: "couple", title: "À Deux", description: "Deux joueurs. Des réponses sans détour.", icon: "heart" as const, available: true },
  { id: "custom", title: "Personnalisé", description: "Un espace privé pour vos propres échanges.", icon: "sparkles" as const, available: true },
  { id: "duos", title: "DUOS", description: "Quatre joueurs. Deux équipes. Une seule soirée.", icon: "bolt" as const, available: true },
  { id: "anonymous", title: "Anonyme", description: "Ce salon arrive bientôt.", icon: "lock" as const, available: false }
];

export function Home({ lang, onEnter, onInvite }: HomeProps) {
  const t = translator(lang);
  return (
    <main className="home home--hero home--after-dark">
      <picture className="home__bg" aria-hidden="true">
        <source
          media="(max-width: 699px)"
          srcSet={asset("brand/accueil-mobile.webp")}
          width={1080}
          height={1440}
        />
        <source
          media="(max-width: 1099px)"
          srcSet={asset("brand/accueil-tablette.webp")}
          width={1280}
          height={960}
        />
        <img
          src={asset("brand/accueil-bureau.webp")}
          alt=""
          width={1600}
          height={900}
          decoding="async"
          fetchPriority="high"
        />
      </picture>
      <div className="home__scrim" aria-hidden="true" />
      <div className="home__light home__light--amber" aria-hidden="true" />
      <div className="home__light home__light--wine" aria-hidden="true" />

      <section className="home__hero">
        <div className="home__copy">
          <span className="eyebrow home__eyebrow">{t("home.eyebrow")}</span>
          <h1 className="home__tagline">{t("home.tagline")}</h1>
          <p className="home__lead">{t("home.lead")}</p>
          <div className="home__actions">
            <button className="primary home__enter" type="button" data-testid="enter" onClick={onEnter}>
              {t("home.enter")} <Icon name="arrow" />
            </button>
            <button className="home__invite" type="button" data-testid="join-room" onClick={onInvite}>
              {t("home.invite")}
            </button>
          </div>
          <p className="home__age">
            <Icon name="shield" size={15} /> {t("home.age")}
          </p>
        </div>

        <div className="home__salon-panel">
          <div className="home__salon-heading">
            <span className="eyebrow">CHOISISSEZ VOTRE SALON</span>
            <span className="home__salon-count">03 EXPÉRIENCES DISPONIBLES</span>
          </div>
          <div className="home__salons">
            {salons.map((salon, index) => (
              <button
                key={salon.id}
                className={`home__salon home__salon--${salon.id}`}
                type="button"
                disabled={!salon.available}
                onClick={onEnter}
                data-testid={`home-salon-${salon.id}`}
              >
                <span className="home__salon-index">0{index + 1}</span>
                <span className="home__salon-icon"><Icon name={salon.icon} size={20} /></span>
                <span className="home__salon-copy">
                  <strong>{salon.title}</strong>
                  <small>{salon.description}</small>
                </span>
                {salon.available
                  ? <Icon name="arrow" className="home__salon-arrow" size={17} />
                  : <span className="home__salon-soon">BIENTÔT</span>}
              </button>
            ))}
          </div>
          <p className="home__salon-foot">Une expérience privée. Vos règles. Votre soirée.</p>
        </div>
      </section>

      <p className="home__caption">QSPICY <span>—</span> THE NIGHT IS YOURS</p>
    </main>
  );
}
