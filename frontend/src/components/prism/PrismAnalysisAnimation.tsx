import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const STEP_KEYS = [
  "animConnecting",
  "animReading",
  "animCrossCheck",
  "animIdentify",
  "animGenerating",
  "animDone",
];

interface Props {
  charCount?: number;
}

export default function PrismAnalysisAnimation({ charCount = 0 }: Props) {
  const { t } = useTranslation();
  const [stepIdx, setStepIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timers = STEP_KEYS.map((_, i) =>
      setTimeout(() => {
        setVisible(false);
        setTimeout(() => {
          setStepIdx(i);
          setVisible(true);
        }, 300);
      }, i * 2000)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const stepKey = STEP_KEYS[stepIdx];

  return (
    <div className="prism-page text-center max-w-[400px] mx-auto">
      <div className="relative w-[180px] h-[180px] mx-auto mb-10">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="prism-analysis-ring" />
        ))}
        <div
          className="absolute top-1/2 left-1/2 w-3 h-3 -mt-1.5 -ml-1.5 rounded-full"
          style={{ background: "var(--prism-gold)", boxShadow: "0 0 30px rgba(232,185,81,0.4)" }}
        />
      </div>
      <p
        className="prism-font-serif text-base leading-relaxed transition-opacity duration-300"
        style={{ color: "var(--prism-cream)", opacity: visible ? 1 : 0 }}
      >
        {t(stepKey + "Text")}
      </p>
      <p className="text-xs mt-3 tracking-widest" style={{ color: "rgba(232,185,81,0.3)" }}>
        {t(stepKey + "Sub")}
      </p>
      {charCount > 0 && (
        <p
          className="text-xs mt-4 px-4 py-1.5 rounded-full inline-block"
          style={{ background: "rgba(232,185,81,0.08)", color: "rgba(232,185,81,0.55)" }}
        >
          {t("receivedChars", { count: charCount })}
        </p>
      )}
    </div>
  );
}
