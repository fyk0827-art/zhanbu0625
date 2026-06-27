import { useTranslation } from "react-i18next";
import type { CSSProperties } from "react";
import {
  PLANET_CHARACTER_GRID,
  SUN_CHARACTER,
  getShowcaseAvatarSrc,
  type PlanetCharacterMeta,
} from "@/data/planetCharacters";
import "@/styles/planet-characters.css";

function PlanetCard({ meta }: { meta: PlanetCharacterMeta }) {
  const { t } = useTranslation();
  const name = t(`planetCharName_${meta.planet}`);
  const desc = t(`planetCharDesc_${meta.planet}`);

  return (
    <article
      className="pc-card"
      style={{ "--pc-accent": meta.accent } as CSSProperties}
    >
      <div className="pc-card-visual">
        <img
          src={getShowcaseAvatarSrc(meta.planet, meta.gender)}
          alt={name}
          loading="lazy"
          draggable={false}
        />
      </div>
      <div className="pc-card-body">
        <h3 className="pc-card-name">{name}</h3>
        <p className="pc-card-desc">{desc}</p>
      </div>
    </article>
  );
}

export default function PlanetCharactersSection() {
  const { t } = useTranslation();

  return (
    <section className="pc-section" aria-labelledby="pc-section-title">
      <header className="pc-header">
        <p className="pc-eyebrow">{t("planetCharsEyebrow")}</p>
        <h2 id="pc-section-title" className="pc-title">
          {t("planetCharsTitle")}
        </h2>
        <p className="pc-subtitle">{t("planetCharsSubtitle")}</p>
      </header>

      <div className="pc-grid">
        {PLANET_CHARACTER_GRID.map((meta) => (
          <PlanetCard key={meta.planet} meta={meta} />
        ))}
      </div>

      <div className="pc-sun-hero" style={{ "--pc-accent": SUN_CHARACTER.accent } as CSSProperties}>
        <div className="pc-sun-rays" aria-hidden />
        <div className="pc-sun-glow" aria-hidden />
        <div className="pc-sun-inner">
          <div className="pc-sun-visual">
            <img
              src={getShowcaseAvatarSrc(SUN_CHARACTER.planet, SUN_CHARACTER.gender)}
              alt={t(`planetCharName_${SUN_CHARACTER.planet}`)}
              loading="lazy"
              draggable={false}
            />
          </div>
          <div className="pc-sun-body">
            <h3 className="pc-sun-name">{t(`planetCharName_${SUN_CHARACTER.planet}`)}</h3>
            <p className="pc-sun-desc">{t(`planetCharDesc_${SUN_CHARACTER.planet}`)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
