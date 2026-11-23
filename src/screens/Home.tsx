import { Icon } from "../components/Icon";
import { asset } from "../lib/assets";
import { translator, type Lang } from "../lib/i18n";

interface HomeProps {
  lang: Lang;
  onEnter: () => void;
  onInvite: () => void;
}

export function Home({ lang, onEnter, onInvite }: HomeProps) {
  const t = translator(lang);
  return (
    <main className="home">
      <section className="home__hero">
        <div className="home__copy">
          <span className="eyebrow">{t("home.eyebrow")}</span>
          <h1 className="home__tagline">{t("home.tagline")}</h1>
          <p className="home__lead">{t("home.lead")}</p>
          <div className="home__actions">
            <button className="primary home__enter" type="button" data-testid="enter" onClick={onEnter}>
              {t("home.enter")} <Icon name="arrow" />
            </button>
          </div>
          <button className="link-button" type="button" data-testid="join-room" onClick={onInvite}>
            {t("home.invite")}
          </button>
          <p className="home__age">
            <Icon name="shield" size={15} /> {t("home.age")}
          </p>
        </div>

        <figure className="home__visual">
          <img
            src={asset("brand/accueil-qspicy.webp")}
            alt=""
            width={1310}
            height={1400}
            decoding="async"
          />
          <figcaption>{t("home.caption")}</figcaption>
        </figure>
      </section>
    </main>
  );
}
