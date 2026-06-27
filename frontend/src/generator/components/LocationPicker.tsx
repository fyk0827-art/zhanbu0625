import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, Search } from "lucide-react";
import {
  fetchCountries,
  fetchProvinces,
  fetchCities,
  searchLocations,
  type GeoLocation,
} from "../services/locationApi";

interface Props {
  value: GeoLocation | null;
  onChange: (loc: GeoLocation | null) => void;
  error?: boolean;
  placeholder?: string;
  className?: string;
}

const CHINA_PROVINCE_ORDER = [
  "直辖市", "广东", "江苏", "浙江", "山东", "河南", "四川", "湖北", "湖南",
  "河北", "福建", "安徽", "辽宁", "陕西", "黑龙江", "吉林", "云南", "贵州",
  "江西", "广西", "山西", "甘肃", "内蒙古", "新疆", "海南", "宁夏",
  "青海", "西藏", "台湾", "香港", "澳门", "特别行政区",
];

function sortProvinces(country: string, provinces: string[]): string[] {
  if (country !== "中国") return provinces;
  const order = new Map(CHINA_PROVINCE_ORDER.map((p, i) => [p, i]));
  return [...provinces].sort((a, b) => {
    const ia = order.get(a) ?? 999;
    const ib = order.get(b) ?? 999;
    if (ia !== ib) return ia - ib;
    return a.localeCompare(b, "zh-CN");
  });
}

function formatLocationLabel(loc: GeoLocation): string {
  if (loc.label) return loc.label;
  if (loc.country === "中国") {
    return [loc.province, loc.city].filter(Boolean).join(" · ");
  }
  return [loc.country, loc.province, loc.city].filter(Boolean).join(" · ");
}

function MenuColumn({
  items,
  activeKey,
  onSelect,
  loading,
  emptyText,
  loadingText,
}: {
  items: { key: string; label: string }[];
  activeKey?: string | null;
  onSelect: (key: string) => void;
  loading?: boolean;
  emptyText: string;
  loadingText: string;
}) {
  return (
    <div className="loc-cascader-col">
      {loading ? (
        <div className="loc-cascader-empty">{loadingText}</div>
      ) : items.length === 0 ? (
        <div className="loc-cascader-empty">{emptyText}</div>
      ) : (
        items.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`loc-cascader-opt${activeKey === item.key ? " active" : ""}`}
            onClick={() => onSelect(item.key)}
          >
            <span>{item.label}</span>
            <ChevronRight className="loc-cascader-arrow" />
          </button>
        ))
      )}
    </div>
  );
}

export default function LocationPicker({
  value,
  onChange,
  error = false,
  placeholder,
  className = "prism-input",
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<GeoLocation[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const [countries, setCountries] = useState<string[]>([]);
  const [provinces, setProvinces] = useState<string[]>([]);
  const [cities, setCities] = useState<GeoLocation[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayValue = value ? formatLocationLabel(value) : "";
  const isSearching = search.trim().length >= 1;
  const showProvincePanel = !!selectedCountry && provinces.length > 0;
  const showCityPanel =
    !!selectedCountry && (provinces.length === 0 || !!selectedProvince);

  const resetBrowse = useCallback(() => {
    setSelectedCountry(null);
    setSelectedProvince(null);
    setProvinces([]);
    setCities([]);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!open || isSearching) return;
    resetBrowse();
    setLoading(true);
    fetchCountries()
      .then((list) => setCountries([...list].sort((a, b) => {
        if (a === "United States") return -1;
        if (b === "United States") return 1;
        return a.localeCompare(b, "en");
      })))
      .catch(() => setCountries([]))
      .finally(() => setLoading(false));
  }, [open, isSearching, resetBrowse]);

  useEffect(() => {
    if (!open || !selectedCountry || isSearching) return;
    setLoading(true);
    fetchProvinces(selectedCountry)
      .then((list) => setProvinces(sortProvinces(selectedCountry, list)))
      .catch(() => setProvinces([]))
      .finally(() => setLoading(false));
  }, [open, selectedCountry, isSearching]);

  useEffect(() => {
    if (!open || !selectedCountry || isSearching) return;
    if (provinces.length > 0 && !selectedProvince) {
      setCities([]);
      return;
    }
    setLoading(true);
    fetchCities(selectedCountry, selectedProvince ?? undefined)
      .then(setCities)
      .catch(() => setCities([]))
      .finally(() => setLoading(false));
  }, [open, selectedCountry, selectedProvince, isSearching, provinces.length]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!isSearching) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    searchTimerRef.current = setTimeout(() => {
      searchLocations(search.trim(), 30)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearchLoading(false));
    }, 280);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search, isSearching]);

  const handleSelect = useCallback((loc: GeoLocation) => {
    onChange(loc);
    setOpen(false);
    setSearch("");
  }, [onChange]);

  const handleCountrySelect = (country: string) => {
    setSelectedCountry(country);
    setSelectedProvince(null);
    setCities([]);
  };

  const handleProvinceSelect = (province: string) => {
    setSelectedProvince(province);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={open ? search : displayValue}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
            if (value) onChange(null);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder || t("searchPlaceholder")}
          autoComplete="off"
          className={`${className} pr-10${error ? " error" : ""}`}
          style={{ paddingRight: 40 }}
        />
        <Search
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: "rgba(232,185,81,0.25)" }}
        />
      </div>

      {open && (
        <div className="loc-cascader-dropdown mt-1">
          {isSearching ? (
            searchLoading ? (
              <div className="loc-cascader-empty">{t("searching")}</div>
            ) : searchResults.length > 0 ? (
              searchResults.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  className="prism-city-opt w-full text-left"
                  onClick={() => handleSelect(loc)}
                >
                  <span>{loc.city}</span>
                  <span className="text-[11px] ml-2" style={{ color: "rgba(250,246,240,0.25)" }}>
                    {loc.country === "中国"
                      ? [loc.province, loc.city].filter(Boolean).join(" · ")
                      : [loc.country, loc.province].filter(Boolean).join(" · ")}
                  </span>
                </button>
              ))
            ) : (
              <div className="loc-cascader-empty">{t("noMatches")}</div>
            )
          ) : loading && countries.length === 0 ? (
            <div className="loc-cascader-empty">{t("loadingAddresses")}</div>
          ) : (
            <div className="loc-cascader-menus">
              <MenuColumn
                items={countries.map((c) => ({ key: c, label: c }))}
                activeKey={selectedCountry}
                onSelect={handleCountrySelect}
                emptyText={t("noData")}
                loadingText={t("loading")}
              />
              {showProvincePanel && (
                <MenuColumn
                  items={provinces.map((p) => ({ key: p, label: p }))}
                  activeKey={selectedProvince}
                  onSelect={handleProvinceSelect}
                  loading={loading && provinces.length === 0}
                  emptyText={t("noData")}
                  loadingText={t("loading")}
                />
              )}
              {showCityPanel && (
                <div className="loc-cascader-col">
                  {loading && cities.length === 0 ? (
                    <div className="loc-cascader-empty">{t("loading")}</div>
                  ) : cities.length === 0 ? (
                    <div className="loc-cascader-empty">{t("noData")}</div>
                  ) : (
                    cities.map((loc) => (
                      <button
                        key={loc.id}
                        type="button"
                        className="loc-cascader-opt leaf"
                        onClick={() => handleSelect(loc)}
                      >
                        <span>{loc.city}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
