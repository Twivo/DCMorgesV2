import fs from "node:fs/promises";
import path from "node:path";

const crawl = JSON.parse(await fs.readFile("migration/crawl.json", "utf8"));
const downloads = JSON.parse(await fs.readFile("migration/downloaded-assets.json", "utf8"));

const downloadMap = new Map(downloads.filter((item) => item.status === 200).map((item) => [item.url, item.localPath]));
const pageByPath = new Map(crawl.pages.map((page) => [new URL(page.url).pathname, page]));
const pageByUrl = new Map(crawl.pages.map((page) => [page.url, page]));

const imageExt = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"]);

const decodeResponse = async (response) => {
  const bytes = new Uint8Array(await response.arrayBuffer());
  const header = response.headers.get("content-type") ?? "";
  let charset = header.match(/charset=([^;\s]+)/i)?.[1]?.trim().toLowerCase();
  if (!charset) {
    const ascii = new TextDecoder("windows-1252").decode(bytes.slice(0, 4096));
    charset = ascii.match(/charset=["']?([^"'>;\s]+)/i)?.[1]?.trim().toLowerCase();
  }
  return new TextDecoder(charset || "windows-1252").decode(bytes);
};

const extractAttributes = (html, attr) => {
  const results = [];
  const pattern = new RegExp(`${attr}\\s*=\\s*(?:"([^"]+)"|'([^']+)'|([^\\s>]+))`, "gi");
  let match;
  while ((match = pattern.exec(html))) results.push(match[1] || match[2] || match[3]);
  return results;
};

const cleanHtml = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|tr|td|th|li|h[1-6]|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

const normalizeUrl = (raw, sourceUrl) => {
  if (!raw || raw.startsWith("#")) return undefined;
  if (/^(mailto|tel|javascript):/i.test(raw)) return undefined;
  try {
    const url = new URL(raw.trim(), sourceUrl);
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
};

const slugify = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "contenu";

const uniqueSlug = (() => {
  const used = new Map();
  return (base) => {
    const clean = slugify(base);
    const count = used.get(clean) ?? 0;
    used.set(clean, count + 1);
    return count ? `${clean}-${count + 1}` : clean;
  };
})();

const extOf = (url) => path.extname(new URL(url).pathname).toLowerCase();

const localUrl = (url) => downloadMap.get(url) ?? url;

const publicLink = (url, label) => ({ label, href: url });

const titleFromFilename = (url) => {
  const filename = decodeURIComponent(path.basename(new URL(url).pathname, extOf(url)));
  return filename
    .replace(/[-_]+/g, " ")
    .replace(/\bSDA\b/i, "SDA")
    .replace(/\bLMF\b/i, "LMF")
    .replace(/\bOLS\b/i, "OLS")
    .replace(/\bMVP\b/i, "MVP")
    .replace(/\bCup\b/g, "Cup")
    .replace(/\bRules\b/i, "Règlement")
    .replace(/\bReglements\b/i, "Règlements")
    .replace(/\bResultats\b/i, "Résultats")
    .replace(/\bClassement\b/i, "Classement")
    .replace(/\bCalendrier\b/i, "Calendrier")
    .replace(/\bPalmares\b/i, "Palmarès")
    .trim();
};

const seasonFromUrl = (url) => {
  const value = decodeURIComponent(new URL(url).pathname);
  return value.match(/20\d{2}-\d{2}/)?.[0] ?? value.match(/20\d{2}/)?.[0] ?? "Saison non précisée";
};

const competitionFromUrl = (url) => {
  const value = decodeURIComponent(new URL(url).pathname).toLowerCase();
  if (value.includes("/sda/") || value.includes("/swisscup/")) return "SDA";
  if (value.includes("ligue-morgienne")) return "LMF";
  if (value.includes("open-vaudois") || value.includes("morges-open")) return "Archives";
  if (value.includes("tournoi")) return "Tournois";
  return "Archives";
};

const typeFromUrl = (url) => {
  const value = decodeURIComponent(new URL(url).pathname).toLowerCase();
  if (value.includes("calendrier")) return "Calendrier";
  if (value.includes("classement")) return "Classement";
  if (value.includes("match")) return "Matchs";
  if (value.includes("resultat")) return "Résultats";
  if (value.includes("palmares")) return "Palmarès";
  if (value.includes("rules") || value.includes("reglement")) return "Règlement";
  if (value.includes("feuille")) return "Feuille de match";
  if (value.includes("cup") || value.includes("coupe")) return "Coupe";
  if (value.includes("statut")) return "Statuts";
  return "Document";
};

const documents = crawl.assets
  .filter((asset) => extOf(asset.url) === ".pdf")
  .map((asset) => {
    const baseId = slugify(decodeURIComponent(new URL(asset.url).pathname));
    return {
      id: baseId,
      title: titleFromFilename(asset.url),
      type: typeFromUrl(asset.url),
      season: seasonFromUrl(asset.url),
      competition: competitionFromUrl(asset.url),
      url: localUrl(asset.url),
      sourceUrl: asset.url,
      actionLabel: "Voir le document"
    };
  })
  .sort((a, b) => `${a.competition}-${a.season}-${a.title}`.localeCompare(`${b.competition}-${b.season}-${b.title}`));

const docBySource = new Map(documents.map((document) => [document.sourceUrl, document]));

const makeLegacyPages = () => {
  const slugByUrl = new Map();
  for (const page of crawl.pages) {
    const parsed = new URL(page.url);
    const pathSlug = parsed.pathname === "/" ? "accueil-actuel" : parsed.pathname.replace(/^\/|\/$/g, "");
    slugByUrl.set(page.url, uniqueSlug(pathSlug));
  }

  return crawl.pages.map((page) => {
    const content = page.text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line, index) => !(index === 0 && line === page.title));

    const summary = content.slice(0, 3).join(" - ").slice(0, 260) || page.title;
    const pageDocuments = (page.assets ?? []).map((url) => docBySource.get(url)).filter(Boolean);
    const images = (page.assets ?? [])
      .filter((url) => imageExt.has(extOf(url)))
      .filter((url) => !url.endsWith("favicon.ico"))
      .map(localUrl);
    const externalLinks = (page.externalLinks ?? []).map((url) => publicLink(url, new URL(url).hostname));
    const sourceLinks = (page.internalLinks ?? [])
      .map((url) => {
        const linked = pageByUrl.get(url);
        const slug = slugByUrl.get(url);
        return linked && slug ? publicLink(`/sources/${slug}/`, linked.title || new URL(url).pathname) : undefined;
      })
      .filter(Boolean);

    return {
      slug: slugByUrl.get(page.url),
      title: page.title === "homepage" || page.title === "Nouvelle page 1" ? readableTitleFromPath(page.url) : page.title,
      sourceUrl: page.url,
      destination: destinationForPage(page.url, page.destination),
      summary,
      content,
      documents: pageDocuments,
      images,
      externalLinks,
      sourceLinks
    };
  });
};

const readableTitleFromPath = (url) => {
  const pathname = decodeURIComponent(new URL(url).pathname);
  if (pathname === "/") return "Accueil actuel";
  return path.basename(pathname, path.extname(pathname)).replace(/[-_]+/g, " ");
};

const destinationForPage = (url, fallback) => {
  const pathname = decodeURIComponent(new URL(url).pathname).toLowerCase();
  if (pathname.includes("news")) return "News";
  if (pathname.includes("sda")) return "SDA";
  if (pathname.includes("ligue-morgienne") || pathname.includes("lmf")) return "LMF";
  if (pathname.includes("contact")) return "Contact";
  if (pathname.includes("video")) return "Vidéos";
  if (pathname.includes("agenda")) return "Agenda";
  if (pathname.includes("archive") || pathname.includes("morges-open") || pathname.includes("open-vaudois")) return "Archives";
  if (pathname.includes("club") || pathname.includes("palmares")) return "Club";
  return fallback || "Archives";
};

const legacyPages = makeLegacyPages();
const legacyBySource = new Map(legacyPages.map((page) => [page.sourceUrl, page]));

const normalizeName = (name) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const parseMemberPage = () => {
  const page = pageByPath.get("/club/Club-2025-26.htm");
  if (!page) return [];
  const lines = page.text.split("\n").map((line) => line.trim()).filter(Boolean);
  const start = lines.indexOf("Membres actifs 2025-26") + 1;
  const oldIndex = lines.indexOf("Anciens membres");
  const parseRange = (from, to, role) => {
    const result = [];
    let parts = [];
    for (const line of lines.slice(from, to)) {
      if (/^\(.+\)$/.test(line)) {
        const fullName = parts.join(" ").replace(/\s+/g, " ").trim();
        if (fullName) result.push({ fullName, nationality: line.replace(/[()]/g, ""), role });
        parts = [];
      } else {
        parts.push(line);
      }
    }
    return result;
  };

  const active = parseRange(start, oldIndex, "Membre actif");
  const former = parseRange(oldIndex + 1, lines.length, "Ancien membre");
  const images = (page.assets ?? []).filter((url) => imageExt.has(extOf(url))).filter((url) => !url.includes("logo"));
  const all = [...active, ...former];

  return all.map((member, index) => {
    const pieces = member.fullName.split(" ");
    const lastName = pieces.pop() ?? member.fullName;
    const firstName = pieces.join(" ") || lastName;
    const guessedImage = images[index] ? localUrl(images[index]) : undefined;
    return {
      id: slugify(member.fullName),
      firstName,
      lastName,
      role: `${member.role} - ${member.nationality}`,
      photo: guessedImage
    };
  });
};

const members = parseMemberPage();

const teamPhoto = (name) => {
  const normalized = normalizeName(name);
  const member = members.find((item) => normalizeName(`${item.firstName} ${item.lastName}`) === normalized);
  return member?.photo;
};

const teams = [
  {
    id: "dc-morges-1-sda-2025-26",
    name: "DC Morges 1",
    competition: "SDA",
    season: "2025-26",
    description: "SDA Team 2025-26",
    members: [
      "Michel Roy (Capt. 1) 4807",
      "Dermot Simpson 4803",
      "George Rooney 4810",
      "James Oliver 4812",
      "Chris Roberts 4822",
      "Julien Tanguy 4825",
      "Stefan Dudolenski 4838",
      "Yannick Cainzos 4842",
      "Neil Poulton 4845",
      "Alain Baechler 4846",
      "Arno Roy 4852"
    ]
  },
  {
    id: "dc-morges-2-sda-2025-26",
    name: "DC Morges 2",
    competition: "SDA",
    season: "2025-26",
    description: "SDA Team 2025-26",
    members: [
      "Laurent Flaction (Capt. 2) 4835",
      "Fouad Beram 4818",
      "Christophe Chamard 4819",
      "Joao Ferreira 4833",
      "Rose Marie Bussard 4834",
      "Gordon Alders 4843",
      "Ludovic Marguet 4847",
      "Didier André 4848",
      "Benjamin Schaub 4849",
      "Thomas Donkin 4850",
      "Lucas Montant 4851"
    ]
  },
  {
    id: "dc-morges-lmf-2025-26",
    name: "DC Morges",
    competition: "LMF",
    season: "2025-26",
    description: "LMF Team 2025-26",
    members: [
      "Michel Roy (Capt.) 5101",
      "Laurent Flaction 5102",
      "Ludovic Marguet 5103",
      "Yannick Cainzos 5105",
      "Neil Poulton 5107",
      "Arno Roy 5109",
      "Patrick Roy 5110",
      "Amandine Marchand 5111"
    ]
  }
];

const newsPage = pageByPath.get("/news.html");
const parseNews = async () => {
  if (!newsPage) return [];
  const response = await fetch(newsPage.url, {
    headers: { "user-agent": "DCMorgesContentMigration/1.0" },
    redirect: "follow"
  });
  const html = await decodeResponse(response);
  const titleCells = [...html.matchAll(/<td\b[^>]*bgcolor=["']?[^"'\s>]+["']?[^>]*>[\s\S]*?<\/td>/gi)]
    .map((match) => ({
      index: match.index,
      end: match.index + match[0].length,
      title: cleanHtml(match[0]).join(" ")
    }))
    .filter((item) => /\((?:\d{1,2}-)?\d{1,2}\.\d{1,2}/.test(item.title))
    .filter((item) => item.title.length < 220);

  if (titleCells.length > 0) {
    return titleCells.map((cell, index) => {
      const next = titleCells[index + 1];
      const bodyHtml = html.slice(cell.end, next ? next.index : html.length);
      const bodyLines = cleanHtml(bodyHtml)
        .filter((line) => line !== cell.title)
        .filter((line) => !/^[-–—]{3,}$/.test(line))
        .slice(0, 30);
      const hrefs = extractAttributes(bodyHtml, "href").map((href) => normalizeUrl(href, newsPage.url)).filter(Boolean);
      const srcs = extractAttributes(bodyHtml, "src").map((src) => normalizeUrl(src, newsPage.url)).filter(Boolean);
      const linkedDocuments = hrefs.map((href) => docBySource.get(href)).filter(Boolean);
      const image = srcs.find((src) => imageExt.has(extOf(src)));
      const dateMatch = cell.title.match(/\(((?:\d{1,2}-)?\d{1,2}\.\d{1,2}(?:[.-]\d{2,4})?(?:-\d{1,2}\.\d{1,2}(?:\.\d{2,4})?)?)\)/);
      const title = cell.title
        .replace(/\([^)]+\)/g, "")
        .replace(/\bC arnet\b/g, "Carnet")
        .replace(/\s+/g, " ")
        .trim();
      const summary = bodyLines.slice(0, 3).join(" ").slice(0, 240) || title;

      return {
        slug: uniqueSlug(`${title}-${dateMatch?.[1] ?? index}`),
        title,
        date: dateMatch?.[1] ?? "",
        category: newsCategory(title),
        image: image ? localUrl(image) : undefined,
        summary,
        content: bodyLines,
        documents: linkedDocuments,
        sourceUrl: newsPage.url
      };
    });
  }

  const lines = newsPage.text.split("\n").map((line) => line.trim()).filter(Boolean).filter((line) => line !== "news");
  const items = [];
  let current;
  let buffered;
  const datePattern = /\(((?:\d{1,2}-)?\d{1,2}\.\d{1,2}(?:[.-]\d{2,4})?(?:-\d{1,2}\.\d{1,2}(?:\.\d{2,4})?)?)\)/;

  const flushBuffered = () => {
    if (buffered && current) current.content.push(buffered);
    buffered = undefined;
  };

  for (const line of lines) {
    const match = line.match(datePattern);
    if (match) {
      if (current) {
        flushBuffered();
        current.summary = current.content.slice(0, 2).join(" ").slice(0, 220) || current.title;
        items.push(current);
      }
      const prefix = buffered ? `${buffered} ` : "";
      buffered = undefined;
      const title = `${prefix}${line}`.replace(/\s+/g, " ").trim();
      current = {
        slug: uniqueSlug(title),
        title: title.replace(datePattern, "").trim(),
        date: match[1],
        category: newsCategory(title),
        summary: "",
        content: [],
        documents: [],
        sourceUrl: newsPage.url
      };
    } else if (current) {
      flushBuffered();
      buffered = line;
    } else {
      buffered = line;
    }
  }

  if (current) {
    flushBuffered();
    current.summary = current.content.slice(0, 2).join(" ").slice(0, 220) || current.title;
    items.push(current);
  }

  return items.slice(0, 80);
};

const newsCategory = (title) => {
  const value = title.toLowerCase();
  if (value.includes("sda")) return "SDA";
  if (value.includes("lmf") || value.includes("ligue morgienne")) return "LMF";
  if (value.includes("tournoi") || value.includes("open")) return "Tournoi";
  if (value.includes("coupe")) return "Coupe";
  if (value.includes("championnat")) return "Championnat";
  return "Club";
};

const newsItems = await parseNews();

const events = [
  {
    id: "tournoi-paques-2026",
    title: "Tournoi de Pâques",
    date: "Lundi 6 avril (11h)",
    location: "Jameson's Pub, Morges",
    type: "Tournoi",
    description: "Tournoi de Steel Darts.",
    sourceUrl: "https://www.dcmorges.ch/agenda.htm"
  },
  {
    id: "lmf-2026-lausanne-social-darts-dc-morges",
    title: "Lausanne Social Darts - DC Morges",
    date: "Mercredi 8 avril (20h)",
    location: "McCarthy's Pub, Lausanne",
    type: "Ligue Morgienne de Fléchettes",
    description: "Rencontre LMF.",
    sourceUrl: "https://www.dcmorges.ch/agenda.htm"
  },
  {
    id: "sda-14eme-journee-martigny-dc-morges-1",
    title: "Martigny Sport - DC Morges 1",
    date: "Samedi 11 avril (13h)",
    location: "MSDARTS, Rue du Châble-Bèt 41, Martigny (VS)",
    type: "Swiss Darts Association",
    description: "14ème journée.",
    sourceUrl: "https://www.dcmorges.ch/agenda.htm"
  },
  {
    id: "sda-14eme-journee-dc-morges-1-casa-benfica",
    title: "DC Morges 1 - Casa Benfica Genève",
    date: "Dimanche 12 avril (13h)",
    location: "Rest. La Sportive, Rue de Carouge 45, Genève",
    type: "Swiss Darts Association",
    description: "14ème journée.",
    sourceUrl: "https://www.dcmorges.ch/agenda.htm"
  },
  {
    id: "coupe-vaudoise-demi-finale",
    title: "Lausanne Social Darts - DC Morges",
    date: "Mercredi 15 mars (20h)",
    location: "McCarthy's Pub, Lausanne",
    type: "Coupe Vaudoise",
    description: "1/2 Finale.",
    sourceUrl: "https://www.dcmorges.ch/agenda.htm"
  }
];

const videos = [
  {
    id: "emission-sportive-la-tele-2012",
    title: "Emission sportive La Télé 2012",
    year: "2012",
    description: "Vidéo présente sur la page Vidéos du site actuel.",
    url: localUrl("https://www.dcmorges.ch/videos/Les-Sports-La-tele.mp4"),
    thumbnail: localUrl("https://www.dcmorges.ch/clipart/cameraman.gif")
  },
  {
    id: "pdc-worldcup-2017-switzerland-brazil",
    title: "PDC Worldcup 2017 Switzerland-Brazil",
    year: "2017",
    description: "Vidéo présente sur la page Vidéos du site actuel.",
    url: localUrl("https://www.dcmorges.ch/videos/WorldCup-2017-Switzerland-Brazil.mp4"),
    thumbnail: localUrl("https://www.dcmorges.ch/clipart/cameraman.gif")
  },
  {
    id: "wdf-world-cup-2019-romania",
    title: "WDF World Cup 2019 Cluj-Napoca / Romania",
    year: "2019",
    description: "Vidéo présente sur la page Vidéos du site actuel.",
    url: localUrl("https://www.dcmorges.ch/videos/WorldCup-2019-Romania.mp4"),
    thumbnail: localUrl("https://www.dcmorges.ch/clipart/cameraman.gif")
  },
  {
    id: "wdf-europe-cup-2022-spain",
    title: "WDF Europe Cup 2022 Gandia / Spain",
    year: "2022",
    description: "Vidéo présente sur la page Vidéos du site actuel.",
    url: localUrl("https://www.dcmorges.ch/videos/EuropeCup-2022-Spain.mp4"),
    thumbnail: localUrl("https://www.dcmorges.ch/clipart/cameraman.gif")
  }
];

const linksFor = (predicate) =>
  legacyPages
    .filter((page) => predicate(page.sourceUrl))
    .map((page) => ({ label: page.title, href: `/sources/${page.slug}/`, description: page.summary }));

const docIdsFor = (predicate) => documents.filter((document) => predicate(document.sourceUrl)).map((document) => document.id);

const archiveCategories = [
  {
    id: "championnat-du-monde",
    title: "Championnat du Monde",
    description: "Archives des championnats du monde WDF et PDC présentes sur le site actuel.",
    seasons: ["Archives historiques"],
    documentIds: [],
    links: linksFor((url) => url.includes("halloffame-wc"))
  },
  {
    id: "sda",
    title: "SDA",
    description: "Archives Swiss Darts Association, championnat et Swiss Cup.",
    seasons: [...new Set(documents.filter((document) => document.competition === "SDA").map((document) => document.season))],
    documentIds: docIdsFor((url) => url.includes("/sda/") || url.includes("/swisscup/")),
    links: linksFor((url) => url.includes("halloffame-sda") || url.includes("/sda.htm"))
  },
  {
    id: "ligue-morgienne",
    title: "Ligue Morgienne / Ligue Vaudoise",
    description: "Archives LMF, Ligue Vaudoise, championnats et coupes.",
    seasons: [...new Set(documents.filter((document) => document.competition === "LMF").map((document) => document.season))],
    documentIds: docIdsFor((url) => url.includes("ligue-morgienne")),
    links: linksFor((url) => url.includes("halloffame-lmf") || url.includes("ligue-morgienne"))
  },
  {
    id: "geneva-darts-league",
    title: "Geneva Darts League",
    description: "Archives Geneva Darts League présentes sur le site actuel.",
    seasons: ["Archives historiques"],
    documentIds: [],
    links: linksFor((url) => url.includes("halloffame-gdl"))
  },
  {
    id: "morges-open",
    title: "Morges Open / Open Vaudois",
    description: "Résultats, hall of fame et documents liés au Morges Open et à l'Open Vaudois.",
    seasons: [...new Set(documents.filter((document) => document.competition === "Archives").map((document) => document.season))],
    documentIds: docIdsFor((url) => url.includes("Morges-Open") || url.includes("Open-Vaudois")),
    links: linksFor((url) => url.includes("Morges-Open") || url.includes("Open-Vaudois") || url.includes("halloffame-open"))
  },
  {
    id: "master-tour",
    title: "Master Tour",
    description: "Hall of fame Master Tour.",
    seasons: ["Archives historiques"],
    documentIds: [],
    links: linksFor((url) => url.includes("master-tour"))
  },
  {
    id: "autres-archives",
    title: "Autres archives",
    description: "Autres pages historiques et contenus techniques accessibles depuis le site actuel.",
    seasons: ["Archives historiques"],
    documentIds: docIdsFor((url) => url.includes("tournoi")),
    links: linksFor((url) => !url.includes("halloffame") && !url.includes("Morges-Open") && !url.includes("Open-Vaudois") && !url.includes("/sda.htm") && !url.includes("ligue-morgienne"))
  }
];

const seasons = [...new Set(documents.map((document) => document.season))]
  .sort((a, b) => b.localeCompare(a))
  .map((label) => ({ id: slugify(label), label, isCurrent: label === "2025-26" }));

const writeTs = async (file, importLine, exportName, value, extra = "") => {
  const code = `${importLine}\n\nexport const ${exportName} = ${JSON.stringify(value, null, 2)};\n${extra}`;
  await fs.writeFile(file, code, "utf8");
};

await writeTs(
  "src/data/site.ts",
  'import type { LinkItem, NavItem } from "./types";',
  "siteInfo",
  {
    name: "Darts Club Morges",
    shortName: "DC Morges",
    tagline: "Club de fléchettes à Morges",
    description: "DARTS CLUB MORGES, Rue de la Gare 1b, 1110 Morges.",
    address: "Rue de la Gare 1b, 1110 Morges",
    location: "Jameson's Pub, Rue de la Gare 1, 1110 Morges (VD)",
    email: "dartsclubmorges@gmail.com",
    website: "https://www.dcmorges.ch",
    iban: "CH87 0900 0000 1734 5611 4",
    heroImage: "/images/darts-hero.png",
    update: "26.04.2026"
  },
  `
export const navigation: NavItem[] = ${JSON.stringify([
    { label: "Accueil", href: "/" },
    { label: "News", href: "/news/" },
    { label: "SDA", href: "/sda/" },
    { label: "LMF", href: "/lmf/" },
    { label: "Club", href: "/club/" },
    { label: "Agenda", href: "/agenda/" },
    { label: "Archives", href: "/archives/" },
    { label: "Vidéos", href: "/videos/" },
    { label: "Contact", href: "/contact/" }
  ], null, 2)};

export const quickLinks: LinkItem[] = ${JSON.stringify([
    { label: "SDA", href: "/sda/", description: "Calendriers, matchs, classements, statuts et règlements SDA 2025-26." },
    { label: "Ligue Morgienne / LMF", href: "/lmf/", description: "Palmarès, calendrier, teams, classements, coupe et feuilles de match LMF 2025-26." },
    { label: "Club", href: "/club/", description: "Membres actifs 2025-26, équipes SDA et LMF, palmarès du club." },
    { label: "Contact", href: "/contact/", description: "Adresse, e-mail, IBAN, locaux de jeu et capitaines." }
  ], null, 2)};
`
);

await writeTs("src/data/documents.ts", 'import type { DocumentItem } from "./types";', "documents", documents, `
export const getDocumentsByCompetition = (competition: string) =>
  documents.filter((document) => document.competition === competition);
`);
await writeTs("src/data/news.ts", 'import type { NewsItem } from "./types";', "newsItems", newsItems);
await writeTs("src/data/events.ts", 'import type { EventItem } from "./types";', "events", events);
await writeTs("src/data/members.ts", 'import type { MemberItem } from "./types";', "members", members);
await writeTs("src/data/teams.ts", 'import type { TeamItem } from "./types";', "teams", teams);
await writeTs("src/data/videos.ts", 'import type { VideoItem } from "./types";', "videos", videos);
await writeTs("src/data/archives.ts", 'import type { ArchiveCategory } from "./types";', "archiveCategories", archiveCategories);
await writeTs("src/data/seasons.ts", 'import type { SeasonItem } from "./types";', "seasons", seasons);
await writeTs("src/data/legacyPages.ts", 'import type { LegacyPage } from "./types";', "legacyPages", legacyPages, `
export const getLegacyPagesByDestination = (destination: string) =>
  legacyPages.filter((page) => page.destination === destination);
`);

const pdfInventory = [
  "# Inventaire des PDF intégrés",
  "",
  "| Titre | Catégorie | Saison | URL locale | Source |",
  "| --- | --- | --- | --- | --- |",
  ...documents.map((document) => `| ${document.title} | ${document.competition} / ${document.type} | ${document.season} | ${document.url} | ${document.sourceUrl} |`)
];
await fs.writeFile("migration/pdf-inventory.md", pdfInventory.join("\n"), "utf8");

const nonIntegrated = [
  "# Contenus non intégrés ou à surveiller",
  "",
  "Tous les PDF et assets détectés ont été copiés sous `public/legacy/`.",
  "",
  "Les anciennes pages techniques de frames (`leftframe.htm`, `rightframe.htm`, variantes `music/` et `Open-Vaudois/`) sont conservées comme fiches source dans `/sources/` mais ne sont pas transformées en pages principales, car elles servent essentiellement à la navigation de l'ancien site.",
  "",
  "Les pages HTML historiques et hall of fame sont intégrées comme fiches source et reliées depuis Archives. Les résultats sportifs n'ont pas été réécrits.",
  "",
  "Les vidéos sont copiées comme fichiers MP4 locaux dans `public/legacy/videos/`."
];
await fs.writeFile("migration/non-integrated.md", nonIntegrated.join("\n"), "utf8");

console.log(JSON.stringify({
  documents: documents.length,
  news: newsItems.length,
  members: members.length,
  teams: teams.length,
  events: events.length,
  videos: videos.length,
  legacyPages: legacyPages.length
}, null, 2));
