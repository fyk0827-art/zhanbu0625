import type { NatalChart } from "./astrologyEngine";
import type { ReportTypeId } from "../types/reportTypes";
import { getSettings, streamChat } from "./volcEngineApi";
import { buildPromptsForReportType, resolveSystemPrompt } from "./reportPrompt";
import { fetchReportPrompts } from "./reportPromptApi";
import { runV2Calculations } from "./v2ScoringEngine";
import { generateBirthReport500 } from "./birthReport500";
import type { ReportLocale } from "./birthReport500Locale";
import { trackEvent } from "./tracking";

const AI_REPORT_LOCALE: ReportLocale = "en";

export async function generateReportText(
  chart: NatalChart,
  reportType: ReportTypeId,
  onChunk?: (text: string) => void,
  previewReport?: string,
  _lang?: string
): Promise<string> {
  const s = getSettings();
  if (!s.apiKey) throw new Error("API Key not configured. Please go to Settings to configure.");

  const calcResult = runV2Calculations(chart, AI_REPORT_LOCALE);
  console.log("[V2.8] Calculated scores:", calcResult.scores);
  console.log("[V2.8] Dominant planet:", calcResult.dominantPlanet);

  const previewEn = previewReport?.trim()
    ? generateBirthReport500(chart, AI_REPORT_LOCALE)
    : undefined;
  const prompts = buildPromptsForReportType(reportType, chart, calcResult, previewEn, AI_REPORT_LOCALE);
  const dbPrompts = await fetchReportPrompts();
  const sp = resolveSystemPrompt(reportType, dbPrompts.prompts, AI_REPORT_LOCALE);
  const up = prompts.user;
  let received = "";
  let retries = 0;
  const maxRetries = 2;

  trackEvent("report_generating", true);

  while (retries <= maxRetries) {
    try {
      for await (const chunk of streamChat(s.apiKey, {
        model: s.model || "deepseek-v4-pro",
        messages: [
          { role: "system" as const, content: sp },
          { role: "user" as const, content: up },
        ],
        max_tokens: Math.max(s.maxTokens || 8192, 16384),
        temperature: s.temperature ?? 0.1,
      })) {
        received += chunk;
        onChunk?.(received);
      }
      return received;
    } catch (e: any) {
      retries++;
      if (retries > maxRetries || !e.message?.includes("Network") || received.length > 500) {
        if (received.length > 0) {
          // Return partial content if we have some
          return received;
        }
        throw e;
      }
      console.warn(`[reportGenerator] Retry ${retries}/${maxRetries} after error:`, e.message);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  const cleaned = stripChinese(received);
  console.log('[reportGenerator] stripChinese: before', received.length, 'after', cleaned.length, 'removed', received.length - cleaned.length, 'chars');
  if (cleaned !== received) {
    console.log('[reportGenerator] stripChinese sample changed:', received.substring(0,100), '->', cleaned.substring(0,100));
  }
  return cleaned;
}

export function stripChinese(text: string): string {
  if (!text) return text;
  const replacements: [string | RegExp, string][] = [
    [/# 性格优势[\s\S]*?(?=#|$)/g, '## Strengths\n'],
    [/# 性格劣势[\s\S]*?(?=#|$)/g, '## Weaknesses\n'],
    [/# 机会与资源[\s\S]*?(?=#|$)/g, '## Opportunities & Resources\n'],
    [/# 环境与贵人[\s\S]*?(?=#|$)/g, '## Environment & Allies\n'],
    [/# 避坑指南[\s\S]*?(?=#|$)/g, '## Pitfall Guide\n'],
    [/# 避坑要点[\s\S]*?(?=#|$)/g, '## Key Pitfalls\n'],
    [/# 总结与行动指令[\s\S]*?(?=#|$)/g, '## Summary & Action Plan\n'],
    [/\*\*性格优势\*\*/g, '**Strengths**'],
    [/\*\*性格劣势\*\*/g, '**Weaknesses**'],
    [/\*\*机会与资源\*\*/g, '**Opportunities & Resources**'],
    [/\*\*环境与贵人\*\*/g, '**Environment & Allies**'],
    [/\*\*避坑指南\*\*/g, '**Pitfall Guide**'],
    [/\*\*避坑要点\*\*/g, '**Key Pitfalls**'],
    [/\*\*总结与行动指令\*\*/g, '**Summary & Action Plan**'],
    [/建议[：:]/g, '\nAdvice: '],
    [/洞察/g, '\nInsight: '],
    [/性格优势/g, 'Strengths'],
    [/性格劣势/g, 'Weaknesses'],
    [/环境与贵人/g, 'Environment & Allies'],
    [/避坑要点/g, 'Key Pitfalls'],
    [/出生图人生蓝图报告/g, 'Life Blueprint Report'],
    [/仅供个人参考/g, 'For personal reference only'],
  ];
  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }
  return text;
}
