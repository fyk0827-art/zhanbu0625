export type PlanetKey =
  | "太阳" | "月亮" | "水星" | "金星" | "火星"
  | "木星" | "土星" | "天王星" | "海王星" | "冥王星";

export type UserGender = "male" | "female";

export interface PlanetCharacterMeta {
  planet: PlanetKey;
  gender: UserGender;
  accent: string;
}

/** Nine planets in the grid; Sun is the footer hero. */
export const PLANET_CHARACTER_GRID: PlanetCharacterMeta[] = [
  { planet: "月亮", gender: "male", accent: "#b8c4d4" },
  { planet: "水星", gender: "male", accent: "#7b9acc" },
  { planet: "金星", gender: "female", accent: "#e8a0bf" },
  { planet: "火星", gender: "male", accent: "#e85d4d" },
  { planet: "木星", gender: "male", accent: "#d4a056" },
  { planet: "土星", gender: "male", accent: "#8b8bb0" },
  { planet: "天王星", gender: "male", accent: "#5bc0eb" },
  { planet: "海王星", gender: "female", accent: "#6b8fd4" },
  { planet: "冥王星", gender: "female", accent: "#7c5c9e" },
];

export const SUN_CHARACTER: PlanetCharacterMeta = {
  planet: "太阳",
  gender: "male",
  accent: "#e8b951",
};

export function getShowcaseAvatarSrc(planet: PlanetKey, gender: UserGender): string {
  return `/images/planet-avatars/${planet}-${gender === "female" ? "女" : "男"}.png`;
}
