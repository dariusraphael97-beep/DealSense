/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DealSense — Layered Valuation & Scoring Engine
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Architecture (PART 1–9 refactor):
 *
 *   Layer A: Base vehicle value (year/make/model/trim/mileage/region → range)
 *   Layer B: Configuration adjustment (VIN-decoded options affect the range)
 *   Layer C: Vehicle category sensitivity (luxury/performance get wider ranges)
 *   Layer D: Mileage adjustment (class-aware, less dominant on premium cars)
 *   Layer E: Confidence scoring (how much to trust the estimate)
 *   Layer F: Verdict logic (context-aware, softer when confidence is low)
 *
 * Exported functions (modular, as specified in PART 6):
 *   1. determineVehicleCategory()
 *   2. getBaseFairValueRange()        — replaces old estimateFairValue
 *   3. getConfigurationAdjustment()   — new: option-driven value delta
 *   4. calculateConfidenceScore()     — new: 0–100 + level + breakdown
 *   5. generateVerdict()              — new: 6 possible verdicts
 *   6. generateInsights()             — new: key insights array
 *   7. scoreCarDeal()                 — orchestrator, uses all of the above
 *   8. estimateMonthlyPayment()       — unchanged
 *
 * PRODUCT RULE (PART 9): This engine does NOT pretend to be 100% exact.
 * It aims to be trustworthy, directionally smart, and transparent about
 * uncertainty — especially on luxury/performance/exotic vehicles.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type {
  CarInput,
  ScoreResult,
  PriceRange,
  Verdict,
  VehicleCategory,
  ConfidenceLevel,
  ConfidenceBreakdown,
  CompMetadata,
} from "./types";
import { getModelMSRP, getTrimMultiplier } from "./carData";
import { getDepreciationProfile, retentionAtYear, getGeoMultiplier } from "./depreciation";
import { validateTrim, type TrimValidation } from "./trimValidation";


/* ═══════════════════════════════════════════════════════════════════════════
 * MSRP LOOKUP TABLES (unchanged from original — curated vehicle MSRPs)
 * ═══════════════════════════════════════════════════════════════════════════ */

const MODEL_BASE: Record<string, number> = {
  // ── Toyota ──────────────────────────────────────────────────────────────
  "toyota|camry":              28000,
  "toyota|camry hybrid":       32000,
  "toyota|camry trd":          33000,
  "toyota|corolla":            23000,
  "toyota|corolla hybrid":     26000,
  "toyota|corolla gr":         31000,
  "toyota|gr corolla":         38000,
  "toyota|rav4":               32000,  // XLE/Adventure are the volume sellers (~$32k), not base LE
  "toyota|rav4 le":            30000,
  "toyota|rav4 xle":           33000,
  "toyota|rav4 adventure":     35000,
  "toyota|rav4 trd off-road":  38000,
  "toyota|rav4 limited":       40000,
  "toyota|rav4 hybrid":        36000,
  "toyota|rav4 prime":         44000,
  "toyota|highlander":         40000,
  "toyota|highlander hybrid":  47000,
  "toyota|4runner":            44000,  // SR5 Premium/TRD Off-Road are volume sellers (~$44k), not base SR5
  "toyota|4runner sr5":        40000,
  "toyota|4runner trd off-road": 46000,
  "toyota|4runner trd pro":    56000,
  "toyota|tacoma":             38000,  // TRD Off-Road/Sport are the volume sellers, not base SR
  "toyota|tacoma trd pro":     52000,
  "toyota|tacoma trailhunter": 60000,
  "toyota|tundra":             48000,  // median trim (Limited range) — was 42k (base SR)
  "toyota|tundra sr":          40000,
  "toyota|tundra sr5":         42000,
  "toyota|tundra limited":     52000,
  "toyota|tundra platinum":    58000,
  "toyota|tundra 1794":        58000,
  "toyota|tundra trd pro":     62000,
  "toyota|tundra capstone":    68000,
  "toyota|sequoia":            56000,
  "toyota|sequoia trd pro":    72000,
  "toyota|sequoia capstone":   80000,
  "toyota|sienna":             36000,
  "toyota|venza":              34000,
  "toyota|prius":              28000,
  "toyota|chr":                24000,
  "toyota|gr86":               29000,
  "toyota|gr supra":           56000,
  "toyota|supra":              56000,
  "toyota|land cruiser":       90000,
  "toyota|mirai":              50000,

  // ── Honda ───────────────────────────────────────────────────────────────
  "honda|civic":               24000,
  "honda|civic si":            28000,
  "honda|civic type r":        44000,
  "honda|accord":              28000,
  "honda|accord hybrid":       31000,
  "honda|cr-v":                30000,
  "honda|cr-v lx":             30000,
  "honda|cr-v ex":             33000,
  "honda|cr-v ex-l":           35000,
  "honda|cr-v sport":          34000,
  "honda|cr-v touring":        38000,
  "honda|cr-v hybrid":         35000,
  "honda|cr-v hybrid sport":   36000,
  "honda|cr-v hybrid sport touring": 40000,
  "honda|hrv":                 24000,
  "honda|pilot":               38000,
  "honda|odyssey":             36000,
  "honda|ridgeline":           38000,
  "honda|passport":            37000,
  "honda|fit":                 20000,
  "honda|insight":             26000,
  "honda|integra":             31000,
  "honda|integra type s":      51000,

  // ── Ford ────────────────────────────────────────────────────────────────
  "ford|f-150":                50000,  // median trim (Lariat range) — was 42k (base XL)
  "ford|f-150 xl":             38000,
  "ford|f-150 xlt":            44000,
  "ford|f-150 stx":            42000,
  "ford|f-150 lariat":         52000,
  "ford|f-150 king ranch":     62000,
  "ford|f-150 platinum":       65000,
  "ford|f-150 limited":        70000,
  "ford|f-150 tremor":         58000,
  "ford|f-150 raptor":         60000,
  "ford|f-150 raptor r":       88000,
  "ford|f-250":                48000,
  "ford|f-350":                52000,
  "ford|escape":               28000,
  "ford|explorer":             42000,  // XLT/Limited are volume sellers, not base
  "ford|explorer xlt":         42000,
  "ford|explorer limited":     50000,
  "ford|explorer st":          56000,
  "ford|explorer platinum":    58000,
  "ford|edge":                 36000,
  "ford|bronco":               38000,
  "ford|bronco raptor":        70000,
  "ford|bronco sport":         30000,
  "ford|mustang":              32000,
  "ford|mustang gt":           42000,
  "ford|mustang gt350":        62000,
  "ford|mustang gt500":        76000,
  "ford|mustang shelby gt500": 76000,
  "ford|mustang mach 1":       55000,
  "ford|mustang dark horse":   58000,
  "ford|mustang mach-e":       48000,
  "ford|maverick":             24000,
  "ford|ranger":               30000,
  "ford|ranger raptor":        52000,
  "ford|expedition":           55000,

  // ── Chevrolet ───────────────────────────────────────────────────────────
  "chevrolet|silverado 1500":             48000,  // median trim (RST/LT range) — was 42k (base WT)
  "chevrolet|silverado":                 48000,
  "chevrolet|silverado 1500 wt":         38000,
  "chevrolet|silverado 1500 custom":     40000,
  "chevrolet|silverado 1500 lt":         44000,
  "chevrolet|silverado 1500 rst":        47000,
  "chevrolet|silverado 1500 ltz":        52000,
  "chevrolet|silverado 1500 trail boss": 50000,
  "chevrolet|silverado 1500 zr2":        62000,
  "chevrolet|silverado 1500 high country": 62000,
  "chevrolet|silverado zr2":             62000,
  "chevrolet|silverado high country":    62000,
  "chevrolet|silverado trail boss":      50000,
  "chevrolet|equinox":         28000,
  "chevrolet|equinox ls":      28500,
  "chevrolet|equinox lt":      31000,
  "chevrolet|equinox rs":      33500,
  "chevrolet|equinox premier": 34500,
  "chevrolet|equinox ev":      35000,
  "chevrolet|trax":            22000,
  "chevrolet|traverse":        36000,
  "chevrolet|tahoe":           55000,
  "chevrolet|tahoe rst":       65000,
  "chevrolet|suburban":        60000,
  "chevrolet|colorado":        30000,
  "chevrolet|colorado zr2":    48000,
  "chevrolet|malibu":          24000,
  "chevrolet|blazer":          34000,
  "chevrolet|bolt ev":         28000,
  "chevrolet|camaro":          30000,
  "chevrolet|camaro ss":       42000,
  "chevrolet|camaro zl1":      70000,
  "chevrolet|camaro zl1 1le":  76000,
  "chevrolet|corvette":        68000,
  "chevrolet|corvette stingray":68000,
  "chevrolet|corvette z06":    110000,
  "chevrolet|corvette zr1":    145000,
  "chevrolet|corvette e-ray":  104000,

  // ── GMC ─────────────────────────────────────────────────────────────────
  "gmc|sierra 1500":                55000,  // median trim (SLT/AT4 range) — was 44k (base Pro)
  "gmc|sierra":                     55000,
  "gmc|sierra 1500 pro":            40000,
  "gmc|sierra 1500 sle":            46000,
  "gmc|sierra 1500 elevation":      49000,
  "gmc|sierra 1500 slt":            53000,
  "gmc|sierra 1500 at4":            58000,
  "gmc|sierra 1500 at4x":           72000,
  "gmc|sierra 1500 at4x aev":       78000,
  "gmc|sierra 1500 denali":         63000,
  "gmc|sierra 1500 denali ultimate": 80000,
  "gmc|sierra denali":              63000,
  "gmc|sierra denali ultimate":     80000,
  "gmc|sierra at4":                 58000,
  "gmc|sierra at4x":                72000,
  "gmc|terrain":      30000,
  "gmc|acadia":       38000,
  "gmc|yukon":        57000,
  "gmc|yukon xl":     62000,
  "gmc|canyon":       32000,
  "gmc|canyon at4x":  50000,

  // ── RAM ─────────────────────────────────────────────────────────────────
  "ram|1500":                      52000,  // median trim (Laramie range) — was 46k (base Tradesman)
  "ram|1500 tradesman":            38000,
  "ram|1500 big horn":             42000,
  "ram|1500 lone star":            42000,
  "ram|1500 laramie":              52000,
  "ram|1500 rebel":                52000,
  "ram|1500 limited":              60000,
  "ram|1500 limited longhorn":     62000,
  "ram|1500 longhorn":             62000,
  "ram|1500 tungsten":             68000,
  "ram|1500 trx":                  90000,
  "ram|1500 rev":                  58000,
  "ram|2500":          52000,
  "ram|3500":          58000,
  "ram|promaster":     38000,

  // ── Jeep ────────────────────────────────────────────────────────────────
  "jeep|grand cherokee":         42000,
  "jeep|grand cherokee trackhawk":92000,
  "jeep|grand cherokee 4xe":     62000,
  "jeep|cherokee":               32000,
  "jeep|wrangler":               38000,
  "jeep|wrangler rubicon 392":   60000,
  "jeep|gladiator":              42000,
  "jeep|gladiator mojave":       48000,
  "jeep|compass":                28000,
  "jeep|renegade":               25000,

  // ── Nissan ──────────────────────────────────────────────────────────────
  "nissan|rogue":       30000,
  "nissan|altima":      26000,
  "nissan|sentra":      22000,
  "nissan|murano":      34000,
  "nissan|pathfinder":  38000,
  "nissan|frontier":    32000,
  "nissan|frontier pro-4x": 42000,
  "nissan|titan":       42000,
  "nissan|armada":      52000,
  "nissan|leaf":        28000,
  "nissan|kicks":       22000,
  "nissan|maxima":      37000,
  "nissan|z":           41000,
  "nissan|z nismo":     52000,
  "nissan|gt-r":        115000,
  "nissan|gt-r nismo":  210000,
  "nissan|370z":        32000,

  // ── Hyundai ─────────────────────────────────────────────────────────────
  "hyundai|elantra":    22000,
  "hyundai|elantra n":  33000,
  "hyundai|sonata":     26000,
  "hyundai|sonata n line": 30000,
  "hyundai|tucson":     30000,  // SEL is the volume seller (~$30k), not base SE
  "hyundai|tucson se":  28500,
  "hyundai|tucson xrt": 33000,
  "hyundai|tucson plug-in hybrid": 40000,
  "hyundai|tucson sel": 32000,
  "hyundai|tucson limited": 38000,
  "hyundai|tucson n line": 34000,
  "hyundai|santa fe":   32000,
  "hyundai|palisade":   36000,
  "hyundai|kona":       24000,
  "hyundai|kona n":     34000,
  "hyundai|ioniq 5":    42000,
  "hyundai|ioniq 5 n":  67000,
  "hyundai|ioniq 6":    40000,
  "hyundai|genesis":    36000,
  "hyundai|veloster n": 34000,

  // ── Kia ─────────────────────────────────────────────────────────────────
  "kia|sportage":    27000,
  "kia|sportage lx": 27000,
  "kia|sportage ex": 29000,
  "kia|sportage sx": 33000,
  "kia|sportage x-line": 32000,
  "kia|sportage x-pro": 35000,
  "kia|sportage hybrid": 30000,
  "kia|sportage plug-in hybrid": 38000,
  "kia|sorento":     33000,  // EX/SX are more common than base LX
  "kia|sorento ex":  36000,
  "kia|sorento sx":  40000,
  "kia|telluride":   40000,  // EX ($41.7k) is the volume seller, not base LX ($35.5k)
  "kia|telluride ex": 42000,
  "kia|telluride sx": 47000,
  "kia|telluride sx prestige": 51000,
  "kia|telluride sxp": 51000,
  "kia|forte":       20000,
  "kia|k5":          25000,
  "kia|k5 gt":       32000,
  "kia|soul":        21000,
  "kia|seltos":      24000,
  "kia|carnival":    34000,
  "kia|ev6":         42000,
  "kia|ev6 gt":      62000,
  "kia|stinger":     38000,
  "kia|stinger gt":  44000,

  // ── Subaru ──────────────────────────────────────────────────────────────
  "subaru|outback":           30000,
  "subaru|outback wilderness": 38000,
  "subaru|forester":          28000,
  "subaru|forester wilderness":36000,
  "subaru|crosstrek":         26000,
  "subaru|crosstrek wilderness":34000,
  "subaru|impreza":           22000,
  "subaru|legacy":            24000,
  "subaru|ascent":            36000,
  "subaru|wrx":               30000,
  "subaru|wrx sti":           36000,
  "subaru|brz":               29000,
  "subaru|solterra":          44000,

  // ── Mazda ───────────────────────────────────────────────────────────────
  "mazda|cx-5":        30000,
  "mazda|cx-50":       32000,
  "mazda|cx-9":        38000,
  "mazda|cx-90":       44000,
  "mazda|cx-30":       26000,
  "mazda|mazda3":      24000,
  "mazda|mazda6":      26000,
  "mazda|mx-5 miata":  30000,
  "mazda|mx-30":       34000,

  // ── Volkswagen ──────────────────────────────────────────────────────────
  "volkswagen|jetta":     22000,
  "volkswagen|jetta gli": 32000,
  "volkswagen|passat":    26000,
  "volkswagen|tiguan":    30000,
  "volkswagen|atlas":     38000,
  "volkswagen|atlas cross sport": 38000,
  "volkswagen|golf":      25000,
  "volkswagen|golf gti":  32000,
  "volkswagen|golf r":    45000,
  "volkswagen|id.4":      42000,
  "volkswagen|taos":      26000,
  "volkswagen|arteon":    40000,

  // ── BMW ─────────────────────────────────────────────────────────────────
  "bmw|2 series":               38000,
  "bmw|3 series":               46000,
  "bmw|4 series":               50000,
  "bmw|5 series":               56000,
  "bmw|7 series":               92000,
  "bmw|8 series":               86000,
  "bmw|x1":                     38000,
  "bmw|x2":                     40000,
  "bmw|x3":                     47000,
  "bmw|x4":                     52000,
  "bmw|x5":                     62000,
  "bmw|x6":                     68000,
  "bmw|x7":                     78000,
  "bmw|z4":                     52000,
  "bmw|m2":                     65000,
  "bmw|m2 competition":         68000,
  "bmw|m3":                     82000,
  "bmw|m3 competition":         86000,
  "bmw|m3 competition xdrive":  88000,
  "bmw|m3 cs":                  112000,
  "bmw|m4":                     78000,
  "bmw|m4 competition":         82000,
  "bmw|m4 cs":                  100000,
  "bmw|m4 csl":                 140000,
  "bmw|m5":                     120000,
  "bmw|m5 competition":         128000,
  "bmw|m5 cs":                  142000,
  "bmw|m6":                     105000,
  "bmw|m8":                     130000,
  "bmw|m8 competition":         138000,
  "bmw|x3 m":                   72000,
  "bmw|x3 m competition":       78000,
  "bmw|x4 m":                   76000,
  "bmw|x4 m competition":       80000,
  "bmw|x5 m":                   106000,
  "bmw|x5 m competition":       112000,
  "bmw|x6 m":                   110000,
  "bmw|x6 m competition":       118000,
  "bmw|3 series m3":            82000,
  "bmw|3 series m3 competition":86000,
  "bmw|3 series m3 cs":         112000,
  "bmw|4 series m4 competition":82000,
  "bmw|4 series m4 cs":         100000,
  "bmw|5 series m5":            108000,
  "bmw|5 series m5 competition":116000,
  "bmw|x3 x3 m competition":   78000,
  "bmw|x5 x5 m competition":   112000,

  // ── Mercedes-Benz ───────────────────────────────────────────────────────
  "mercedes-benz|a-class":      36000,
  "mercedes-benz|cla":          38000,
  "mercedes-benz|glb":          40000,
  "mercedes-benz|c-class":      46000,
  "mercedes-benz|glc":          48000,
  "mercedes-benz|e-class":      58000,
  "mercedes-benz|gle":          62000,
  "mercedes-benz|gls":          92000,
  "mercedes-benz|s-class":      114000,
  "mercedes-benz|g-class":      140000,
  "mercedes-benz|eqb":          55000,
  "mercedes-benz|eqe":          75000,
  "mercedes-benz|eqs":          105000,
  "mercedes-benz|sl":           95000,
  "mercedes-benz|amg a 45":     56000,
  "mercedes-benz|amg cla 45":   58000,
  "mercedes-benz|amg c 43":     58000,
  "mercedes-benz|amg c 63":     80000,
  "mercedes-benz|amg c 63 s":   88000,
  "mercedes-benz|amg e 53":     80000,
  "mercedes-benz|amg e 63":     110000,
  "mercedes-benz|amg e 63 s":   118000,
  "mercedes-benz|amg s 63":     170000,
  "mercedes-benz|amg g 63":     180000,
  "mercedes-benz|amg glc 43":   65000,
  "mercedes-benz|amg glc 63":   90000,
  "mercedes-benz|amg gle 53":   86000,
  "mercedes-benz|amg gle 63":   120000,
  "mercedes-benz|amg gle 63 s": 130000,
  "mercedes-benz|amg gt":       140000,
  "mercedes-benz|amg gt 43":    68000,
  "mercedes-benz|amg gt 53":    78000,
  "mercedes-benz|amg sl 43":    100000,
  "mercedes-benz|amg sl 55":    140000,
  "mercedes-benz|amg sl 63":    175000,
  "mercedes-benz|maybach s-class": 200000,
  "mercedes-benz|maybach gls": 175000,
  "mercedes-benz|c-class amg c 63":  80000,
  "mercedes-benz|e-class amg e 63":  110000,
  "mercedes-benz|s-class amg s 63":  170000,
  "mercedes-benz|g-class amg g 63":  180000,
  "mercedes-benz|glc amg glc 63":    90000,
  "mercedes-benz|gle amg gle 63":    120000,

  // ── Audi ────────────────────────────────────────────────────────────────
  "audi|a3":          36000,
  "audi|a4":          42000,
  "audi|a5":          46000,
  "audi|a6":          56000,
  "audi|a7":          70000,
  "audi|a8":          90000,
  "audi|q3":          36000,
  "audi|q4 e-tron":   46000,
  "audi|q5":          46000,
  "audi|q7":          58000,
  "audi|q8":          70000,
  "audi|e-tron":      68000,
  "audi|e-tron gt":   110000,
  "audi|tt":          50000,
  "audi|r8":          170000,
  "audi|s3":          46000,
  "audi|s4":          54000,
  "audi|s5":          58000,
  "audi|s6":          80000,
  "audi|s7":          90000,
  "audi|s8":          110000,
  "audi|sq5":         56000,
  "audi|sq7":         80000,
  "audi|sq8":         90000,
  "audi|rs3":         60000,
  "audi|rs5":         74000,
  "audi|rs6":         118000,
  "audi|rs7":         116000,
  "audi|rs q8":       120000,
  "audi|rs e-tron gt":150000,

  // ── Lexus ───────────────────────────────────────────────────────────────
  "lexus|ux":     34000,
  "lexus|nx":     40000,
  "lexus|es":     42000,
  "lexus|is":     40000,
  "lexus|is 500": 58000,
  "lexus|rx":     48000,
  "lexus|gx":     56000,
  "lexus|gx 550": 62000,
  "lexus|lx":     90000,
  "lexus|lc 500": 100000,
  "lexus|lc 500h":100000,
  "lexus|rc":     44000,
  "lexus|rc f":   66000,
  "lexus|gs f":   86000,
  "lexus|ls":     80000,
  "lexus|ls 500": 80000,
  "lexus|ls 500h":85000,

  // ── Acura ───────────────────────────────────────────────────────────────
  "acura|ilx":        28000,
  "acura|tlx":        40000,
  "acura|tlx type s": 55000,
  "acura|rdx":        42000,
  "acura|mdx":        48000,
  "acura|mdx type s": 58000,
  "acura|integra":    31000,
  "acura|integra type s": 51000,
  "acura|nsx":        160000,
  "acura|nsx type s": 170000,

  // ── Tesla ───────────────────────────────────────────────────────────────
  "tesla|model 3":          44000,
  "tesla|model 3 performance":56000,
  "tesla|model y":          50000,
  "tesla|model y performance":60000,
  "tesla|model s":          90000,
  "tesla|model s plaid":    110000,
  "tesla|model x":          98000,
  "tesla|model x plaid":    118000,
  "tesla|cybertruck":       80000,

  // ── Dodge ───────────────────────────────────────────────────────────────
  "dodge|charger":                   38000,
  "dodge|charger scat pack":         47000,
  "dodge|charger srt 392":           47000,
  "dodge|charger srt hellcat":       72000,
  "dodge|charger srt hellcat redeye":80000,
  "dodge|challenger":                36000,
  "dodge|challenger scat pack":      43000,
  "dodge|challenger srt 392":        43000,
  "dodge|challenger srt hellcat":    66000,
  "dodge|challenger srt hellcat redeye":74000,
  "dodge|challenger srt demon":      86000,
  "dodge|challenger srt demon 170":  100000,
  "dodge|durango":                   40000,
  "dodge|durango srt 392":           68000,
  "dodge|durango srt hellcat":       90000,
  "dodge|grand caravan":             28000,

  // ── Buick ───────────────────────────────────────────────────────────────
  "buick|encore":    26000,
  "buick|encore gx": 30000,
  "buick|envision":  34000,
  "buick|enclave":   42000,

  // ── Cadillac ────────────────────────────────────────────────────────────
  "cadillac|xt4":              38000,
  "cadillac|xt5":              44000,
  "cadillac|xt6":              50000,
  "cadillac|escalade":         80000,
  "cadillac|escalade esv":     84000,
  "cadillac|escalade platinum":100000,
  "cadillac|escalade v":       150000,
  "cadillac|ct4":              38000,
  "cadillac|ct4-v":            52000,
  "cadillac|ct4-v blackwing":  62000,
  "cadillac|ct5":              42000,
  "cadillac|ct5-v":            60000,
  "cadillac|ct5-v blackwing":  90000,
  "cadillac|lyriq":            60000,

  // ── Lincoln ─────────────────────────────────────────────────────────────
  "lincoln|corsair":   40000,
  "lincoln|nautilus":  46000,
  "lincoln|aviator":   54000,
  "lincoln|navigator": 78000,
  "lincoln|navigator black label": 100000,

  // ── Volvo ───────────────────────────────────────────────────────────────
  "volvo|xc40":     42000,
  "volvo|xc60":     48000,
  "volvo|xc60 t8":  60000,
  "volvo|xc90":     58000,
  "volvo|xc90 t8":  70000,
  "volvo|s60":      40000,
  "volvo|v60":      42000,
  "volvo|s60 recharge": 50000,
  "volvo|ex90":     80000,

  // ── Genesis ─────────────────────────────────────────────────────────────
  "genesis|g70":    38000,
  "genesis|g70 380t": 47000,
  "genesis|g80":    50000,
  "genesis|g90":    82000,
  "genesis|gv70":   44000,
  "genesis|gv70 sport": 52000,
  "genesis|gv80":   56000,
  "genesis|gv80 prestige": 68000,

  // ── Infiniti ────────────────────────────────────────────────────────────
  "infiniti|q50":        42000,
  "infiniti|q50 red sport": 52000,
  "infiniti|q60":        46000,
  "infiniti|q60 red sport": 55000,
  "infiniti|qx50":       38000,
  "infiniti|qx55":       52000,
  "infiniti|qx60":       48000,
  "infiniti|qx80":       70000,

  // ── Porsche ─────────────────────────────────────────────────────────────
  "porsche|macan":        60000,
  "porsche|macan gts":    80000,
  "porsche|macan turbo":  90000,
  "porsche|cayenne":      70000,
  "porsche|cayenne gts":  100000,
  "porsche|cayenne turbo":120000,
  "porsche|cayenne turbo gt": 185000,
  "porsche|panamera":     90000,
  "porsche|panamera gts": 120000,
  "porsche|panamera turbo":140000,
  "porsche|panamera turbo s e-hybrid": 190000,
  "porsche|taycan":       90000,
  "porsche|taycan gts":   135000,
  "porsche|taycan turbo": 155000,
  "porsche|taycan turbo s": 190000,
  "porsche|718 boxster":  65000,
  "porsche|718 cayman":   65000,
  "porsche|718 cayman gt4": 100000,
  "porsche|718 boxster spyder": 100000,
  "porsche|boxster":      65000,
  "porsche|cayman":       65000,
  "porsche|cayman gt4":   100000,
  "porsche|911":          115000,
  "porsche|911 carrera":  115000,
  "porsche|911 carrera s":130000,
  "porsche|911 carrera 4s":140000,
  "porsche|911 targa":    120000,
  "porsche|911 targa 4s": 140000,
  "porsche|911 turbo":    185000,
  "porsche|911 turbo s":  215000,
  "porsche|911 gt3":      175000,
  "porsche|911 gt3 rs":   225000,
  "porsche|911 gt3 touring": 175000,

  // ── Land Rover ──────────────────────────────────────────────────────────
  "land rover|defender 90":      58000,
  "land rover|defender 110":     65000,
  "land rover|defender":         58000,
  "land rover|discovery":        58000,
  "land rover|discovery sport":  44000,
  "land rover|range rover sport":80000,
  "land rover|range rover sport svr": 130000,
  "land rover|range rover":      105000,
  "land rover|range rover hse":  115000,
  "land rover|range rover autobiography": 175000,
  "land rover|range rover sv":   190000,

  // ── Jaguar ──────────────────────────────────────────────────────────────
  "jaguar|xe":        40000,
  "jaguar|xf":        50000,
  "jaguar|xj":        80000,
  "jaguar|f-type":    70000,
  "jaguar|f-type r":  110000,
  "jaguar|f-pace":    52000,
  "jaguar|f-pace svr":86000,
  "jaguar|e-pace":    42000,
  "jaguar|i-pace":    72000,

  // ── Alfa Romeo ──────────────────────────────────────────────────────────
  "alfa romeo|giulia":              44000,
  "alfa romeo|giulia quadrifoglio": 80000,
  "alfa romeo|stelvio":             46000,
  "alfa romeo|stelvio quadrifoglio":82000,
  "alfa romeo|4c":                  57000,
  "alfa romeo|4c spider":           68000,
  "alfa romeo|tonale":              40000,

  // ── Maserati ────────────────────────────────────────────────────────────
  "maserati|ghibli":   76000,
  "maserati|levante":  86000,
  "maserati|quattroporte": 110000,
  "maserati|granturismo": 180000,
  "maserati|grecale":  66000,
  "maserati|mc20":     220000,

  // ── Ferrari ─────────────────────────────────────────────────────────────
  "ferrari|roma":       230000,
  "ferrari|portofino":  220000,
  "ferrari|f8 tributo": 280000,
  "ferrari|sf90":       530000,
  "ferrari|488":        262000,  // base $242k, typical optioned transaction ~$262k
  "ferrari|812":        340000,
  "ferrari|purosangue": 400000,

  // ── Lamborghini ─────────────────────────────────────────────────────────
  "lamborghini|huracan":       220000,
  "lamborghini|huracan evo":   200000,
  "lamborghini|urus":          230000,
  "lamborghini|urus performante":260000,
  "lamborghini|revuelto":      500000,

  // ── McLaren ─────────────────────────────────────────────────────────────
  "mclaren|artura":   225000,
  "mclaren|720s":     300000,
  "mclaren|765lt":    358000,
  "mclaren|gt":       210000,

  // ── Bentley ─────────────────────────────────────────────────────────────
  "bentley|continental gt":  230000,
  "bentley|bentayga":        195000,
  "bentley|flying spur":     220000,

  // ── Rolls-Royce ─────────────────────────────────────────────────────────
  "rolls-royce|ghost":       340000,
  "rolls-royce|wraith":      330000,
  "rolls-royce|dawn":        350000,
  "rolls-royce|cullinan":    340000,
  "rolls-royce|spectre":     420000,
  "rolls-royce|phantom":     460000,
};

// Make-level fallbacks when model isn't in the table above
const MAKE_BASE: Record<string, number> = {
  "bmw": 55000, "mercedes-benz": 62000, "audi": 52000, "lexus": 50000,
  "acura": 44000, "infiniti": 46000, "cadillac": 54000, "lincoln": 52000,
  "volvo": 50000, "genesis": 48000, "porsche": 82000, "land rover": 72000,
  "jaguar": 60000, "toyota": 32000, "honda": 30000, "ford": 40000,
  "chevrolet": 38000, "gmc": 44000, "ram": 46000, "jeep": 38000,
  "nissan": 30000, "hyundai": 28000, "kia": 27000, "subaru": 30000,
  "mazda": 29000, "volkswagen": 31000, "dodge": 34000, "chrysler": 33000,
  "buick": 36000, "mitsubishi": 25000, "tesla": 58000,
  "ferrari": 300000, "lamborghini": 250000, "mclaren": 250000,
  "bentley": 220000, "rolls-royce": 380000, "maserati": 90000,
  "alfa romeo": 50000, "aston martin": 180000, "lotus": 100000,
  "default": 32000,
};


/* ═══════════════════════════════════════════════════════════════════════════
 * INTERNAL: MSRP LOOKUP (unchanged logic, extracted for clarity)
 * ═══════════════════════════════════════════════════════════════════════════ */

function getBasePrice(make: string, model: string, trim?: string): number {
  const m   = make.toLowerCase().trim();
  const mod = model.toLowerCase().trim().replace(/\s+/g, " ");
  const t   = trim?.toLowerCase().trim().replace(/\s+/g, " ");

  // 1. Combined "model + trim" key — most specific wins
  if (t) {
    const deduped = t.startsWith(mod) ? t : `${mod} ${t}`;
    const combinedKey = `${m}|${deduped}`;
    if (MODEL_BASE[combinedKey]) return MODEL_BASE[combinedKey];
    const rawCombined = `${m}|${mod} ${t}`;
    if (rawCombined !== combinedKey && MODEL_BASE[rawCombined]) return MODEL_BASE[rawCombined];
    const trimOnlyKey = `${m}|${t}`;
    if (trimOnlyKey !== combinedKey && MODEL_BASE[trimOnlyKey]) return MODEL_BASE[trimOnlyKey];
  }

  // 2. MODEL_BASE exact match on model name alone
  const exactKey = `${m}|${mod}`;
  if (MODEL_BASE[exactKey]) {
    const trimBakedIn = !t || mod.includes(t) || t.startsWith(mod);
    const mult = trimBakedIn ? 1.0 : getTrimMultiplier(t!);
    return Math.round(MODEL_BASE[exactKey] * mult);
  }

  // 3. carData database lookup + trim multiplier
  const carDataMSRP = getModelMSRP(make, model);
  if (carDataMSRP !== null) {
    const mult = t ? getTrimMultiplier(t) : 1.0;
    return Math.round(carDataMSRP * mult);
  }

  // 4. MODEL_BASE longest partial match
  const partials = Object.keys(MODEL_BASE).filter(
    (k) => k.startsWith(`${m}|`) && mod.startsWith(k.split("|")[1])
  );
  if (partials.length > 0) {
    const best = partials.reduce((a, b) => (a.length >= b.length ? a : b));
    const mult = t ? getTrimMultiplier(t) : 1.0;
    return Math.round(MODEL_BASE[best] * mult);
  }

  // 5. Make-level fallback
  return MAKE_BASE[m] ?? MAKE_BASE["default"];
}


/* ═══════════════════════════════════════════════════════════════════════════
 * MODULE 1: determineVehicleCategory()
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Classifies a vehicle into one of 6 category buckets. This drives:
 * - Fair value range width (wider for high-variance categories)
 * - Mileage penalty weighting (less dominant on performance cars)
 * - Confidence thresholds (lower when options are missing on luxury/performance)
 * - Verdict aggressiveness (softer on high-variance with incomplete data)
 */

// Exotic makes — always high-variance
const EXOTIC_MAKES = new Set([
  "ferrari", "lamborghini", "mclaren", "bugatti", "pagani",
  "koenigsegg", "rimac", "aston martin", "lotus",
]);

// Luxury makes — default to luxury unless model overrides to performance
const LUXURY_MAKES = new Set([
  "bentley", "rolls-royce", "maserati", "genesis",
  "lincoln", "cadillac", "infiniti",
]);

// Performance model/trim patterns (regex)
const PERFORMANCE_PATTERNS = /\b(m[2-8]|m\d+ |amg|rs\s?\d|rs\s?[eq]|type[- ]?[rs]|nismo|gt[- ]?r|gt3|gt4|zl1|z06|zr1|e-ray|hellcat|demon|srt|raptor|shelby|dark horse|blackwing|trackhawk|quadrifoglio|svr|gt500|gr corolla|gr86|gr supra|ioniq 5 n|elantra n|veloster n|kona n|k5 gt|stinger gt|ev6 gt|wrx sti|trd pro|rubicon 392|trx|competition|plaid)\b/i;

// Truck model patterns
const TRUCK_PATTERNS = /\b(f-[123]\d0|silverado|sierra|ram\s?\d|tundra|tacoma|frontier|titan|colorado|canyon|ranger|ridgeline|maverick|gladiator|colorado)\b/i;

// Luxury model patterns (on non-luxury makes — e.g. Toyota Land Cruiser, Lexus)
const LUXURY_MODEL_PATTERNS = /\b(land cruiser|lx|ls|lc|gx 550|escalade|navigator|aviator|sequoia capstone|tundra capstone|range rover|defender|discovery|g-class|s-class|7 series|8 series|x7|gls|maybach|panamera|cayenne|macan|taycan)\b/i;

export function determineVehicleCategory(
  make: string,
  model: string,
  trim?: string,
  msrp?: number
): VehicleCategory {
  const m = make.toLowerCase().trim();
  const mod = model.toLowerCase().trim();
  const t = trim?.toLowerCase().trim() ?? "";
  const combined = `${mod} ${t}`.trim();

  // Exotic makes → always exotic
  if (EXOTIC_MAKES.has(m)) return "exotic";

  // Performance patterns (checked before luxury because M5 > luxury BMW)
  if (PERFORMANCE_PATTERNS.test(mod) || PERFORMANCE_PATTERNS.test(t) || PERFORMANCE_PATTERNS.test(combined)) {
    return "performance";
  }

  // High-MSRP Porsche models = exotic, lower ones = performance
  if (m === "porsche") {
    return (msrp && msrp >= 150000) ? "exotic" : "performance";
  }

  // Luxury makes → luxury (unless already caught as performance above)
  if (LUXURY_MAKES.has(m)) return "luxury";

  // Premium makes that can be mainstream or luxury depending on model
  if (["bmw", "mercedes-benz", "audi", "lexus", "acura", "volvo", "jaguar", "alfa romeo", "land rover"].includes(m)) {
    if (LUXURY_MODEL_PATTERNS.test(mod) || LUXURY_MODEL_PATTERNS.test(combined)) return "luxury";
    return "luxury"; // Default for premium makes
  }

  // Trucks
  if (TRUCK_PATTERNS.test(mod)) {
    // High-trim trucks (Platinum, Limited, Denali, etc.) are luxury-adjacent
    if (/\b(platinum|limited|denali|high country|king ranch|capstone|1794|laramie longhorn|black label|calligraphy)\b/i.test(t)) {
      return "luxury";
    }
    return "truck";
  }

  // Economy cars (MSRP under ~$26k or specific models)
  if (msrp && msrp < 26000) return "economy";
  if (/\b(corolla|civic|sentra|forte|versa|kicks|trax|spark|fit|accent|rio|soul)\b/i.test(mod)) {
    return "economy";
  }

  return "mainstream";
}


/* ═══════════════════════════════════════════════════════════════════════════
 * MODULE 2: getBaseFairValueRange()
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Layer A: Determines base fair value RANGE using year/make/model/trim/
 * mileage/region. Replaces old estimateFairValue(). Now category-aware
 * for range width:
 *   economy/mainstream → ±7%
 *   truck              → ±9%
 *   luxury             → ±12%
 *   performance        → ±15%
 *   exotic             → ±20%
 */

// Category-specific range spread (half-width as fraction of midpoint)
const CATEGORY_SPREAD: Record<VehicleCategory, number> = {
  economy:     0.07,
  mainstream:  0.07,
  truck:       0.09,
  luxury:      0.12,
  performance: 0.15,
  exotic:      0.20,
};

export function getBaseFairValueRange(input: CarInput, category: VehicleCategory, trimValidation?: TrimValidation): PriceRange {
  const currentYear = new Date().getFullYear();
  const ageYears = Math.max(0, currentYear - input.year);

  // 1. MSRP anchor
  const baseNewPrice = getBasePrice(input.make, input.model, input.trim);

  // 2. Per-model retention curve
  const profile = getDepreciationProfile(input.make, input.model);
  const retention = retentionAtYear(profile, ageYears);
  const midBase = baseNewPrice * retention;

  // 3. Mileage adjustment — reduced weight for performance/exotic (PART 1D)
  // Floor at 6,750 (half-year baseline) so current-model-year cars don't get
  // treated as having astronomically high mileage relative to a 1-mile average.
  const avgMileage = Math.max(ageYears * 13500, 6750);
  const mileDelta = input.mileage - avgMileage;
  const mileagePenalty = profile.mileagePenaltyPer1k;

  // Performance/exotic cars: mileage still matters significantly — especially
  // for Ferraris/Lambos where a 10k-mile example commands a big premium over
  // a 50k-mile one. Using higher weights so the per-model penalty translates.
  const mileageWeight = (category === "exotic") ? 0.65
    : (category === "performance") ? 0.70
    : (category === "luxury") ? 0.80
    : 1.0;

  const mileAdj = -(mileDelta / 1000) * mileagePenalty * mileageWeight;
  const mileAdjCapped = Math.max(-midBase * 0.25, Math.min(midBase * 0.25, mileAdj));

  // 4. Geographic price adjustment
  const geoMult = getGeoMultiplier(input.zipCode);

  const midpoint = Math.max(500, Math.round(
    ((midBase + mileAdjCapped) * geoMult) / 100
  ) * 100);

  // 5. Category-aware range width
  const spread = midpoint * CATEGORY_SPREAD[category];

  // Widen range when trim confidence is weak on high-variance vehicles
  if (trimValidation && trimValidation.trimConfidence === "low") {
    const isHighVariance = category === "exotic" || category === "performance" || category === "luxury";
    if (isHighVariance) {
      // Widen by an extra 5% on each side (reduced from 8% — stacked with 15% perf spread)
      const trimSpread = midpoint * 0.05;
      return {
        low:      Math.round((midpoint - spread - trimSpread) / 100) * 100,
        high:     Math.round((midpoint + spread + trimSpread) / 100) * 100,
        midpoint,
      };
    }
  }

  return {
    low:      Math.round((midpoint - spread) / 100) * 100,
    high:     Math.round((midpoint + spread) / 100) * 100,
    midpoint,
  };
}

// Legacy alias — keep backward compatibility for any callers
export function estimateFairValue(input: CarInput): PriceRange {
  const cat = determineVehicleCategory(input.make, input.model, input.trim);
  return getBaseFairValueRange(input, cat);
}


/* ═══════════════════════════════════════════════════════════════════════════
 * MODULE 3: getConfigurationAdjustment()
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Layer B: Adjusts the baseline fair value based on VIN-decoded configuration
 * data. When option data is present, it can shift the midpoint up or down.
 * When option data is missing on a high-variance car, it widens the range
 * instead of guessing.
 *
 * Returns an adjustment object rather than mutating the range directly.
 */

interface ConfigAdjustment {
  midpointDelta: number;    // shift to apply to midpoint (positive = car is worth more)
  spreadMultiplier: number; // multiply the existing spread (>1 = widen range)
  optionDataStatus: "complete" | "partial" | "missing";
  decodedFactors: string[]; // human-readable list of what was decoded
}

export function getConfigurationAdjustment(
  input: CarInput,
  category: VehicleCategory,
  vinData?: {
    driveType?: string;
    bodyClass?: string;
    fuelType?: string;
    engineCylinders?: string;
    displacement?: string;
    trim?: string;
  }
): ConfigAdjustment {
  const factors: string[] = [];
  let midpointDelta = 0;
  let spreadMultiplier = 1.0;
  let optionDataStatus: "complete" | "partial" | "missing" = "missing";

  if (!vinData) {
    // No VIN decode data at all — widen range on high-variance vehicles
    if (category === "exotic" || category === "performance") {
      spreadMultiplier = 1.4; // 40% wider range
    } else if (category === "luxury") {
      spreadMultiplier = 1.2; // 20% wider
    }
    return { midpointDelta: 0, spreadMultiplier, optionDataStatus: "missing", decodedFactors: [] };
  }

  // Count how many fields we have data for
  const fields = [vinData.driveType, vinData.bodyClass, vinData.fuelType, vinData.engineCylinders, vinData.displacement, vinData.trim];
  const presentCount = fields.filter(Boolean).length;

  if (presentCount >= 5) optionDataStatus = "complete";
  else if (presentCount >= 2) optionDataStatus = "partial";
  else optionDataStatus = "missing";

  const basePrice = getBasePrice(input.make, input.model, input.trim);

  // ── Drivetrain adjustment ──
  if (vinData.driveType) {
    const dt = vinData.driveType.toLowerCase();
    factors.push(`Drivetrain: ${vinData.driveType}`);
    // AWD/4WD typically adds value on luxury/mainstream vehicles
    if (/\b(awd|4wd|all.wheel|4x4|xdrive|quattro|4matic|sh-awd)\b/i.test(dt)) {
      midpointDelta += basePrice * 0.02; // ~2% premium for AWD
    }
  }

  // ── Engine/powertrain adjustment ──
  if (vinData.engineCylinders || vinData.displacement) {
    const cylStr = vinData.engineCylinders ?? "";
    const dispStr = vinData.displacement ?? "";
    factors.push(`Engine: ${[cylStr ? `${cylStr}cyl` : "", dispStr ? `${dispStr}L` : ""].filter(Boolean).join(" ")}`);

    // Higher cylinder count on performance cars = more value
    const cylCount = parseInt(cylStr, 10);
    if (category === "performance" || category === "exotic") {
      if (cylCount >= 8) midpointDelta += basePrice * 0.03;
      else if (cylCount >= 6) midpointDelta += basePrice * 0.01;
    }
  }

  // ── Body style adjustment ──
  if (vinData.bodyClass) {
    factors.push(`Body: ${vinData.bodyClass}`);
    const body = vinData.bodyClass.toLowerCase();
    // Convertibles typically command a premium
    if (/\b(convert|cabriolet|roadster|spider|spyder|targa)\b/.test(body)) {
      midpointDelta += basePrice * 0.04;
    }
  }

  // ── Fuel type ──
  if (vinData.fuelType) {
    factors.push(`Fuel: ${vinData.fuelType}`);
  }

  // ── If option data is still partial on a high-variance car, widen range ──
  if (optionDataStatus === "partial") {
    if (category === "exotic" || category === "performance") {
      spreadMultiplier = 1.25;
    } else if (category === "luxury") {
      spreadMultiplier = 1.15;
    }
  }

  return { midpointDelta, spreadMultiplier, optionDataStatus, decodedFactors: factors };
}


/* ═══════════════════════════════════════════════════════════════════════════
 * MODULE 4: calculateConfidenceScore()
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PART 2: Confidence system. Every analysis gets a 0–100 score and a
 * High/Medium/Low level. Based on data completeness, not opinion.
 *
 * Scoring rubric:
 *   +25 VIN decoded successfully
 *   +20 Trim verified (not just base model guess)
 *   +20 Option/package data present
 *   +20 Market data is transaction-level (not just model averages)
 *   +10 Region-specific data available
 *   +5  Vehicle is low-variance category (economy/mainstream)
 *
 * Penalties:
 *   -15 High-variance car with incomplete option data
 *   -10 Using statistical model as primary source
 *   -5  Very old vehicle (>12 years — less comp data available)
 */

export function calculateConfidenceScore(
  input: CarInput,
  category: VehicleCategory,
  optionDataStatus: "complete" | "partial" | "missing",
  priceSource: string,
  vinDecoded: boolean,
  trimVerified: boolean,
  trimValidation?: TrimValidation,
  compMetadata?: CompMetadata
): { confidenceScore: number; confidenceLevel: ConfidenceLevel; breakdown: ConfidenceBreakdown } {
  let score = 0;

  // ── Positive signals ──
  if (vinDecoded) score += 25;
  // Trim confidence (replaces simple trimVerified boolean)
  if (trimValidation) {
    if (trimValidation.trimConfidence === "high") score += 20;
    else if (trimValidation.trimConfidence === "medium") score += 10;
    else score += 0; // low confidence = no trim bonus
  } else if (trimVerified) {
    score += 15; // Legacy path: trim provided but not validated
  }

  if (optionDataStatus === "complete") score += 20;
  else if (optionDataStatus === "partial") score += 10;

  // Market data specificity
  const isTransaction = /vinaudit/i.test(priceSource);
  const isListings = /auto\.dev|marketcheck|listing/i.test(priceSource);
  const isStatistical = /statistical|depreciation/i.test(priceSource);

  let marketDataSpecificity: ConfidenceBreakdown["marketDataSpecificity"] = "statistical";
  if (isTransaction) { score += 20; marketDataSpecificity = "transaction"; }
  else if (isListings) { score += 14; marketDataSpecificity = "listings"; }
  else if (isStatistical) { score += 5; marketDataSpecificity = "statistical"; }
  else { score += 10; marketDataSpecificity = "broad_model"; }

  // ── Comp quality adjustment (when available) ──
  // This adjusts confidence based on HOW GOOD the comps were, not just whether
  // they exist. Strong comps with tight pricing = more trustworthy estimate.
  if (compMetadata) {
    if (compMetadata.compQuality === "strong") {
      score += 6;  // Many comps, tight spread — estimate is reliable
    } else if (compMetadata.compQuality === "moderate") {
      score += 2;  // Decent data — slight boost
    } else {
      // Weak comps — don't add, and penalize if this is the primary source
      if (isListings) score -= 3; // Primary source has weak comps
    }
  } else if (isStatistical) {
    // No comps available AND using statistical model — lower confidence
    score -= 2;
  }

  // Region data (assume available if ZIP is provided — all our APIs use it)
  const regionDataAvailable = !!input.zipCode && input.zipCode.length >= 5;
  if (regionDataAvailable) score += 10;

  // Low-variance bonus
  if (category === "economy" || category === "mainstream") score += 5;

  // ── Penalties ──
  const isHighVariance = category === "exotic" || category === "performance" || category === "luxury";
  if (isHighVariance && optionDataStatus !== "complete") {
    score -= 10; // Reduced from 15 — stacked too harshly with statistical penalty
  }
  if (isStatistical) {
    score -= 8; // Reduced from 10 — was double-penalizing (only +5 added, then -10)
  }
  const currentYear = new Date().getFullYear();
  if (currentYear - input.year > 12) {
    score -= 5;
  }

  // Floor: VIN-decoded vehicles with basic identity confirmed shouldn't go below 30
  if (vinDecoded && score < 30) {
    score = 30;
  }

  // Clamp
  score = Math.max(0, Math.min(100, score));

  // Level thresholds
  let confidenceLevel: ConfidenceLevel;
  if (score >= 65) confidenceLevel = "High";
  else if (score >= 40) confidenceLevel = "Medium";
  else confidenceLevel = "Low";

  const breakdown: ConfidenceBreakdown = {
    vinDecoded,
    trimVerified,
    optionDataStatus,
    marketDataSpecificity,
    vehicleCategory: category,
    regionDataAvailable,
    trimConfidence: trimValidation?.trimConfidence,
  };

  return { confidenceScore: score, confidenceLevel, breakdown };
}


/* ═══════════════════════════════════════════════════════════════════════════
 * MODULE 5: generateVerdict()
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PART 1E: Context-aware verdict logic. Replaces the old rigid thresholds.
 *
 * Key rules:
 * - If confidence is low, do NOT produce "Walk Away" unless the asking price
 *   is obviously far outside the fair value range (>25% over high end).
 * - If options are incomplete on a high-variance car, lean toward
 *   "Needs Option Review" instead of "Negotiate" or "Walk Away".
 * - "Fair Deal" added for prices within a tight band of midpoint.
 * - "Possibly Overpriced" is the softer version when data is uncertain.
 */

export function generateVerdict(
  score: number,
  priceDeltaPct: number,
  confidenceLevel: ConfidenceLevel,
  category: VehicleCategory,
  optionDataStatus: "complete" | "partial" | "missing"
): Verdict {
  const isHighVariance = category === "exotic" || category === "performance" || category === "luxury";
  const hasIncompleteOptions = optionDataStatus !== "complete";

  // ── High confidence — traditional thresholds with expanded verdicts ──
  if (confidenceLevel === "High") {
    if (score >= 73) return "Buy";
    if (score >= 62) return "Fair Deal";
    if (score >= 46) return "Negotiate";
    if (score >= 30) return "Possibly Overpriced";
    return "Walk Away";
  }

  // ── Medium confidence ──
  if (confidenceLevel === "Medium") {
    if (score >= 73) return "Buy";
    if (score >= 60) return "Fair Deal";
    // On high-variance cars with incomplete options, prefer "Needs Option Review"
    if (isHighVariance && hasIncompleteOptions && score >= 40) return "Needs Option Review";
    if (score >= 46) return "Negotiate";
    // Soften harsh verdicts when confidence isn't high
    if (priceDeltaPct > 0.25) return "Walk Away"; // Obviously far out → still walk away
    return "Possibly Overpriced";
  }

  // ── Low confidence — very cautious ──
  if (score >= 73) return "Buy"; // Still safe to call a strong deal
  if (score >= 58) return "Fair Deal";
  // Almost always route high-variance + incomplete options to review
  if (isHighVariance && hasIncompleteOptions) return "Needs Option Review";
  if (score >= 46) return "Needs Option Review";
  // Only produce "Walk Away" if asking price is wildly over (>30% above high end)
  if (priceDeltaPct > 0.30) return "Possibly Overpriced";
  return "Needs Option Review";
}


/* ═══════════════════════════════════════════════════════════════════════════
 * MODULE 6: generateInsights()
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PART 3: Context-aware explanations and insights. Uses careful wording
 * that respects confidence level. Never says "real market value" when
 * confidence is not high.
 */

export function generateInsights(
  input: CarInput,
  fairValue: PriceRange,
  priceDelta: number,
  priceDeltaPct: number,
  category: VehicleCategory,
  confidenceLevel: ConfidenceLevel,
  optionDataStatus: "complete" | "partial" | "missing",
  mileageRatio: number,
  ageYears: number,
  trimValidation?: TrimValidation,
  compMetadata?: CompMetadata
): { reasons: string[]; warnings: string[]; keyInsights: string[] } {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const keyInsights: string[] = [];

  const absDeltaK = (Math.abs(priceDelta) / 1000).toFixed(1);
  const isHighVariance = category === "exotic" || category === "performance" || category === "luxury";

  // ── Price position ──
  if (priceDelta > 0) {
    const pct = Math.round(priceDeltaPct * 100);
    if (confidenceLevel === "High") {
      reasons.push(`Asking price is $${absDeltaK}k (${pct}%) above the estimated fair value range midpoint of $${fairValue.midpoint.toLocaleString()}.`);
    } else {
      reasons.push(`Asking price is $${absDeltaK}k (${pct}%) above our estimated fair value midpoint of $${fairValue.midpoint.toLocaleString()}. This estimate carries ${confidenceLevel.toLowerCase()} confidence — treat as directional.`);
    }
    keyInsights.push(`Price is ${pct}% above estimated fair value`);
  } else if (priceDelta < 0) {
    const pct = Math.round(Math.abs(priceDeltaPct) * 100);
    reasons.push(`Asking price is $${absDeltaK}k (${pct}%) below the estimated fair value midpoint — potentially a strong deal.`);
    keyInsights.push(`Price is ${pct}% below estimated fair value`);
  } else {
    reasons.push(`Asking price is in line with the estimated fair value midpoint.`);
    keyInsights.push(`Price is aligned with estimated fair value`);
  }

  // ── Fair value range context ──
  reasons.push(`Estimated fair value range: $${fairValue.low.toLocaleString()} – $${fairValue.high.toLocaleString()}.`);
  keyInsights.push(`Fair value range: $${fairValue.low.toLocaleString()} – $${fairValue.high.toLocaleString()}`);

  // ── Mileage context ──
  if (mileageRatio > 1.3) {
    reasons.push(
      `Higher mileage: ${input.mileage.toLocaleString()} mi is ${Math.round((mileageRatio - 1) * 100)}% above average for a ${ageYears}-year-old vehicle. Budget for higher maintenance costs.`
    );
    keyInsights.push(`High mileage for age — plan for maintenance`);
  } else if (mileageRatio < 0.7) {
    reasons.push(
      `Low mileage: ${input.mileage.toLocaleString()} mi is well below average for its age — this adds value and suggests less wear.`
    );
    keyInsights.push(`Low mileage adds value`);
  } else {
    reasons.push(
      `Mileage is ${mileageRatio < 1 ? "slightly below" : "typical for"} average at ${input.mileage.toLocaleString()} mi on a ${ageYears}-year-old vehicle.`
    );
    keyInsights.push(`Mileage is typical for age`);
  }

  // ── Age context ──
  if (ageYears <= 3) {
    reasons.push(`${ageYears <= 1 ? "Nearly new" : `Only ${ageYears} years old`} — may still carry factory warranty or qualify for CPO certification.`);
    keyInsights.push(ageYears <= 1 ? "Nearly new — warranty likely active" : "May still have factory warranty");
  } else if (ageYears > 10) {
    reasons.push(`At ${ageYears} years old, budget for increased repair costs and consider a pre-purchase inspection.`);
    keyInsights.push(`Older vehicle — PPI recommended`);
  }

  // ── Monthly payment ──
  const loanOpts = { apr: input.loanApr, downPct: input.loanDownPct, termMonths: input.loanTermMonths };
  const monthly = estimateMonthlyPayment(input.askingPrice, loanOpts);
  const aprLabel = (input.loanApr ?? 7.5).toFixed(1);
  const downLabel = input.loanDownPct ?? 10;
  const termLabel = input.loanTermMonths ?? 60;
  reasons.push(`Estimated monthly payment: ~$${monthly}/mo (${downLabel}% down, ${aprLabel}% APR, ${termLabel} months).`);

  // ── Negotiation anchor ──
  if (priceDelta > 0 && priceDeltaPct <= 0.25) {
    if (confidenceLevel === "High") {
      reasons.push(
        `Negotiation room: comparable ${input.year} ${input.make} ${input.model}s sell for $${fairValue.low.toLocaleString()}–$${fairValue.high.toLocaleString()}. Use that as your anchor.`
      );
    } else {
      reasons.push(
        `Negotiation room: comparable ${input.year} ${input.make} ${input.model}s are estimated at $${fairValue.low.toLocaleString()}–$${fairValue.high.toLocaleString()}. Use the range as a starting point, but note this estimate has ${confidenceLevel.toLowerCase()} confidence.`
      );
    }
  }

  // ── Warnings (PART 4.3) ──
  if (isHighVariance && optionDataStatus !== "complete") {
    warnings.push("Option-level value may not be fully captured in this estimate.");
    if (category === "performance" || category === "exotic") {
      warnings.push("High-performance and luxury vehicles can vary significantly in value based on factory packages, carbon options, brakes, interior, and technology configuration.");
    }
  }

  if (optionDataStatus === "missing") {
    warnings.push("No VIN-decoded option data was available. This estimate is based on model-level averages.");
  }

  if (confidenceLevel === "Low") {
    warnings.push("This result should be treated as directional — option uncertainty may materially affect the actual fair value.");
  }

  // ── Trim validation warnings ──
  if (trimValidation) {
    if (trimValidation.trimConfidence === "low") {
      warnings.push("Trim/configuration for this model year may not be fully verified, which can affect valuation accuracy.");
      if (trimValidation.isHighRiskModel) {
        warnings.push(`${input.make} ${input.model} is a model where trims vary significantly across years — verify the exact configuration.`);
      }
    } else if (trimValidation.trimConfidence === "medium" && trimValidation.isHighRiskModel) {
      warnings.push("Trim partially verified. On this model, factory configuration can significantly affect value.");
    }

    // Add notes as key insights when relevant
    for (const note of trimValidation.trimValidationNotes) {
      if (note.includes("does not match") || note.includes("discontinued") || note.includes("may not exist")) {
        keyInsights.push(note);
      }
    }
  }

  if (isHighVariance) {
    keyInsights.push(`Vehicle category: ${category} — configuration-sensitive`);
  }

  // ── Comp-based insights (when listing data is available) ──
  if (compMetadata) {
    if (compMetadata.compQuality === "strong") {
      keyInsights.push(`Based on ${compMetadata.compCount} comparable listings`);
    } else if (compMetadata.compQuality === "moderate") {
      keyInsights.push(`Based on ${compMetadata.compCount} comparable listings (moderate match)`);
    } else {
      keyInsights.push(`Limited comparable listings found (${compMetadata.compCount})`);
      if (compMetadata.compSpreadPct > 0.40) {
        warnings.push("Comparable listing prices vary widely — treat the estimated fair value as a rough guide.");
      }
    }
  }

  return { reasons, warnings, keyInsights };
}


/* ═══════════════════════════════════════════════════════════════════════════
 * MODULE 7: estimateMonthlyPayment() — unchanged
 * ═══════════════════════════════════════════════════════════════════════════ */

export function estimateMonthlyPayment(
  price: number,
  opts?: { apr?: number; downPct?: number; termMonths?: number }
): number {
  const apr = opts?.apr ?? 7.5;
  const downPct = opts?.downPct ?? 10;
  const termMonths = opts?.termMonths ?? 60;
  const principal = price * (1 - downPct / 100);
  const monthlyRate = apr / 100 / 12;
  if (monthlyRate === 0) return Math.round(principal / termMonths);
  const payment =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1);
  return Math.round(payment);
}


/* ═══════════════════════════════════════════════════════════════════════════
 * MODULE 8: scoreCarDeal() — ORCHESTRATOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Main entry point. Chains all modules together:
 *   1. Determine vehicle category
 *   2. Get base fair value range (or use externally-provided market data)
 *   3. Apply configuration adjustments
 *   4. Calculate confidence
 *   5. Score the deal (0–100)
 *   6. Generate context-aware verdict
 *   7. Generate insights, warnings, key insights
 *
 * Accepts optional parameters for external market data and VIN decode info
 * so the API route can pass through what it knows.
 */

export function scoreCarDeal(
  input: CarInput,
  fairValue?: PriceRange,
  options?: {
    priceSource?: string;
    vinDecoded?: boolean;
    trimVerified?: boolean;
    vinData?: {
      driveType?: string;
      bodyClass?: string;
      fuelType?: string;
      engineCylinders?: string;
      displacement?: string;
      trim?: string;
    };
    compMetadata?: CompMetadata;
  }
): ScoreResult {
  const priceSource = options?.priceSource ?? "Statistical model (depreciation data)";
  const vinDecoded = options?.vinDecoded ?? !!input.vin;
  const trimVerified = options?.trimVerified ?? !!input.trim;

  // Trim validation
  const trimVal = validateTrim(
    input.year,
    input.make,
    input.model,
    options?.vinData?.trim ?? null,
    input.trim ?? null
  );

  // 1. Vehicle category
  const msrp = getBasePrice(input.make, input.model, input.trim);
  const category = determineVehicleCategory(input.make, input.model, input.trim, msrp);

  // 2. Base fair value range
  let fv = fairValue ?? getBaseFairValueRange(input, category, trimVal);

  // 2b. Asking-price sanity check — trim inference for statistical model
  //
  // When using the internal statistical model (no external market data) and no
  // trim is known, the MSRP defaults to the model's median trim. But trucks/SUVs
  // have $40k+ trim ranges. If the asking price is far above the estimated fair
  // value, it almost certainly means the vehicle is a higher trim than we guessed.
  //
  // Rather than calling it "massively overpriced," we adjust the fair value
  // upward (capped) and widen the range to reflect uncertainty. This prevents
  // false Walk Away verdicts on Denali Ultimates priced at $80k when the model
  // base is $55k.
  //
  // This ONLY fires when:
  //   - No external market data was provided (statistical model)
  //   - No trim is known (or trim confidence is low)
  //   - Asking price is >35% above fair value midpoint
  //   - Vehicle is a truck/mainstream/luxury category (not exotic — those have
  //     legitimately wild pricing)
  const isStatisticalOnly = !fairValue;
  const noTrimKnown = !input.trim || trimVal?.trimConfidence === "low";
  const askingVsFvPct = (input.askingPrice - fv.midpoint) / fv.midpoint;

  if (isStatisticalOnly && noTrimKnown && askingVsFvPct > 0.35 && category !== "exotic") {
    // Blend the fair value toward the asking price — the asking price itself is
    // market data (it's what real dealers/sellers are listing at).
    // Cap the upward adjustment at 45% above original estimate to prevent
    // blindly trusting absurd asking prices.
    const maxLift = fv.midpoint * 0.45;
    const rawLift = (input.askingPrice - fv.midpoint) * 0.55; // trust asking price 55%
    const lift = Math.min(rawLift, maxLift);

    const newMid = Math.round((fv.midpoint + lift) / 100) * 100;
    // Widen the range significantly — we're uncertain about the true trim
    const extraSpread = Math.round(newMid * 0.12 / 100) * 100;
    fv = {
      low: Math.max(fv.low, newMid - Math.round((newMid - fv.low) * 0.8 / 100) * 100 - extraSpread),
      high: newMid + Math.round((fv.high - fv.midpoint) / 100) * 100 + extraSpread,
      midpoint: newMid,
    };
  }

  // 3. Configuration adjustment
  const configAdj = getConfigurationAdjustment(input, category, options?.vinData);

  // Apply config adjustments to the range
  if (configAdj.midpointDelta !== 0 || configAdj.spreadMultiplier !== 1.0) {
    const newMid = Math.max(500, Math.round((fv.midpoint + configAdj.midpointDelta) / 100) * 100);
    const baseSpread = (fv.high - fv.low) / 2;
    const newSpread = Math.round(baseSpread * configAdj.spreadMultiplier / 100) * 100;
    fv = {
      low:      Math.max(500, newMid - newSpread),
      high:     newMid + newSpread,
      midpoint: newMid,
    };
  }

  // 4. Confidence — now includes comp quality when available
  const { confidenceScore, confidenceLevel, breakdown } = calculateConfidenceScore(
    input, category, configAdj.optionDataStatus, priceSource, vinDecoded, trimVerified, trimVal,
    options?.compMetadata
  );

  // 5. Score (0–100)
  const priceDelta    = input.askingPrice - fv.midpoint;
  const priceDeltaPct = priceDelta / fv.midpoint;

  const currentYear = new Date().getFullYear();
  const ageYears    = Math.max(0, currentYear - input.year);
  const avgMileage  = ageYears * 13500;
  // Floor at 6,750 (half-year baseline) — prevents current-model-year cars
  // from getting astronomically high mileage ratios against a near-zero average.
  const mileageRatio = input.mileage / Math.max(avgMileage, 6750);

  // ── Price vs. market (primary driver) ──
  let score = 65;
  if      (priceDeltaPct <= -0.15) score += 30;
  else if (priceDeltaPct <= -0.08) score += 20;
  else if (priceDeltaPct <= -0.03) score += 10;
  else if (priceDeltaPct <=  0.03) score +=  5;
  else if (priceDeltaPct <=  0.08) score -=  5;
  else if (priceDeltaPct <=  0.15) score -= 18;
  else if (priceDeltaPct <=  0.25) score -= 32;
  else                              score -= 45;

  // ── Mileage adjustment — category-aware weight (PART 1D) ──
  const mileageWeight = (category === "exotic") ? 0.5
    : (category === "performance") ? 0.65
    : (category === "luxury") ? 0.8
    : 1.0;

  if      (mileageRatio > 1.6)  score -= Math.round(12 * mileageWeight);
  else if (mileageRatio > 1.3)  score -= Math.round(7 * mileageWeight);
  else if (mileageRatio > 1.1)  score -= Math.round(3 * mileageWeight);
  else if (mileageRatio < 0.6)  score += Math.round(8 * mileageWeight);
  else if (mileageRatio < 0.8)  score += Math.round(4 * mileageWeight);

  // ── Age adjustment ──
  if      (ageYears > 15) score -= 8;
  else if (ageYears > 10) score -= 4;
  else if (ageYears <=  2) score += 8;
  else if (ageYears <=  4) score += 4;

  score = Math.max(0, Math.min(100, Math.round(score)));

  // 6. Verdict — confidence-aware
  const verdict = generateVerdict(score, priceDeltaPct, confidenceLevel, category, configAdj.optionDataStatus);

  // 7. Insights, reasons, warnings — now includes comp quality context
  const { reasons, warnings, keyInsights } = generateInsights(
    input, fv, priceDelta, priceDeltaPct, category,
    confidenceLevel, configAdj.optionDataStatus, mileageRatio, ageYears, trimVal,
    options?.compMetadata
  );

  // Monthly payment
  const loanOpts = {
    apr: input.loanApr,
    downPct: input.loanDownPct,
    termMonths: input.loanTermMonths,
  };
  const monthly = estimateMonthlyPayment(input.askingPrice, loanOpts);

  return {
    score,
    verdict,
    fairValueRange: fv,
    priceDelta,
    priceDeltaPct,
    monthlyPayment: monthly,
    reasons,
    confidenceLevel,
    confidenceScore,
    confidenceBreakdown: breakdown,
    vehicleCategory: category,
    optionDataStatus: configAdj.optionDataStatus,
    valuationWarnings: warnings,
    keyInsights,
    trimValidation: trimVal,
    compMetadata: options?.compMetadata,
  };
}
