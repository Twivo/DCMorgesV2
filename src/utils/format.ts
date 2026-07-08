export const formatDate = (value?: string) => {
  if (!value) {
    return "Date non publiée";
  }

  // Tolerate a legacy DD.MM.YYYY value by converting it to ISO first.
  const legacy = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  const iso = legacy ? `${legacy[3]}-${legacy[2].padStart(2, "0")}-${legacy[1].padStart(2, "0")}` : value;

  const date = new Date(`${iso}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-CH", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(date);
};

// Compact date for agenda cards, e.g. "sam. 11 avril 2026".
export const formatEventDate = (value?: string) => {
  if (!value) {
    return "Date à venir";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-CH", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
};
