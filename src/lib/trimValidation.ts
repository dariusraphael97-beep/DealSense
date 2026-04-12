/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DealSense — Year-Specific Trim Validation
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Problem: The generic trim list in carData.ts is the same for all model
 * years, but trims change across generations. A 2025 BMW M5 only comes in
 * one variant (new G90), yet the old F90 trims (Competition, CS) are still
 * offered in the picker. This module validates trims against curated,
 * year-specific data for high-risk performance/luxury models.
 *
 * Exported:
 *   - TrimValidation           (interface)
 *   - validateTrim()           (main validation function)
 *   - getYearSpecificTrims()   (lookup helper for carData.ts)
 *   - isHighRiskMakeModel()    (utility)
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TrimValidation {
  decodedTrim: string | null;
  userTrim: string | null;
  validatedTrim: string | null;
  trimConfidence: "high" | "medium" | "low";
  trimValidationNotes: string[];
  isHighRiskModel: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Expand a year-range string like "2018-2024" or "2025" into an array of
 * individual year numbers.
 */
function expandYearRange(range: string): number[] {
  const parts = range.split("-").map((s) => parseInt(s.trim(), 10));
  if (parts.length === 1) return [parts[0]];
  const [start, end] = parts;
  const years: number[] = [];
  for (let y = start; y <= end; y++) years.push(y);
  return years;
}

/**
 * Build a lookup from year -> trim list, given a more compact
 * "yearRange -> trims" input.
 */
function buildYearMap(
  entries: Record<string, string[]>
): Record<number, string[]> {
  const map: Record<number, string[]> = {};
  for (const [range, trims] of Object.entries(entries)) {
    for (const year of expandYearRange(range)) {
      map[year] = trims;
    }
  }
  return map;
}

// ─── Year-Specific Trim Data ────────────────────────────────────────────────
//
// Structure: Record<makeModelKey, Record<year, validTrims>>
// The makeModelKey is "make|model" in lowercase.
// An empty array means the model was discontinued / doesn't exist that year.

const YEAR_SPECIFIC_TRIMS: Record<string, Record<number, string[]>> = {
  // ── BMW M cars ──────────────────────────────────────────────────────────

  "bmw|m2": buildYearMap({
    "2016-2021": ["Base", "Competition", "CS"],
    "2023-2026": ["Base"],
  }),

  "bmw|m3": buildYearMap({
    "2015-2018": ["Base", "Competition"],
    "2021-2024": ["Base", "Competition", "Competition xDrive"],
    "2025-2026": ["Base", "Competition xDrive", "CS"],
  }),

  "bmw|m4": buildYearMap({
    "2015-2020": ["Coupe", "Competition", "CS", "GTS"],
    "2021-2026": [
      "Coupe",
      "Competition Coupe",
      "Competition xDrive Coupe",
      "Convertible",
      "Competition Convertible",
      "CS",
      "CSL",
    ],
  }),

  "bmw|m5": buildYearMap({
    "2018-2024": ["Base", "Competition", "CS"],
    "2025-2026": ["Base"],
  }),

  "bmw|m8": buildYearMap({
    "2020-2026": [
      "Coupe",
      "Competition Coupe",
      "Gran Coupe",
      "Competition Gran Coupe",
      "Convertible",
      "Competition Convertible",
    ],
  }),

  // ── Mercedes AMG ────────────────────────────────────────────────────────

  "mercedes-benz|c 63 amg": buildYearMap({
    "2015-2022": ["Base", "S"],
    "2023-2026": ["S E Performance"],
  }),

  "mercedes-benz|amg c 63": buildYearMap({
    "2015-2022": ["Base", "S"],
    "2023-2026": ["S E Performance"],
  }),

  "mercedes-benz|e 63 amg": buildYearMap({
    "2018-2021": ["Base", "S"],
    "2022-2026": [],
  }),

  "mercedes-benz|amg e 63": buildYearMap({
    "2018-2021": ["Base", "S"],
    "2022-2026": [],
  }),

  "mercedes-benz|amg gt": buildYearMap({
    "2016-2021": ["Base", "S", "R", "R Pro", "Black Series"],
    "2024-2026": ["43 Coupe", "55 S Coupe", "63 S E Performance"],
  }),

  // ── Porsche 911 ─────────────────────────────────────────────────────────

  "porsche|911": buildYearMap({
    "2020-2024": [
      "Carrera",
      "Carrera S",
      "Carrera 4S",
      "Targa 4",
      "Targa 4S",
      "GTS",
      "GT3",
      "GT3 RS",
      "Turbo",
      "Turbo S",
      "GT3 Touring",
      "Sport Classic",
      "S/T",
      "Dakar",
    ],
    "2025-2026": [
      "Carrera",
      "Carrera S",
      "Carrera 4S",
      "Carrera T",
      "Carrera GTS",
      "Targa 4 GTS",
      "GT3",
      "GT3 RS",
      "Turbo",
      "Turbo S",
    ],
  }),

  // ── Audi RS / S ─────────────────────────────────────────────────────────

  "audi|rs 5": buildYearMap({
    "2018-2024": ["Sportback", "Coupe"],
    "2025-2026": [],
  }),

  "audi|rs 6": buildYearMap({
    "2021-2026": ["Avant", "Avant Performance"],
  }),

  "audi|rs 7": buildYearMap({
    "2021-2026": ["Sportback", "Sportback Performance"],
  }),

  "audi|rs e-tron gt": buildYearMap({
    "2022-2026": ["Base", "Performance"],
  }),

  // ── Dodge / Performance Trucks ──────────────────────────────────────────

  "dodge|challenger": buildYearMap({
    "2015-2023": [
      "SXT",
      "GT",
      "R/T",
      "R/T Scat Pack",
      "SRT Hellcat",
      "SRT Hellcat Redeye",
      "SRT Super Stock",
      "SRT Demon",
      "SRT Demon 170",
    ],
    "2024-2026": [],
  }),

  "dodge|charger": buildYearMap({
    "2015-2023": [
      "SXT",
      "GT",
      "R/T",
      "R/T Scat Pack",
      "SRT Hellcat",
      "SRT Hellcat Redeye",
    ],
    "2024-2026": ["Daytona R/T", "Daytona Scat Pack"],
  }),

  "ram|1500 trx": buildYearMap({
    "2021-2024": ["Base", "Level 2"],
    "2025-2026": [],
  }),

  // ── Ford ────────────────────────────────────────────────────────────────

  "ford|mustang": buildYearMap({
    "2015-2023": [
      "EcoBoost",
      "GT",
      "Mach 1",
      "Shelby GT350",
      "Shelby GT500",
      "Dark Horse",
    ],
    "2024-2026": ["EcoBoost", "GT", "Dark Horse", "GTD"],
  }),

  // ── Chevrolet Corvette ──────────────────────────────────────────────────

  "chevrolet|corvette": buildYearMap({
    "2020-2024": ["Stingray", "Z06", "E-Ray", "ZR1"],
    "2025-2026": ["Stingray", "Z06", "E-Ray", "ZR1"],
  }),
};

// ─── High-Risk Patterns ─────────────────────────────────────────────────────
//
// Models that are especially prone to trim misclassification because their
// trims change significantly across generations or carry large value deltas.

const HIGH_RISK_PATTERNS: RegExp[] = [
  /\b(m[2-8])\b/i, // BMW M cars
  /\bamg\b/i, // Mercedes AMG
  /\b(rs\s?\d|rs\s?e)/i, // Audi RS
  /\b(gt3|gt4|turbo s?|carrera|targa|cayenne turbo)\b/i, // Porsche
  /\b(hellcat|demon|srt|scat pack|trx)\b/i, // Dodge/Ram performance
  /\b(shelby|gt500|gt350|dark horse|gtd|raptor r?)\b/i, // Ford performance
  /\b(z06|zr1|e-ray|zl1|blackwing)\b/i, // Chevy/Cadillac performance
  /\b(type r|type s)\b/i, // Honda performance
  /\b(nismo|gt-r)\b/i, // Nissan performance
  /\b(quadrifoglio)\b/i, // Alfa Romeo
  /\b(svr|svautobiography)\b/i, // Land Rover/Range Rover
  /\b(plaid)\b/i, // Tesla
];

/** Makes where almost every model is high-risk for trim confusion. */
const HIGH_RISK_MAKES = new Set([
  "porsche",
  "ferrari",
  "lamborghini",
  "mclaren",
  "aston martin",
  "bentley",
  "rolls-royce",
  "lotus",
  "maserati",
  "bugatti",
  "koenigsegg",
  "pagani",
  "rimac",
]);

/**
 * Returns true if the given make/model combination is known to be high-risk
 * for trim confusion — either the make is inherently high-risk (exotics) or
 * the model name matches one of the HIGH_RISK_PATTERNS.
 */
export function isHighRiskMakeModel(make: string, model: string): boolean {
  const makeLower = make.toLowerCase().trim();
  if (HIGH_RISK_MAKES.has(makeLower)) return true;

  const combined = `${make} ${model}`.toLowerCase();
  return HIGH_RISK_PATTERNS.some((pattern) => pattern.test(combined));
}

// ─── Fuzzy Trim Matching ────────────────────────────────────────────────────

/**
 * Check whether a candidate trim string matches any of the valid trims for
 * a given year. Matching is:
 *   - Case-insensitive
 *   - Allows partial/suffix matching (e.g. "M5 Competition" matches "Competition")
 *   - Allows prefix matching (e.g. "Competition xDrive" matches "Competition xDrive Coupe"
 *     only if the valid trim starts with the candidate)
 *
 * Returns the matched valid trim string (canonical form), or null.
 */
function fuzzyMatchTrim(
  candidate: string | null,
  validTrims: string[]
): string | null {
  if (!candidate || validTrims.length === 0) return null;

  const candidateLower = candidate.toLowerCase().trim();
  if (!candidateLower) return null;

  // 1. Exact match (case-insensitive)
  for (const vt of validTrims) {
    if (vt.toLowerCase() === candidateLower) return vt;
  }

  // 2. Candidate ends with a valid trim (e.g. "M5 Competition" -> "Competition")
  for (const vt of validTrims) {
    const vtLower = vt.toLowerCase();
    if (candidateLower.endsWith(vtLower)) return vt;
  }

  // 3. Valid trim ends with candidate (e.g. candidate "Competition" matches "Competition xDrive")
  //    Only if the candidate is reasonably specific (3+ chars)
  if (candidateLower.length >= 3) {
    for (const vt of validTrims) {
      const vtLower = vt.toLowerCase();
      if (vtLower.endsWith(candidateLower)) return vt;
    }
  }

  // 4. Candidate starts with a valid trim or vice versa
  for (const vt of validTrims) {
    const vtLower = vt.toLowerCase();
    if (candidateLower.startsWith(vtLower) || vtLower.startsWith(candidateLower)) {
      return vt;
    }
  }

  // 5. Substring containment: valid trim is contained in candidate
  for (const vt of validTrims) {
    const vtLower = vt.toLowerCase();
    if (vtLower.length >= 3 && candidateLower.includes(vtLower)) return vt;
  }

  return null;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns the list of valid trims for a specific year/make/model, or `null`
 * if no year-specific data is available for that combination.
 *
 * An empty array means the model was discontinued that year (intentional).
 */
export function getYearSpecificTrims(
  year: number,
  make: string,
  model: string
): string[] | null {
  const key = `${make.toLowerCase().trim()}|${model.toLowerCase().trim()}`;
  const yearMap = YEAR_SPECIFIC_TRIMS[key];
  if (!yearMap) return null;

  const trims = yearMap[year];
  // Return the array (possibly empty) if found, or null if the year isn't covered
  return trims !== undefined ? trims : null;
}

/**
 * Downgrade a confidence level by one step.
 */
function downgradeConfidence(
  level: "high" | "medium" | "low"
): "high" | "medium" | "low" {
  if (level === "high") return "medium";
  if (level === "medium") return "low";
  return "low";
}

/**
 * Validate a trim against year-specific data and return a TrimValidation
 * result with confidence level and human-readable notes.
 */
export function validateTrim(
  year: number,
  make: string,
  model: string,
  decodedTrim: string | null,
  userTrim: string | null
): TrimValidation {
  const highRisk = isHighRiskMakeModel(make, model);
  const notes: string[] = [];
  const yearTrims = getYearSpecificTrims(year, make, model);

  let validatedTrim: string | null = null;
  let trimConfidence: "high" | "medium" | "low" = "low";

  // ── Path A: Year-specific data available ─────────────────────────────

  if (yearTrims !== null) {
    // A-1: Model discontinued that year (empty array)
    if (yearTrims.length === 0) {
      notes.push(
        `The ${year} ${make} ${model} was discontinued or not produced this model year`
      );
      return {
        decodedTrim,
        userTrim,
        validatedTrim: null,
        trimConfidence: "low",
        trimValidationNotes: notes,
        isHighRiskModel: highRisk,
      };
    }

    // A-2: Try matching decoded trim against valid trims
    const decodedMatch = fuzzyMatchTrim(decodedTrim, yearTrims);
    const userMatch = fuzzyMatchTrim(userTrim, yearTrims);

    if (decodedMatch) {
      // Decoded trim matches — high confidence
      validatedTrim = decodedMatch;
      trimConfidence = "high";
      notes.push(
        `VIN-decoded trim "${decodedTrim}" validated against ${year} model year data`
      );

      if (userTrim && !userMatch) {
        notes.push(
          `User-selected trim "${userTrim}" does not match known ${year} trims — using VIN-decoded value`
        );
      } else if (userMatch && userMatch !== decodedMatch) {
        notes.push(
          `User trim "${userTrim}" matched "${userMatch}" but VIN decode matched "${decodedMatch}" — preferring VIN decode`
        );
      }
    } else if (userMatch) {
      // User trim matches but decoded doesn't — medium confidence
      validatedTrim = userMatch;
      trimConfidence = "medium";
      notes.push(
        `User-selected trim "${userTrim}" validated against ${year} model year data`
      );

      if (decodedTrim) {
        notes.push(
          `VIN-decoded trim "${decodedTrim}" did not match known ${year} trims`
        );
      }
    } else {
      // Neither matches — low confidence
      validatedTrim = null;
      trimConfidence = "low";

      const trimList = yearTrims.join(", ");
      if (decodedTrim || userTrim) {
        const provided = decodedTrim
          ? `VIN-decoded "${decodedTrim}"`
          : `user-selected "${userTrim}"`;
        notes.push(
          `Trim may not exist for this model year — ${provided} did not match known ${year} trims: ${trimList}`
        );
      } else {
        notes.push(
          `No trim provided. Valid ${year} ${make} ${model} trims: ${trimList}`
        );
      }
    }

    return {
      decodedTrim,
      userTrim,
      validatedTrim,
      trimConfidence,
      trimValidationNotes: notes,
      isHighRiskModel: highRisk,
    };
  }

  // ── Path B: No year-specific data available ──────────────────────────

  const decodedPresent = !!decodedTrim?.trim();
  const userPresent = !!userTrim?.trim();

  if (decodedPresent && userPresent) {
    const agree =
      decodedTrim!.toLowerCase().trim() === userTrim!.toLowerCase().trim();

    if (agree) {
      // Both present and agree
      validatedTrim = decodedTrim;
      trimConfidence = "high";
      notes.push("VIN-decoded trim and user-selected trim agree");
    } else {
      // Both present but disagree — prefer decoded
      validatedTrim = decodedTrim;
      trimConfidence = "medium";
      notes.push(
        `VIN-decoded trim "${decodedTrim}" differs from user-selected "${userTrim}" — using VIN-decoded value`
      );
    }
  } else if (decodedPresent) {
    // Only decoded trim
    validatedTrim = decodedTrim;
    trimConfidence = "medium";
    notes.push(
      "Using VIN-decoded trim (no user selection to cross-reference)"
    );
  } else if (userPresent) {
    // Only user trim
    validatedTrim = userTrim;
    trimConfidence = highRisk ? "low" : "medium";
    notes.push(
      highRisk
        ? `Only user-selected trim available on a high-risk model — confidence is low without VIN verification`
        : "Using user-selected trim (no VIN decode available)"
    );
  } else {
    // Neither present
    validatedTrim = null;
    trimConfidence = "low";
    notes.push("No trim information available from VIN decode or user input");
  }

  // ── High-risk downgrade ──────────────────────────────────────────────
  // For high-risk models without year-specific validation, downgrade
  // confidence by one level (unless already "low").

  if (highRisk && trimConfidence !== "low") {
    const before = trimConfidence;
    trimConfidence = downgradeConfidence(trimConfidence);
    notes.push(
      `Confidence downgraded from ${before} to ${trimConfidence} — ${make} ${model} is a high-risk model for trim variation across years`
    );
  }

  return {
    decodedTrim,
    userTrim,
    validatedTrim,
    trimConfidence,
    trimValidationNotes: notes,
    isHighRiskModel: highRisk,
  };
}
