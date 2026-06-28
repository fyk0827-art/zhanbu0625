package com.lifeblueprint.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ReportGenerationService {

    private final DeepSeekService deepSeekService;
    private final com.qacollector.service.ReportPromptService reportPromptService;

    public ReportGenerationService(DeepSeekService deepSeekService,
                                    com.qacollector.service.ReportPromptService reportPromptService) {
        this.deepSeekService = deepSeekService;
        this.reportPromptService = reportPromptService;
    }

    public String generateFromChart(String reportId, JsonNode chartJson, String displayName, String previewText) {
        // 1. Parse chart data
        ChartData chart = new ChartData(chartJson);

        // 2. V2 Calculations
        Map<String, Integer> scores = calculateScores(chart);
        String dominantPlanet = findDominantPlanet(scores);
        String calcText = buildCalcText(chart, scores, dominantPlanet);

        // 3. Build prompts
        String systemPrompt = buildSystemPromptEn();
        String userPrompt = buildUserPromptEn(chart, scores, dominantPlanet, calcText, displayName, previewText);

        // 4. Call DeepSeek
        String aiText = deepSeekService.generate(systemPrompt, userPrompt);
        return aiText;
    }

    // ===== Chart Data Extractor =====
    static class ChartData {
        JsonNode root;
        List<JsonNode> planets;
        JsonNode angles;
        JsonNode houses;
        JsonNode birthData;

        // Derived
        String ascSign;
        String sunSign;
        String moonSign;
        boolean isNightChart;

        ChartData(JsonNode root) {
            this.root = root;
            this.planets = new ArrayList<>();
            JsonNode p = root.get("planets");
            if (p instanceof ArrayNode) p.forEach(this.planets::add);
            this.angles = root.get("angles");
            this.houses = root.get("houses");
            this.birthData = root.get("birthData");
            this.ascSign = getText(angles, "ascendantSign", "");
            this.sunSign = findSign("太阳");
            this.moonSign = findSign("月亮");
            this.isNightChart = computeIsNight();
        }

        String findSign(String planetName) {
            for (JsonNode p : planets) {
                if (planetName.equals(getText(p, "name", ""))) {
                    return getText(p, "sign", "");
                }
            }
            return "";
        }

        JsonNode findPlanet(String name) {
            for (JsonNode p : planets) {
                if (name.equals(getText(p, "name", ""))) return p;
            }
            return null;
        }

        double getLongitude(String planetName) {
            JsonNode p = findPlanet(planetName);
            return p != null ? p.get("longitude").asDouble() : 0;
        }

        int getHouse(String planetName) {
            JsonNode p = findPlanet(planetName);
            return p != null ? p.get("house").asInt() : 0;
        }

        boolean computeIsNight() {
            JsonNode sun = findPlanet("太阳");
            if (sun == null) return false;
            double sunLon = sun.get("longitude").asDouble();
            double ascLon = angles != null ? angles.get("ascendant").asDouble() : 0;
            double mcLon = angles != null ? angles.get("mc").asDouble() : 0;
            boolean aboveHorizon = isAboveHorizon(sunLon, ascLon, mcLon);
            return !aboveHorizon;
        }
    }

    static boolean isAboveHorizon(double planetLon, double ascLon, double mcLon) {
        double icLon = (ascLon + 180) % 360;
        if (ascLon < mcLon) {
            return planetLon >= mcLon || planetLon < icLon;
        } else {
            return planetLon >= mcLon && planetLon < icLon;
        }
    }

    // ===== Constants =====
    static final List<String> PLANET_ORDER = List.of("太阳", "月亮", "水星", "金星", "火星", "木星", "土星", "天王星", "海王星", "冥王星");

    static final Map<String, Integer> PLANET_BASE = Map.of(
        "太阳", 65, "月亮", 61, "金星", 57, "水星", 53,
        "木星", 51, "土星", 50, "火星", 47, "天王星", 43,
        "海王星", 42, "冥王星", 41
    );

    static String getText(JsonNode node, String field, String def) {
        JsonNode v = node != null ? node.get(field) : null;
        return v != null ? v.asText() : def;
    }

    // ===== V2 Score Calculations =====
    static Map<String, Integer> calculateScores(ChartData chart) {
        Map<String, Integer> scores = new LinkedHashMap<>();
        for (String planet : PLANET_ORDER) {
            JsonNode p = chart.findPlanet(planet);
            if (p == null) { scores.put(planet, 0); continue; }
            int score = PLANET_BASE.getOrDefault(planet, 50);

            // Sign dignity bonus
            String sign = getText(p, "sign", "");
            score += getDignityBonus(planet, sign);

            // House type bonus
            int house = p.get("house").asInt();
            score += getHouseBonus(house);

            // Angular house bonus
            if (house == 1 || house == 4 || house == 7 || house == 10) score += 8;

            // Conjunct angles (simplified: 0/180 degrees)
            // Skip full aspect calculation for now

            scores.put(planet, Math.max(0, score));
        }
        return scores;
    }

    static int getDignityBonus(String planet, String sign) {
        // Simplified dignity calculation
        Map<String, Map<String, List<String>>> table = buildDignityTable();
        Map<String, List<String>> entry = table.get(planet);
        if (entry == null) return 0;
        if (entry.get("入庙").contains(sign)) return 12;
        if (entry.get("入旺").contains(sign)) return 6;
        if (entry.get("失势").contains(sign)) return -6;
        if (entry.get("落陷").contains(sign)) return -12;
        return 0;
    }

    static Map<String, Map<String, List<String>>> buildDignityTable() {
        Map<String, Map<String, List<String>>> t = new HashMap<>();
        t.put("太阳", Map.of("入庙", List.of("狮子座"), "入旺", List.of("白羊座"), "失势", List.of("天秤座"), "落陷", List.of("水瓶座")));
        t.put("月亮", Map.of("入庙", List.of("巨蟹座"), "入旺", List.of("金牛座"), "失势", List.of("天蝎座"), "落陷", List.of("摩羯座")));
        t.put("水星", Map.of("入庙", List.of("双子座", "处女座"), "入旺", List.of(), "失势", List.of(), "落陷", List.of("射手座", "双鱼座")));
        t.put("金星", Map.of("入庙", List.of("天秤座", "金牛座"), "入旺", List.of("双鱼座"), "失势", List.of("白羊座"), "落陷", List.of("天蝎座", "处女座")));
        t.put("火星", Map.of("入庙", List.of("白羊座", "天蝎座"), "入旺", List.of("摩羯座"), "失势", List.of("巨蟹座"), "落陷", List.of("天秤座", "金牛座")));
        t.put("木星", Map.of("入庙", List.of("射手座", "双鱼座"), "入旺", List.of("巨蟹座"), "失势", List.of("摩羯座"), "落陷", List.of("双子座", "处女座")));
        t.put("土星", Map.of("入庙", List.of("摩羯座", "水瓶座"), "入旺", List.of("天秤座"), "失势", List.of("白羊座"), "落陷", List.of("巨蟹座", "狮子座")));
        t.put("天王星", Map.of("入庙", List.of("水瓶座"), "入旺", List.of(), "失势", List.of(), "落陷", List.of("狮子座")));
        t.put("海王星", Map.of("入庙", List.of("双鱼座"), "入旺", List.of(), "失势", List.of(), "落陷", List.of("处女座")));
        t.put("冥王星", Map.of("入庙", List.of("天蝎座"), "入旺", List.of(), "失势", List.of(), "落陷", List.of("金牛座")));
        return t;
    }

    static int getHouseBonus(int house) {
        if (house == 1 || house == 10) return 8;
        if (house == 7 || house == 4) return 6;
        if (house == 11 || house == 5 || house == 9) return 4;
        if (house == 2 || house == 6 || house == 8) return 2;
        if (house == 3 || house == 12) return 0;
        return 0;
    }

    static String findDominantPlanet(Map<String, Integer> scores) {
        return scores.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .map(Map.Entry::getKey)
            .orElse("太阳");
    }

    // ===== Format calcText (used inside user prompt) =====
    static String buildCalcText(ChartData chart, Map<String, Integer> scores, String dominant) {
        StringBuilder sb = new StringBuilder();
        sb.append("[Planet Energies]\n");
        List<String> sorted = scores.entrySet().stream()
            .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
            .map(e -> "· " + e.getKey() + ": " + e.getValue() + " pts")
            .collect(Collectors.toList());
        for (String s : sorted) sb.append(s).append("\n");

        sb.append("\n[Dignities]\n");
        for (String planet : PLANET_ORDER) {
            JsonNode p = chart.findPlanet(planet);
            if (p == null) continue;
            String sign = getText(p, "sign", "");
            int bonus = getDignityBonus(planet, sign);
            String status = bonus >= 12 ? "Ruling" : bonus >= 6 ? "Exalted" : bonus <= -12 ? "Fallen" : bonus <= -6 ? "Detriment" : "Neutral";
            sb.append("· ").append(planet).append(" in ").append(sign.replace("座", "")).append(": ").append(status).append("\n");
        }

        sb.append("\n[House Placements]\n");
        for (String planet : PLANET_ORDER) {
            int h = chart.getHouse(planet);
            if (h > 0) {
                sb.append("· ").append(planet).append(": House ").append(h).append("\n");
            }
        }

        sb.append("\n[Core Trio] Sun in ").append(chart.sunSign.replace("座", ""))
          .append(" · Moon in ").append(chart.moonSign.replace("座", ""))
          .append(" · Ascendant ").append(chart.ascSign.replace("座", ""))
          .append("\n");

        sb.append("\n[Dominant Planet] ").append(dominant)
          .append(" (").append(scores.getOrDefault(dominant, 0)).append(" pts)\n");

        return sb.toString();
    }

    // ===== Prompt Builders =====
    static String buildSystemPromptEn() {
        return "You are a natal-chart Life Blueprint report generator. Based on precise chart calculations, "
            + "produce a professional, practical, actionable life analysis report in English.\n\n"
            + "## Core Constraints\n"
            + "1. **Temperature must be 0**: ensure stable, consistent output\n"
            + "2. **Word count**: 3500–4500 words\n"
            + "3. **No zodiac sign names**: translate all sign names into personality or behavioral traits\n"
            + "4. **No romantic metaphors**: ban \"lantern\", \"warm lamp\", \"dream-weaving\", \"star river\", \"halo\", etc.\n"
            + "5. **No astrology jargon**: ban \"natal chart\", \"astrology\", \"horoscope\", \"fate\", \"destiny\", \"zodiac\", etc.\n"
            + "6. **Use calculation results directly**: the user provides precise results — do not recalculate\n"
            + "7. **OUTPUT LANGUAGE: ENGLISH ONLY** — Absolutely no Chinese characters.\n\n"
            + "## Main Title Rules\n"
            + "• **Highest-scoring planet = main title**: the core label for the entire report\n"
            + "• **2nd/3rd place = subtitle**: supporting traits\n\n"
            + "## Sun Rule\n"
            + "**Analyze the Sun first**, regardless of score rank.\n\n"
            + "## 8-Section Report Structure:\n"
            + "1. Cover (~200 words)\n"
            + "2. Who You Are (~300 words)\n"
            + "3. Talents & Industries (~900 words)\n"
            + "4. Character & Resources (~400 words)\n"
            + "5. Life Domains (~700 words)\n"
            + "6. Life Timeline (~600 words)\n"
            + "7. Environment & Allies (~500 words)\n"
            + "8. Pitfall Guide (~300 words)\n"
            + "9. Summary & Action Directives (~200 words)\n\n"
            + "## Writing Style\n"
            + "1. Professional but accessible\n"
            + "2. Direct with solutions, not just problems\n"
            + "3. Use second person \"you\" throughout\n"
            + "4. 3500–4500 words total\n"
            + "5. Output in Markdown";
    }

    static String buildUserPromptEn(ChartData chart, Map<String, Integer> scores, String dominantPlanet,
                                     String calcText, String displayName, String previewText) {
        String name = displayName != null && !displayName.isBlank() ? displayName : "this person";
        String gender = chart.birthData != null ? getText(chart.birthData, "gender", "male") : "male";

        String sunEn = chart.sunSign.replace("座", "");
        String moonEn = chart.moonSign.replace("座", "");
        String ascEn = chart.ascSign.replace("座", "");

        String previewBlock = (previewText != null && !previewText.isBlank())
            ? "\n\n[500-word preview report]\n" + previewText + "\n"
            : "";

        return "Generate a Life Blueprint text report for " + name + " (" + gender + ").\n\n"
            + "The following natal chart data has been precisely calculated. Use it directly — do not recalculate anything.\n\n"
            + "[Core Trio] Sun in " + sunEn + " · Moon in " + moonEn + " · Ascendant " + ascEn + "\n\n"
            + calcText + previewText + "\n\n"
            + "Follow the 8-section structure in the system prompt. Output Markdown in English. Remember:\n"
            + "1. Use the calculation results above directly; do not recalculate\n"
            + "2. Analyze the Sun first\n"
            + "3. Highest-scoring planet (" + dominantPlanet + ", " + scores.getOrDefault(dominantPlanet, 0) + " pts) as the report main title\n"
            + "4. All dispositor conclusions in \"Hx flies to Hy\" format\n"
            + "5. No zodiac sign names, no astrology jargon, no romantic metaphors\n"
            + "6. 3500–4500 words";
    }
}
