import { useEffect, useRef, useState } from "react";

const minCharacters = 20;

const CITIES = [
  "Agartala", "Aizawl", "Ajmer", "Akola", "Aligarh", "Prayagraj (Allahabad) ", "Alwar", "Ambala", "Amravati", "Amritsar",
  "Anantapur", "Ankleshwar", "Aurangabad", "Avadi", "Abu Dhabi", "Accra", "Addis Ababa", "Adelaide", "Agra", "Ahmedabad",
  "Algiers", "Amman", "Amsterdam", "Ankara", "Antananarivo", "Asunción", "Athens", "Atlanta", "Auckland", "Austin",
  "Bahadurgarh", "Ballari (Bellary)", "Bareilly", "Bathinda", "Belagavi (Belgaum)", "Bharatpur", "Bharuch", "Bhavnagar",
  "Bhilai", "Bhilwara", "Bhiwandi", "Bhiwani", "Bhubaneswar", "Bhuj", "Bidar", "Bilaspur", "Bokaro Steel City", "Bulandshahr",
  "Baghdad", "Baku", "Baltimore", "Bamako", "Bandung", "Bangalore (Bengaluru)", "Bangkok", "Barcelona", "Basel", "Baton Rouge",
  "Beijing", "Beirut", "Belgrade", "Belo Horizonte", "Benghazi", "Berlin", "Bern", "Bhopal", "Birmingham", "Bogotá",
  "Boston", "Brasília", "Bratislava", "Brazzaville", "Brisbane", "Brussels", "Bucharest", "Budapest", "Buenos Aires",
  "Chandrapur", "Chapra", "Coimbatore", "Cuttack", "Cairo", "Calgary", "Canberra", "Cape Town", "Caracas", "Casablanca",
  "Cebu", "Chandigarh", "Changsha", "Chennai", "Chicago", "Chittagong", "Chongqing", "Colombo", "Columbus", "Copenhagen", "Cordoba",
  "Davanagere", "Dehradun", "Dewas", "Dhanbad", "Dharamsala", "Dibrugarh", "Durg", "Dallas", "Dakar", "Dalian",
  "Dar es Salaam", "Delhi", "Denver", "Detroit", "Dhaka", "Doha", "Dongguan", "Douala", "Dubai", "Dublin", "Durban",
  "Edinburgh", "Edmonton", "Ekurhuleni", "Faridabad", "Farrukhabad", "Firozabad", "Faisalabad", "Florence", "Fort Worth",
  "Frankfurt", "Fukuoka", "Gandhinagar", "Gaya", "Ghaziabad", "Gorakhpur", "Gulbarga (Kalaburagi)", "Guntur", "Gurugram",
  "Gaborone", "Gdansk", "Geneva", "Genoa", "Glasgow", "Goa", "Guadalajara", "Guangzhou", "Guatemala City", "Gujranwala",
  "Haifa", "Hamburg", "Hangzhou", "Hanoi", "Harare", "Havana", "Helsinki", "Ho Chi Minh City", "Hong Kong", "Houston",
  "Hyderabad (India)", "Ibadan", "Incheon", "Indore", "Istanbul", "Izmir", "Jabalpur", "Jalandhar", "Jalgaon", "Jammu",
  "Jamnagar", "Jamshedpur", "Jhansi", "Jodhpur", "Junagadh", "Jakarta", "Jeddah", "Johannesburg", "Kabul", "Kampala",
  "Kanpur", "Karachi", "Kathmandu", "Kazan", "Kigali", "Kingston", "Kinshasa", "Kobe", "Kolkata", "Kuala Lumpur",
  "Kunming", "Kuwait City", "Kyiv", "Kyoto", "Lagos", "Lahore", "Lanzhou", "Las Vegas", "Leeds", "Lima", "Lisbon",
  "London", "Los Angeles", "Louisville", "Luanda", "Lucknow", "Lusaka", "Lyon", "Madrid", "Mahé", "Makassar",
  "Managua", "Manama", "Manaus", "Manila", "Maputo", "Marrakesh", "Marseille", "Mashhad", "Mazatlán", "Medan",
  "Medellín", "Melbourne", "Memphis", "Mexico City", "Miami", "Milan", "Milwaukee", "Minsk", "Mississauga", "Mogadishu",
  "Monrovia", "Monterrey", "Montevideo", "Montreal", "Moscow", "Mumbai", "Munich", "Nairobi", "Nagoya", "Nagpur",
  "Nanjing", "Nanning", "Nagercoil", "Nanded", "Nashik", "Nellore", "Noida", "North Lakhimpur", "Naples", "Nashville",
  "New Delhi", "New Orleans", "New York", "Newark", "Nice", "Ningbo", "Nizhny Novgorod", "Nouakchott", "Novosibirsk",
  "Oklahoma City", "Omaha", "Osaka", "Oslo", "Ottawa", "Panama City", "Paris", "Patna", "Perth", "Philadelphia",
  "Phnom Penh", "Phoenix", "Pittsburgh", "Port Elizabeth", "Port Harcourt", "Port Louis", "Port Moresby", "Portland",
  "Porto", "Prague", "Pretoria", "Pune", "Qingdao", "Quebec City", "Quito", "Raebareli", "Raichur", "Raipur",
  "Rajahmundry", "Rajkot", "Ranchi", "Ratlam", "Rewa", "Rohtak", "Rourkela", "Rabat", "Raleigh", "Recife",
  "Reykjavik", "Richmond", "Rio de Janeiro", "Riyadh", "Rome", "Rosario", "Rotterdam", "Sacramento", "Saint Petersburg",
  "Salt Lake City", "San Antonio", "San Diego", "San Francisco", "San José (Costa Rica)", "San Jose (USA)", "San Juan",
  "San Salvador", "Sana'a", "Santiago", "Santo Domingo", "São Paulo", "Seattle", "Sendai", "Seoul", "Seville",
  "Shanghai", "Sharjah", "Shenzhen", "Shijiazhuang", "Singapore", "Skopje", "Sofia", "St. Louis", "Stockholm", "Stuttgart",
  "Surat", "Suva", "Sydney", "Taipei", "Tallinn", "Tangier", "Tampa", "Tashkent", "Tbilisi", "Tehran", "Tel Aviv",
  "Tianjin", "Tijuana", "Tilburg", "Tokyo", "Toronto", "Tripoli", "Tunis", "Ulaanbaatar", "Valencia", "Vancouver",
  "Varanasi", "Venice", "Vienna", "Vientiane", "Vilnius", "Virginia Beach", "Warsaw", "Washington D.C.", "Wellington",
  "Wenzhou", "Winnipeg", "Wuhan", "Wuxi", "Warangal", "Xiamen", "Xi'an", "Yaoundé", "Yerevan", "Yokohama", "Yamunanagar",
  "Zirakpur", "Zagreb", "Zaragoza", "Zhengzhou", "Zibo", "Zurich"
];

export default function IntakeForm({
  onSubmit,
  isSubmitting,
  onValidationError,
  variant = "dark",
}) {
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("en");
  const [source, setSource] = useState("");
  const [platform, setPlatform] = useState("");
  const [region, setRegion] = useState("");
  const [actorId, setActorId] = useState("");
  const [tags, setTags] = useState("");
  const [showRegionSuggestions, setShowRegionSuggestions] = useState(false);
  const [filteredCities, setFilteredCities] = useState([]);
  const recognitionRef = useRef(null);
  const regionInputRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speechError, setSpeechError] = useState("");

  const isLight = variant === "light";
  const inputClass = isLight
    ? "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
    : "input";
  const textareaClass = isLight
    ? "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
    : "mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50";
  const containerClass = isLight
    ? "mt-6 space-y-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70"
    : "mt-6 space-y-6 rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/30";
  const titleClass = isLight
    ? "text-2xl font-semibold text-slate-900"
    : "text-2xl font-semibold text-white";
  const subtitleClass = isLight
    ? "text-sm text-slate-600"
    : "text-sm text-slate-400";
  const labelClass = isLight
    ? "text-sm font-semibold text-slate-700"
    : "text-sm font-semibold text-slate-200";
  const voiceButtonActiveClass = isLight
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : "border-rose-300/70 bg-rose-500/10 text-rose-200";
  const voiceButtonIdleClass = isLight
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-emerald-400/40 bg-emerald-500/10 text-emerald-200";
  const statusTextClass = isLight ? "text-xs text-slate-500" : "text-xs text-slate-400";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      recognitionRef.current = null;
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language?.trim() || "en";
    recognition.onresult = (event) => {
      let transcriptChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal && result[0]?.transcript) {
          transcriptChunk += result[0].transcript;
        }
      }
      if (transcriptChunk) {
        const cleaned = transcriptChunk.replace(/\s+/g, " ").trim();
        setText((previous) => {
          const prefix = previous && !previous.endsWith(" ") ? `${previous} ` : previous || "";
          return `${prefix || ""}${cleaned}`.trim();
        });
      }
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      setSpeechError(
        event.error === "not-allowed"
          ? "Microphone permission denied. Please allow access to dictate."
          : "Speech capture interrupted. Please try again."
      );
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognitionRef.current = recognition;
    setSpeechSupported(true);

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = language?.trim() || "en";
    }
  }, [language]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (regionInputRef.current && !regionInputRef.current.contains(event.target)) {
        setShowRegionSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRegionChange = (value) => {
    setRegion(value);
    if (value.trim()) {
      const filtered = CITIES.filter(city =>
        city.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10); // Limit to 10 suggestions
      setFilteredCities(filtered);
      setShowRegionSuggestions(filtered.length > 0);
    } else {
      setFilteredCities([]);
      setShowRegionSuggestions(false);
    }
  };

  const selectCity = (city) => {
    setRegion(city);
    setShowRegionSuggestions(false);
    setFilteredCities([]);
  };

  const stopDictation = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const handleToggleDictation = () => {
    if (!recognitionRef.current) {
      setSpeechError("Speech capture is unavailable in this browser.");
      return;
    }
    if (isListening) {
      stopDictation();
      return;
    }
    setSpeechError("");
    try {
      recognitionRef.current.lang = language?.trim() || "en";
      recognitionRef.current.start();
      setIsListening(true);
    } catch (error) {
      setSpeechError("Unable to access the microphone. Please try again.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!text || text.trim().length < minCharacters) {
      onValidationError?.(
        `Narrative must contain at least ${minCharacters} characters.`
      );
      return;
    }
    if (!region || !region.trim()) {
      onValidationError?.("Region (city/district) is required.");
      return;
    }
    const payload = {
      text: text.trim(),
      language: language.trim() || "en",
      source: source.trim() || "unknown",
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      metadata: {
        platform: platform.trim() || "unspecified",
        region: region.trim(),
        actor_id: actorId.trim() || null,
      },
    };
    const success = await onSubmit(payload);
    if (success) {
      stopDictation();
      setText("");
      setLanguage("en");
      setSource("");
      setPlatform("");
      setRegion("");
      setActorId("");
      setTags("");
      setSpeechError("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className={containerClass}>
      <header className="flex flex-col gap-2">
        <h2 className={titleClass}>
          Submit narrative for detection
        </h2>
        <p className={subtitleClass}>
          Paste flagged content, enrich with context, and trigger the end-to-end
          pipeline.
        </p>
      </header>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label htmlFor="payload-text" className={labelClass}>
            Narrative payload
          </label>
          <button
            type="button"
            onClick={handleToggleDictation}
            disabled={!speechSupported || isSubmitting}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide transition focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-40 ${
              isListening ? voiceButtonActiveClass : voiceButtonIdleClass
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isListening ? "bg-rose-300 animate-pulse" : "bg-emerald-300"
              }`}
            />
            {isListening ? "Stop dictation" : "Use voice input"}
          </button>
        </div>
        <textarea
          id="payload-text"
          name="text"
          rows={6}
          required
          placeholder="Paste suspect content or hostile call-to-action..."
          value={text}
          onChange={(event) => setText(event.target.value)}
          className={textareaClass}
        />
        <p className="mt-2 text-xs text-slate-500">
          Minimum {minCharacters} characters. The orchestrator runs heuristics,
          watermark checks, and graph ingestion automatically.
        </p>
        {speechError && (
          <p className="mt-2 text-xs text-rose-300">{speechError}</p>
        )}
        {!speechSupported && !speechError && (
          <p className="mt-2 text-xs text-slate-500">
            Voice dictation is unavailable in this browser.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 text-sm">
        <InputField label="Language" variant={variant}>
          <input
            id="payload-language"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className={inputClass}
          />
        </InputField>
        <InputField label="Source channel" variant={variant}>
          <input
            id="payload-source"
            value={source}
            placeholder="e.g. darknet, social-feed"
            onChange={(event) => setSource(event.target.value)}
            className={inputClass}
          />
        </InputField>
        <InputField label="Analyst tags" variant={variant}>
          <input
            id="payload-tags"
            value={tags}
            placeholder="disinfo, amplification"
            onChange={(event) => setTags(event.target.value)}
            className={inputClass}
          />
        </InputField>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 text-sm">
        <InputField label="Platform" variant={variant}>
          <input
            id="payload-platform"
            value={platform}
            placeholder="telegram, state-media"
            onChange={(event) => setPlatform(event.target.value)}
            className={inputClass}
          />
        </InputField>
        <InputField label="Region (city/district)" variant={variant}>
          <div ref={regionInputRef} className="relative">
            <input
              id="payload-region"
              value={region}
              placeholder="Start typing city name..."
              required
              onChange={(event) => handleRegionChange(event.target.value)}
              onFocus={() => {
                if (region.trim() && filteredCities.length > 0) {
                  setShowRegionSuggestions(true);
                }
              }}
              className={inputClass}
              autoComplete="off"
            />
            {showRegionSuggestions && filteredCities.length > 0 && (
              <div className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900/95 backdrop-blur-sm shadow-xl">
                {filteredCities.map((city, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => selectCity(city)}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-800 dark:text-slate-200 hover:bg-emerald-500/20 hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors first:rounded-t-lg last:rounded-b-lg border-b border-slate-200 dark:border-white/5 last:border-b-0"
                  >
                    {city}
                  </button>
                ))}
              </div>
            )}
          </div>
        </InputField>
        <InputField label="Actor ID" variant={variant}>
          <input
            id="payload-actor"
            value={actorId}
            placeholder="Suspected cell"
            onChange={(event) => setActorId(event.target.value)}
            className={inputClass}
          />
        </InputField>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className={`flex items-center gap-2 ${statusTextClass}`}>
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          Pipeline orchestration online
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-full bg-emerald-400/90 px-6 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Analyse narrative
          <svg
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4.167 10h11.666M10 4.167 15.833 10 10 15.833"
              stroke="#0f172a"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </form>
  );
}

function InputField({ label, children, variant = "dark" }) {
  const isLight = variant === "light";
  return (
    <label
      className={`flex flex-col gap-2 ${
        isLight ? "text-slate-700" : "text-slate-200"
      }`}
    >
      <span
        className={`text-xs uppercase tracking-[0.3em] ${
          isLight ? "text-slate-500" : "text-slate-400"
        }`}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
