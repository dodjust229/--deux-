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
    <main className="home home--hero">
      <picture className="home__bg">
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
      </section>

      <p className="home__caption">{t("home.caption")}</p>
    </main>
  );
}
