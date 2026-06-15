const MONTHS: Record<"tr" | "en", string[]> = {
  tr: [
    "Ocak",
    "Şubat",
    "Mart",
    "Nisan",
    "Mayıs",
    "Haziran",
    "Temmuz",
    "Ağustos",
    "Eylül",
    "Ekim",
    "Kasım",
    "Aralık",
  ],
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
};

const WEEKDAYS: Record<"tr" | "en", string[]> = {
  tr: ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
};

export function toLocalIsoDay(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toIsoDay(date: Date): string {
  return toLocalIsoDay(date);
}

export function daysSince(isoDate: string): number {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const past = new Date(`${isoDate}T12:00:00`);
  const diffMs = today.getTime() - past.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function formatDayLabel(
  isoDate: string,
  language: "tr" | "en",
  t: (key: string) => string
): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  if (isoDate === toIsoDay(now)) {
    return t("today");
  }
  if (isoDate === toIsoDay(tomorrow)) {
    return t("tomorrow");
  }

  const date = new Date(`${isoDate}T12:00:00`);
  const day = date.getDate();
  const month = MONTHS[language][date.getMonth()];
  const weekday = WEEKDAYS[language][date.getDay()];

  return language === "tr"
    ? `${day} ${month} ${weekday}`
    : `${weekday}, ${month} ${day}`;
}
