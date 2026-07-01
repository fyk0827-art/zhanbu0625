import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import PrismBackground from "@/components/prism/PrismBackground";
import PrismBrandSymbol from "@/components/prism/PrismBrandSymbol";
import { setGlobalReportType } from "../services/reportSession";
import { fetchPartnerOrder, setPrepaidOrderId } from "../services/partnerApi";
import { trackEvent } from "../services/tracking";
import { type GeoLocation } from "../services/locationApi";
import BirthDatePicker from "../components/BirthDatePicker";
import LocationPicker from "../components/LocationPicker";
import PlanetCharactersSection from "@/components/PlanetCharactersSection";
import "@/styles/prism.css";

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [prepaidBanner, setPrepaidBanner] = useState<string | null>(null);
  const [prepaidError, setPrepaidError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(() => typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("12:00");
  const [selectedLocation, setSelectedLocation] = useState<GeoLocation | null>(null);
  const [gender, setGender] = useState<"female" | "male">("female");
  const [customLat, setCustomLat] = useState("");
  const [customLng, setCustomLng] = useState("");
  const [customTz, setCustomTz] = useState("8");
  const [useCustomCoords, setUseCustomCoords] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const orderId = searchParams.get("orderId");
    if (!orderId) return;
    setPrepaidOrderId(orderId);
    fetchPartnerOrder(orderId)
      .then((order) => {
        if (order.prepaid && order.reportPending) {
          setPrepaidBanner(t("genPrepaidBanner", { orderId: order.orderId }));
        } else if (order.prepaid) {
          setPrepaidBanner(t("genPrepaidContinue", { orderId: order.orderId }));
        }
      })
      .catch((err) => {
        setPrepaidError(err instanceof Error ? err.message : t("genOrderVerifyFailed"));
      });
  }, [searchParams, t]);

  const selectLocation = useCallback((loc: GeoLocation | null) => {
    setSelectedLocation(loc);
    if (loc) { setFieldErrors((p) => ({ ...p, city: false })); trackEvent("Place", true); }
  }, []);

  const handleSubmit = useCallback(() => {
    const errors: Record<string, boolean> = {};
    if (!birthDate) errors.birthDate = true;
    if (!useCustomCoords && !selectedLocation) errors.city = true;
    if (useCustomCoords && (!customLat || !customLng)) errors.coords = true;
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    trackEvent("next", true);
    trackEvent("chart_calculate", true);

    let lat: number, lng: number, tz: number;
    if (useCustomCoords) {
      lat = parseFloat(customLat) || 39.9;
      lng = parseFloat(customLng) || 116.4;
      tz = parseFloat(customTz) || 8;
    } else {
      lat = selectedLocation!.latitude;
      lng = selectedLocation!.longitude;
      tz = selectedLocation!.timezone;
    }
    const [year, month, day] = birthDate.split("-").map(Number);
    const [hour, minute] = birthTime.split(":").map(Number);
    setGlobalReportType("full");

    const birthData = { year, month, day, hour, minute, latitude: lat, longitude: lng, timezone: tz, gender, name: name || undefined };
    sessionStorage.setItem("taiji_birth_data", JSON.stringify(birthData));
    localStorage.setItem("userEmail", email);
    navigate(`/generator/generating?reportType=${encodeURIComponent("full")}`);
  }, [birthDate, birthTime, selectedLocation, gender, name, useCustomCoords, customLat, customLng, customTz, email, navigate]);

  return (
    <div className="prism-root min-h-screen relative overflow-hidden">
      <PrismBackground />
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        <div className="w-full max-w-[420px] text-center">
          <div className="mx-auto mb-5 prism-fade-in prism-fade-d1">
            <PrismBrandSymbol size={48} />
          </div>
          <div className="prism-font-display text-sm font-semibold tracking-[8px] uppercase mb-1" style={{ color: "var(--prism-gold)" }}>
            PRISM
          </div>
          <div className="prism-font-serif text-[11px] tracking-[4px] mb-6" style={{ color: "rgba(232,185,81,0.45)" }}>
            {t("lifeScriptBrand").split("").join(" ")}
          </div>
          <h1 className="prism-font-serif text-[22px] font-bold leading-relaxed mb-2" style={{ color: "var(--prism-cream)" }}>
            {t("genSoulRevealed")}<span style={{ color: "var(--prism-gold)" }}>{t("genSoulOutline")}</span>
          </h1>
          <p className="text-[13px] leading-loose" style={{ color: "rgba(250,246,240,0.4)" }}>
            {t("genBirthMoment")}<br />{t("genBirthMoment2")}
          </p>
        </div>

        {(prepaidBanner || prepaidError) && (
          <div
            className="mb-4 rounded-xl px-4 py-3 text-sm text-center"
            style={{
              background: prepaidError ? "rgba(217,79,79,0.1)" : "rgba(232,185,81,0.08)",
              border: prepaidError ? "1px solid rgba(217,79,79,0.3)" : "1px solid rgba(232,185,81,0.2)",
              color: prepaidError ? "#f87171" : "var(--prism-cream)",
            }}
          >
            {prepaidError || prepaidBanner}
          </div>
        )}

        <div className="prism-birth-form w-full max-w-[420px]">
          <div className="mb-5 text-left">
            <div className="flex items-baseline gap-2 mb-2 flex-wrap">
              <span className="prism-font-serif text-[13px] font-semibold tracking-wide" style={{ color: "rgba(250,246,240,0.7)" }}>
                {t("genYourName")}
              </span>
              <span className="text-[11px] italic" style={{ color: "rgba(232,185,81,0.35)" }}>{t("genOptional")}</span>
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => { if (name.trim()) trackEvent("name", true); }}
              placeholder={t("genNamePlaceholder")}
              className="prism-input"
            />
          </div>

          <div className="mb-5 text-left">
            <div className="flex items-baseline gap-2 mb-2 flex-wrap">
              <span className="prism-font-serif text-[13px] font-semibold tracking-wide" style={{ color: "rgba(250,246,240,0.7)" }}>
                {t("emailTitle")}
              </span>
              <span className="text-[11px] italic" style={{ color: "rgba(232,185,81,0.35)" }}>{t("emailHelpText")}</span>
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); localStorage.setItem("userEmail", e.target.value); }}
              placeholder={t("emailPlaceholder")}
              className="prism-input"
            />
          </div>

          <div className="mb-5 text-left">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="prism-font-serif text-[13px] font-semibold tracking-wide" style={{ color: "rgba(250,246,240,0.7)" }}>
                {t("genYouAre")}
              </span>
              <span className="text-[11px] italic" style={{ color: "rgba(232,185,81,0.35)" }}>{t("genGenderHint")}</span>
            </div>
            <div className="flex gap-3">
              {(["female", "male"] as const).map((g) => (
                <div key={g} className="prism-gender-opt flex-1 relative">
                  <input type="radio" name="gender" id={`g-${g}`} value={g} checked={gender === g} onChange={() => setGender(g)} />
                  <label htmlFor={`g-${g}`}>{g === "female" ? t("genFemale") : t("genMale")}</label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 mb-5">
            <div className="flex-1 text-left">
              <div className="mb-2">
                <span className="prism-font-serif text-[13px] font-semibold" style={{ color: "rgba(250,246,240,0.7)" }}>
                  {t("genBirthDate")} <span style={{ color: "var(--prism-gold)" }}>*</span>
                </span>
              </div>
              <BirthDatePicker
                value={birthDate}
                onChange={(v) => { setBirthDate(v); setFieldErrors((p) => ({ ...p, birthDate: false })); trackEvent("birth", true); }}
                className="prism-input"
                error={fieldErrors.birthDate}
                placeholder={t("genBirthDatePlaceholder")}
              />
            </div>
            <div className="flex-1 text-left">
              <div className="mb-2">
                <span className="prism-font-serif text-[13px] font-semibold" style={{ color: "rgba(250,246,240,0.7)" }}>
                  {t("genBirthTime")} <span style={{ color: "var(--prism-gold)" }}>*</span>
                </span>
              </div>
              <input
                type="time"
                value={birthTime}
                onChange={(e) => setBirthTime(e.target.value)}
                className="prism-input"
              />
              <p className="text-[10px] mt-1 italic" style={{ color: "rgba(232,185,81,0.35)" }}>{t("genBirthTimeHint")}</p>
            </div>
          </div>

          <div className="mb-2 text-left">
            <div className="flex items-baseline gap-2 mb-2 flex-wrap">
              <span className="prism-font-serif text-[13px] font-semibold" style={{ color: "rgba(250,246,240,0.7)" }}>
                {t("genBirthPlace")} <span style={{ color: "var(--prism-gold)" }}>*</span>
              </span>
            </div>
            {useCustomCoords ? (
              <div className="flex gap-2 items-start">
                <div className="flex-1 space-y-2">
                  <input type="number" step="any" placeholder="Latitude" value={customLat} onChange={(e) => setCustomLat(e.target.value)} className={`prism-input ${fieldErrors.coords ? "error" : ""}`} />
                  <input type="number" step="any" placeholder="Longitude" value={customLng} onChange={(e) => setCustomLng(e.target.value)} className={`prism-input ${fieldErrors.coords ? "error" : ""}`} />
                </div>
                <div className="w-20 shrink-0">
                  <input type="number" step="any" placeholder="Timezone" value={customTz} onChange={(e) => setCustomTz(e.target.value)} className="prism-input" />
                </div>
              </div>
            ) : (
              <LocationPicker value={selectedLocation} onChange={selectLocation} />
            )}
            <button type="button" onClick={() => setUseCustomCoords(!useCustomCoords)} className="text-[11px] mt-2 hover:underline" style={{ color: "rgba(232,185,81,0.6)" }}>
              {useCustomCoords ? t("genUseCityList") : t("genManualCoords")}
            </button>
            {fieldErrors.city && <p className="text-xs mt-1" style={{ color: "var(--prism-danger)" }}>{t("genLocationRequired", "Please select a city")}</p>}
          </div>

          <button type="button" className="prism-btn-gold w-full mt-7" onClick={handleSubmit}>
            {t("genConnectChart")}
          </button>
        </div>

        <p className="mt-6 text-[10px] tracking-wider" style={{ color: "rgba(232,185,81,0.25)" }}>
          Swiss Ephemeris · High-precision astronomy
        </p>

        <PlanetCharactersSection />
      </div>
    </div>
  );
}
