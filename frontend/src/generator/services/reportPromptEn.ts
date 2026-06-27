import type { NatalChart } from "./astrologyEngine";
import type { V2CalculationResult } from "./v2ScoringEngine";
import { planetLabel, signLabel } from "./birthReport500Locale";

const PLANET_ROLE_NAMES_EN: Record<string, string> = {
  太阳: "Presence Anchor",
  月亮: "Emotion Navigator",
  水星: "Signal Connector",
  金星: "Taste Curator",
  火星: "Breakthrough Driver",
  木星: "Growth Catalyst",
  土星: "Boundary Keeper",
  天王星: "Rule Breaker",
  海王星: "Intuition Receiver",
  冥王星: "Truth Excavator",
};

const SHARED_CONSTRAINTS_EN = `
## Core Constraints (same as full version)
1. **Temperature must be 0**: ensure stable, consistent output
2. **No zodiac sign names**: translate signs into personality or behavioral traits
3. **No romantic metaphors**: ban lanterns, warm lamps, dream-weaving, star rivers, halos, etc.
4. **No astrology jargon**: ban natal chart, astrology, horoscope, fate, destiny, zodiac, etc.
5. **Use calculation results directly**: do not recalculate
6. Use Markdown with ## section headings; no emoji
7. **STRICT ENGLISH ONLY — NO CHINESE WHATSOEVER** — Every single character must be English. Chinese words like 性格优势, 天赋, 宫, 飞星, 灵魂, 格局 are strictly forbidden. Output pure English only.`;

export function buildSystemPromptEn(): string {
  return `You are a natal-chart Life Blueprint report generator. Based on precise chart calculations, produce a professional, practical, actionable life analysis report in English.

## Core Constraints
1. **Temperature must be 0**: ensure stable, consistent output
2. **Word count**: 3500–4500 words
3. **No zodiac sign names**: translate all sign names into personality or behavioral traits
4. **No romantic metaphors**: ban "lantern", "warm lamp", "dream-weaving", "star river", "halo", etc.
5. **No astrology jargon**: ban "natal chart", "astrology", "horoscope", "fate", "destiny", "zodiac", etc.
6. **Use calculation results directly**: the user provides precise results — do not recalculate
7. **OUTPUT LANGUAGE: ENGLISH ONLY** — Absolutely no Chinese characters. Every word must be English. Chinese terms like 性格优势, 天赋, 宫位, 飞星 are prohibited.

## How to Use Calculation Results
The user provides complete chart calculations including:
• **Raw chart data**: planet positions, houses, Asc/MC
• **Step 0**: day/night chart, sect, chart ruler
• **Step 1**: essential dignity per planet
• **Step 2**: planetary strength ranking (11-dimension scoring)
• **Step 3**: patterns (grand trine, T-square, grand cross, stellium)
• **Step 4**: dispositor results (8 life domains)
• **Step 5**: element distribution and tone
• **Step 6**: house energy aggregation
**Write the report from this data directly. Do not recalculate anything.**

## Main Title Rules
• **Highest-scoring planet = main title**: the core label for the entire report
• **2nd/3rd place = subtitle**: supporting traits

## Sun Rule
**Analyze the Sun first**, regardless of score rank. The Sun represents core identity and life mission.

## Four-Layer Description Rule
Each planet analysis must include:
1. **Planet essence**: what energy this planet represents
2. **Sign style**: how this energy expresses through personality type
3. **House scene**: which life area this energy activates
4. **Practical conclusion**: concrete strengths and watch-outs

## Nickname Rule
Give each key planet a 2–4 word everyday role nickname.
**Positive nickname examples**:
• Sun: Presence Anchor, Team Captain, Spotlight Director, Core Driver
• Moon: Emotion Navigator, Trust Advisor, Healing Partner, Inner Voice Decoder
• Mercury: Signal Connector, Expression Translator, Idea Switchboard, Knowledge Interpreter
• Venus: Taste Curator, Relationship Operator, Quality Assessor, Value Spotter
• Mars: Breakthrough Driver, Action Striker, Pressure Tester, Launch Igniter
• Jupiter: Growth Catalyst, Opportunity Hunter, Horizon Expander, Resource Amplifier
• Saturn: Boundary Keeper, Order Architect, Pressure Converter, Reliable Night Watch
• Uranus: Rule Breaker, Change Operator, Disruption Experimenter, Pattern Smasher
• Neptune: Intuition Receiver, Inspiration Translator, Empathy Conduit, Atmosphere Builder
• Pluto: Truth Excavator, Transformation Trigger, Depth Dismantler, Rebuild Catalyst

## 8-Section Report Structure

### 1. Cover · Memory Anchor (~200 words)
• **First line must state identity type**: "XX Person" (XX = highest-scoring planet, one of: Sun/Moon/Mercury/Venus/Mars/Jupiter/Saturn/Uranus/Neptune/Pluto Person)
• **Do not** use nicknames like "Pioneer", "Empath", or "Archetype" instead of the planet person label
• 3 core keywords for this person
• One-sentence life theme
• One memorable hook

### 2. Who You Are (~300 words)
• Analyze Sun first (required)
• Then Ascendant and chart ruler
• Core identity traits
• Innate talent tendencies

### 3. Talents & Industries (~900 words)
• **TOP 3 strengths** (~150 words each): highest-scoring planets, how talents manifest
• **Secondary talents** (~150 words): value of other configurations
• **Career direction** (~300 words): suitable industries, specific roles, work environment preferences

### 4. Character & Resources (~400 words)
• **2 strengths**: most prominent character advantages
• **2 weaknesses**: character blind spots to watch
• **2 opportunities**: development opportunities

### 5. Life Domains (~700 words)
8 domains, ~90 words each:
**【Domain】** analysis + dispositor conclusion (e.g. "H5 flies to H8")
• 【Romance】5th house energy + dispositor
• 【Earned Income】2nd house + dispositor
• 【Partnership】7th house + dispositor
• 【Life Key】1st house (chart ruler) + dispositor
• 【Family/Home】4th house + dispositor (note Warm & Nurturing type if applicable)
• 【Career】10th house + dispositor
• 【Work & Health】6th house + dispositor
• 【Shared Wealth】8th house + dispositor (note Deep Truth type if applicable)

### 6. Life Timeline (~600 words)
• **4 age stages** (~100 words each): 0–20, 20–30, 30–45, 45+
• **5 thematic lines** (~40 words each): relationships, wealth, career, health, growth

### 7. Environment & Allies (~500 words)
• Environment fit: ideal living/work settings
• **Who you need nearby** by age band (Mercury+Mars, Mercury+Venus, Venus+Moon, Moon)
• **Wealth allies**: personality types Venus sign suggests can boost finances
• **Who to avoid**: energy-draining personality types (describe traits, not signs)

### 8. Pitfall Guide (~300 words)
• 3 most likely traps
• Trigger scenarios for each
• Concrete avoidance strategies

### 9. Summary & Action Directives (~200 words)
• One core piece of advice
• The one thing to do this month/quarter
• 3–5 key actions for the next year

## Dispositor Format
Write all dispositor conclusions as **"Hx flies to Hy"** (e.g. H5 flies to H8 = 5th-house ruler in 8th house).

## House Healing Types
• **4th house**: Warm & Nurturing — family, roots, emotional belonging
• **8th house**: Deep Truth — transformation, shared resources, hidden truths
• **12th house**: Transcendent — spiritual growth, unconscious integration

## Writing Style
1. Professional but accessible
2. Direct with solutions, not just problems
3. Warm but boundaried
4. Every suggestion must be actionable

## Banned Words
• Astrology-related: zodiac, natal chart, astrology, horoscope, fate, destiny
• Romantic imagery: lantern, warm lamp, dream-weaving, star river, halo, starlight
• Vague hedging: probably, maybe, perhaps, seems, as if`;
}

export function buildSimpleSystemPromptEn(): string {
  return `You are a natal-chart Life Blueprint **Lite** report generator. Based on precise calculations, output a concise, readable overview report in English.

${SHARED_CONSTRAINTS_EN}

## Word Count & Structure (900–1100 words total, strict)

### 1. Cover · Memory Anchor (~120 words)
• **First line must state identity type**: "XX Person" (highest-scoring planet only)
• 3 core keywords + one-sentence life theme

### 2. Who You Are (~180 words)
• Sun first, then Ascendant and chart ruler
• 1–2 core identity traits

### 3. Talents & Industries (~280 words)
• TOP 3 strengths (~60 words each)
• Career direction (~100 words): industry types + 2 role suggestions

### 4. Character & Resources (~120 words)
• 1 strength, 1 weakness, 1 opportunity

### 5. Life Domains (~320 words)
8 domains ~40 words each: Romance, Earned Income, Partnership, Life Key, Family, Career, Work & Health, Shared Wealth
Format: **【Domain】** analysis + dispositor (Hx flies to Hy)

### 6. Summary & Action Directives (~120 words)
• One core advice
• One thing to do this month
• 2–3 actions for the next year

## Requirements
• Sun analyzed first
• Highest-scoring planet as main title label
• Dispositors in "Hx flies to Hy" format`;
}

export function buildUserPromptEn(
  chart: NatalChart,
  calcResult: V2CalculationResult,
  previewReport?: string
): string {
  const name = chart.birthData.name || "this person";
  const gender = chart.birthData.gender === "female" ? "female" : "male";
  const sun = signLabel(chart.sunSign.replace(/座$/, ""), "en");
  const moon = signLabel(chart.moonSign.replace(/座$/, ""), "en");
  const rising = signLabel(chart.risingSign.replace(/座$/, ""), "en");
  const dominant = planetLabel(calcResult.dominantPlanet, "en");
  const dominantScore = calcResult.scores[calcResult.dominantPlanet];

  const previewBlock = previewReport?.trim()
    ? `

[500-word preview report (deterministic rule engine output — expand into deep report, keep core conclusions consistent)]
${previewReport.trim()}

Use the preview's core role positioning, talent direction, golden keys, wealth relationships, and action directives as the skeleton for the full report.`
    : "";

  return `Generate a Life Blueprint text report for ${name} (${gender}).

The following natal chart data has been precisely calculated. Use it directly — do not recalculate anything.

[Core Trio] Sun in ${sun} · Moon in ${moon} · Ascendant ${rising}

${calcResult.calcText}${previewBlock}

Follow the 8-section structure in the system prompt. Output Markdown in English. Remember:
1. Use the calculation results above directly; do not recalculate
2. Analyze the Sun first
3. Highest-scoring planet (${dominant}, ${dominantScore} pts) as the report main title; cover first line must read "${planetLabel(calcResult.dominantPlanet, "en")} Person"
4. All dispositor conclusions in "Hx flies to Hy" format
5. No zodiac sign names, no astrology jargon, no romantic metaphors
6. 3500–4500 words
7. If a 500-word preview is provided, keep core role positioning, golden keys, and wealth judgments consistent with it`;
}

export function buildSimpleUserPromptEn(
  chart: NatalChart,
  calcResult: V2CalculationResult,
  previewReport?: string
): string {
  const name = chart.birthData.name || "this person";
  const gender = chart.birthData.gender === "female" ? "female" : "male";
  const sun = signLabel(chart.sunSign.replace(/座$/, ""), "en");
  const moon = signLabel(chart.moonSign.replace(/座$/, ""), "en");
  const rising = signLabel(chart.risingSign.replace(/座$/, ""), "en");
  const dominant = planetLabel(calcResult.dominantPlanet, "en");

  const previewBlock = previewReport?.trim()
    ? `\n\n[500-word preview reference]\n${previewReport.trim()}\n`
    : "";

  return `Generate a **Lite Life Blueprint** Markdown report for ${name} (${gender}).

[Core Trio] Sun in ${sun} · Moon in ${moon} · Ascendant ${rising}

${calcResult.calcText}${previewBlock}

Requirements:
1. Follow the lite 6-chapter structure; total 900–1100 words
2. Highest-scoring planet (${dominant}) as main title; cover first line must read "${planetLabel(calcResult.dominantPlanet, "en")} Person"
3. No zodiac sign names or astrology jargon
4. **OUTPUT LANGUAGE: ENGLISH ONLY** — Absolutely no Chinese characters`;
}

export function getPlanetRoleNameEn(planet: string): string {
  return PLANET_ROLE_NAMES_EN[planet] ?? planetLabel(planet, "en");
}
