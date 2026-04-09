import type { CarInput, ScoreResult, PriceRange, Verdict } from "./types";
import { getModelMSRP, getTrimMultiplier } from "./carData";
import { getDepreciationProfile, retentionAtYear, getGeoMultiplier } from "./depreciation";

/**
 * Model-level base MSRP table.
 * Keys are lowercase "make|model" pairs. Values are the original new MSRP
 * for the mid-trim variant of that model (US market, recent years).
 * Sources: manufacturer websites, Edmunds, CarGurus historical MSRP data.
 *
 * IMPORTANT: The lookup uses LONGEST-MATCH so more specific keys always win.
 * e.g. "bmw|m3 competition" beats "bmw|m3" beats "bmw|3 series".
 * Also supports "make|base-model performance-trim" combined keys so that
 * entering Model="3 Series" + Trim="M3 Competition" still gets the right anchor.
 *
 * When a make|model match is found it's used directly.
 * Otherwise we fall back to the make-level average, then the global default.
 */
const MODEL_BASE: Record<string, number> = {
  // ── Toyota ──────────────────────────────────────────────────────────────
  "toyota|camry":              28000,
  "toyota|camry hybrid":       32000,
  "toyota|camry trd":          33000,
  "toyota|corolla":            23000,
  "toyota|corolla hybrid":     26000,
  "toyota|corolla gr":         31000,
  "toyota|gr corolla":         38000,
  "toyota|rav4":               30000,
  "toyota|rav4 hybrid":        35000,
  "toyota|rav4 prime":         42000,
  "toyota|highlander":         38000,
  "toyota|highlander hybrid":  47000,
  "toyota|4runner":            40000,
  "toyota|4runner trd pro":    56000,
  "toyota|tacoma":             34000,
  "toyota|tacoma trd pro":     52000,
  "toyota|tacoma trailhunter": 60000,
  "toyota|tundra":             42000,
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
  "honda|cr-v hybrid":         35000,
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
  "ford|f-150":                42000,
  "ford|f-150 raptor":         60000,
  "ford|f-150 raptor r":       88000,
  "ford|f-150 limited":        70000,
  "ford|f-150 platinum":       65000,
  "ford|f-250":                48000,
  "ford|f-350":                52000,
  "ford|escape":               28000,
  "ford|explorer":             38000,
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
  "chevrolet|silverado 1500":  42000,
  "chevrolet|silverado":       42000,
  "chevrolet|silverado zr2":   62000,
  "chevrolet|equinox":         28000,
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
  "gmc|sierra 1500":  44000,
  "gmc|sierra":       44000,
  "gmc|terrain":      30000,
  "gmc|acadia":       38000,
  "gmc|yukon":        57000,
  "gmc|yukon xl":     62000,
  "gmc|canyon":       32000,
  "gmc|canyon at4x":  50000,

  // ── RAM ─────────────────────────────────────────────────────────────────
  "ram|1500":          46000,
  "ram|1500 trx":      90000,
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
  "hyundai|tucson":     28000,
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
  "kia|sorento":     30000,
  "kia|telluride":   36000,
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
  // M standalone models (entered as the model name)
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
  "bmw|m5":                     108000,
  "bmw|m5 competition":         116000,
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
  // Combined "base model + performance trim" keys (model=3 Series, trim=M3 Competition)
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
  // AMG standalone model names
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
  // Combined "base model + AMG trim" keys
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
  // S-line performance variants
  "audi|s3":          46000,
  "audi|s4":          54000,
  "audi|s5":          58000,
  "audi|s6":          80000,
  "audi|s7":          90000,
  "audi|s8":          110000,
  "audi|sq5":         56000,
  "audi|sq7":         80000,
  "audi|sq8":         90000,
  // RS high-performance variants
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
  "ferrari|488":        280000,
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
  "default": 32000,
};

/**
 * Lookup base new MSRP for a given make + model + optional trim.
 *
 * Priority order:
 *   1. MODEL_BASE exact match for "make|model" — curated specific-variant MSRP
 *   2. MODEL_BASE combined "make|model trim" key — catches "3 Series" + "M3 Competition" etc.
 *   3. carData database (35+ makes, broad model coverage) + trim multiplier
 *   4. MODEL_BASE longest partial match + trim multiplier
 *   5. MAKE_BASE fallback → global default
 *
 * Checking MODEL_BASE first means carefully curated performance-variant MSRPs
 * (e.g., "bmw|m3 competition" = $86k) always win over carData's base-model entry.
 */
function getBasePrice(make: string, model: string, trim?: string): number {
  const m   = make.toLowerCase().trim();
  const mod = model.toLowerCase().trim().replace(/\s+/g, " ");
  const t   = trim?.toLowerCase().trim().replace(/\s+/g, " ");

  // 1. Combined "model + trim" key checked FIRST — most specific wins.
  //    e.g. model="3 Series" trim="M3 Competition" → "bmw|3 series m3 competition" = $86k
  //    e.g. model="C-Class"  trim="AMG C 63 S"     → "mercedes-benz|c-class amg c 63 s" = $88k
  if (t) {
    const combinedKey = `${m}|${mod} ${t}`;
    if (MODEL_BASE[combinedKey]) {
      return MODEL_BASE[combinedKey]; // exact MSRP for this variant — no extra multiplier
    }
  }

  // 2. MODEL_BASE exact match on model name alone
  //    e.g. model="M3 Competition" → "bmw|m3 competition" = $86k (no extra mult needed)
  const exactKey = `${m}|${mod}`;
  if (MODEL_BASE[exactKey]) {
    // Model name already identifies the specific variant — trim mult only applies
    // when trim adds something beyond what the model key covers (rare edge case)
    const trimBakedIn = !t || mod.includes(t);
    const mult = trimBakedIn ? 1.0 : getTrimMultiplier(t!);
    return Math.round(MODEL_BASE[exactKey] * mult);
  }

  // 3. carData database lookup + trim multiplier
  //    Covers broad model catalog (35+ makes). Trim multiplier approximates variant premium.
  const carDataMSRP = getModelMSRP(make, model);
  if (carDataMSRP !== 32000) {
    const mult = t ? getTrimMultiplier(t) : 1.0;
    return Math.round(carDataMSRP * mult);
  }

  // 4. MODEL_BASE longest partial match (most-specific prefix wins)
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

/**
 * @deprecated — replaced by depreciation.ts per-model profiles.
 * Kept here only as a comment marker so git blame is readable.
 *
 * High retention: Toyota, Honda, Subaru, Mazda, trucks/4x4s
 * Low retention (<1.0): German luxury, British luxury, American sedans, EVs (non-Tesla)
 */
const MAKE_DEPRECIATION_MULTIPLIER: Record<string, number> = {
  // Excellent retention — Japanese reliable brands
  "toyota":     1.20,  // Best resale in class; Tacoma/4Runner hold exceptionally
  "honda":      1.15,
  "subaru":     1.12,
  "mazda":      1.10,
  "lexus":      1.10,  // Premium Toyota — strong resale
  "acura":      1.05,

  // Good retention — Korean brands have improved significantly
  "kia":        1.05,
  "hyundai":    1.03,
  "genesis":    0.98,  // Luxury Hyundai — still building resale rep

  // Trucks hold value very well (applies on top of make multiplier)
  // Handled separately in getDepreciationMultiplier() for model-level

  // Average retention
  "nissan":     0.98,
  "mitsubishi": 0.96,
  "chrysler":   0.95,
  "buick":      0.97,
  "gmc":        1.03,  // Trucks help GMC overall
  "ram":        1.05,  // RAM trucks hold well
  "jeep":       0.98,  // Wrangler holds; Cherokee/Compass less so

  // Below average — American sedans / FWD cars
  "ford":       0.99,  // F-150 saves the brand average
  "chevrolet":  0.98,
  "dodge":      0.93,
  "lincoln":    0.90,
  "cadillac":   0.91,

  // German luxury depreciates significantly — high MSRP, expensive repairs
  "bmw":          0.78,  // ~50% value lost by yr 5; iSeeCars data
  "mercedes-benz":0.77,
  "audi":         0.80,
  "volkswagen":   0.92,
  "porsche":      0.96,  // Exception: Porsche holds better than most luxury

  // Other European — fast depreciation
  "volvo":        0.85,
  "land rover":   0.72,  // One of the worst; Range Rover especially
  "jaguar":       0.74,
  "alfa romeo":   0.73,
  "mini":         0.88,
  "fiat":         0.82,

  // Tesla holds better than most EVs; other EVs depreciate rapidly
  "tesla":        1.05,

  // Default for unknown makes
  "default":      1.00,
};

/**
 * Model-level overrides for vehicles with notably different depreciation
 * from their brand average (e.g., Toyota 4Runner vs Corolla).
 */
const MODEL_DEPRECIATION_OVERRIDE: Record<string, number> = {
  // ── Toyota — best resale in the industry ────────────────────────────────
  "toyota|4runner":           1.45,  // Barely depreciates — legendary demand
  "toyota|4runner trd pro":   1.50,
  "toyota|tacoma":            1.40,
  "toyota|tacoma trd pro":    1.42,
  "toyota|land cruiser":      1.35,
  "toyota|tundra":            1.20,
  "toyota|tundra trd pro":    1.25,
  "toyota|sequoia":           1.18,
  "toyota|sienna":            1.15,
  "toyota|prius":             1.05,
  "toyota|gr86":              1.10,
  "toyota|gr supra":          1.12,
  "toyota|gr corolla":        1.18,

  // ── Honda ───────────────────────────────────────────────────────────────
  "honda|ridgeline":          1.10,
  "honda|odyssey":            1.08,
  "honda|pilot":              1.08,
  "honda|civic type r":       1.20,  // Type R holds exceptionally well — limited supply
  "honda|integra type s":     1.15,

  // ── Jeep ────────────────────────────────────────────────────────────────
  "jeep|wrangler":            1.25,  // Wrangler defies all depreciation norms
  "jeep|gladiator":           1.15,
  "jeep|grand cherokee trackhawk": 0.90,

  // ── Ford ────────────────────────────────────────────────────────────────
  "ford|f-150":               1.18,
  "ford|f-150 raptor":        1.25,
  "ford|f-150 raptor r":      1.20,
  "ford|bronco":              1.22,  // High demand, long wait lists
  "ford|bronco raptor":       1.20,
  "ford|maverick":            1.10,
  "ford|mustang gt500":       1.05,
  "ford|mustang shelby gt500":1.05,
  "ford|mustang dark horse":  1.08,

  // ── Chevrolet ───────────────────────────────────────────────────────────
  "chevrolet|silverado":      1.15,
  "chevrolet|silverado 1500": 1.15,
  "chevrolet|corvette":       1.05,
  "chevrolet|corvette stingray": 1.05,
  "chevrolet|corvette z06":   1.08,  // Z06 holds very well
  "chevrolet|corvette zr1":   1.10,  // ZR1 is collectible
  "chevrolet|tahoe":          1.10,
  "chevrolet|suburban":       1.12,
  "chevrolet|camaro zl1":     0.98,

  // ── GMC ─────────────────────────────────────────────────────────────────
  "gmc|sierra":               1.15,
  "gmc|sierra 1500":          1.15,
  "gmc|yukon":                1.10,

  // ── RAM ─────────────────────────────────────────────────────────────────
  "ram|1500":                 1.18,
  "ram|1500 trx":             1.08,  // TRX holds well

  // ── Dodge ───────────────────────────────────────────────────────────────
  "dodge|challenger srt hellcat":       0.95,
  "dodge|challenger srt hellcat redeye":0.98,
  "dodge|challenger srt demon":         1.10,  // Demon is collectible
  "dodge|challenger srt demon 170":     1.12,
  "dodge|charger srt hellcat":          0.95,

  // ── Subaru ──────────────────────────────────────────────────────────────
  "subaru|wrx":               1.08,
  "subaru|wrx sti":           1.12,
  "subaru|brz":               1.08,
  "subaru|outback":           1.15,
  "subaru|forester":          1.12,
  "subaru|outback wilderness": 1.18,

  // ── BMW ─────────────────────────────────────────────────────────────────
  "bmw|m2":                   0.97,
  "bmw|m3":                   0.95,  // M-series holds better than base BMW
  "bmw|m3 competition":       0.95,
  "bmw|m4":                   0.95,
  "bmw|m4 competition":       0.95,
  "bmw|m5":                   0.92,
  "bmw|m5 competition":       0.93,
  "bmw|x3 m":                 0.90,
  "bmw|x5 m":                 0.88,

  // ── Mercedes-Benz AMG ───────────────────────────────────────────────────
  "mercedes-benz|amg g 63":   0.88,  // G63 holds better than most MB
  "mercedes-benz|g-class":    0.86,
  "mercedes-benz|amg c 63":   0.82,
  "mercedes-benz|amg e 63":   0.80,
  "mercedes-benz|amg gt":     0.88,

  // ── Porsche ─────────────────────────────────────────────────────────────
  "porsche|911":              1.15,  // 911 is a collector car — holds extremely well
  "porsche|911 carrera":      1.12,
  "porsche|911 carrera s":    1.14,
  "porsche|911 carrera 4s":   1.15,
  "porsche|911 turbo":        1.20,
  "porsche|911 turbo s":      1.22,
  "porsche|911 gt3":          1.25,  // GT3 appreciates in some cases
  "porsche|911 gt3 rs":       1.28,
  "porsche|718 cayman gt4":   1.15,
  "porsche|cayman gt4":       1.15,
  "porsche|718 boxster spyder":1.15,
  "porsche|taycan":           0.85,  // EV Porsche depreciates more
  "porsche|taycan turbo s":   0.88,
  "porsche|macan":            0.92,
  "porsche|cayenne turbo":    0.90,

  // ── Nissan ──────────────────────────────────────────────────────────────
  "nissan|gt-r":              1.05,  // GT-R holds very well

  // ── Acura ───────────────────────────────────────────────────────────────
  "acura|nsx":                1.05,
  "acura|tlx type s":         1.05,

  // ── Lexus ───────────────────────────────────────────────────────────────
  "lexus|lc 500":             1.02,
  "lexus|is 500":             1.05,
  "lexus|rc f":               0.95,
  "lexus|gx":                 1.18,  // GX holds like a truck
  "lexus|gx 550":             1.20,

  // ── Tesla ───────────────────────────────────────────────────────────────
  "tesla|model 3":            1.00,
  "tesla|model y":            1.05,
  "tesla|model s":            0.90,  // S has depreciated with price cuts
  "tesla|model x":            0.88,
  "tesla|cybertruck":         0.92,

  // ── Honda Civic Si ──────────────────────────────────────────────────────
  "honda|civic si":           1.08,
};

function getDepreciationMultiplier(make: string, model: string): number {
  const m = make.toLowerCase().trim();
  const mod = model.toLowerCase().trim().replace(/\s+/g, " ");
  const key = `${m}|${mod}`;
  if (MODEL_DEPRECIATION_OVERRIDE[key]) return MODEL_DEPRECIATION_OVERRIDE[key];
  // Longest partial match — ensures "m3 competition" beats "m3"
  const partials = Object.keys(MODEL_DEPRECIATION_OVERRIDE).filter(
    (k) => k.startsWith(`${m}|`) && mod.startsWith(k.split("|")[1])
  );
  if (partials.length > 0) {
    const best = partials.reduce((a, b) => (a.length >= b.length ? a : b));
    return MODEL_DEPRECIATION_OVERRIDE[best];
  }
  return MAKE_DEPRECIATION_MULTIPLIER[m] ?? MAKE_DEPRECIATION_MULTIPLIER["default"];
}

/**
 * Cumulative value retention by age — baseline for an "average" vehicle.
 * Per-make multipliers are applied on top via getDepreciationMultiplier().
 *
 * Year 1:  ~16% first-year drop (new → used)
 * Year 2:  additional ~9%
 * Year 3:  additional ~7%
 * Years 4-6: ~5–6%/yr
 * Years 7-10: ~4%/yr
 * 10+: ~2-3%/yr
 */
function retentionFactor(ageYears: number): number {
  if (ageYears <= 0)  return 1.00;
  if (ageYears === 1) return 0.84;
  if (ageYears === 2) return 0.75;
  if (ageYears === 3) return 0.68;
  if (ageYears === 4) return 0.63;
  if (ageYears === 5) return 0.58;
  if (ageYears === 6) return 0.54;
  if (ageYears === 7) return 0.50;
  if (ageYears === 8) return 0.46;
  if (ageYears === 9) return 0.43;
  if (ageYears === 10) return 0.40;
  return Math.max(0.12, 0.40 - (ageYears - 10) * 0.025);
}

/**
 * Mileage adjustment vs. average US driving (~13,500 mi/yr per FHWA 2023).
 * Value impact: roughly $0.06–$0.10 per mile above/below average.
 * The rate scales with vehicle value — high-value cars lose more per mile.
 */
function mileageAdjustment(mileage: number, ageYears: number, baseValue: number): number {
  const avgMileage = Math.max(ageYears * 13500, 1);
  const diff = mileage - avgMileage;
  // Rate: $0.06/mi for sub-$20k cars, up to $0.10/mi for $50k+ cars
  const rate = Math.min(0.10, Math.max(0.06, baseValue / 500000));
  const adj = -(diff * rate);
  // Cap at ±22% of base value
  const cap = baseValue * 0.22;
  return Math.max(-cap, Math.min(cap, adj));
}

export function estimateFairValue(input: CarInput): PriceRange {
  const currentYear = new Date().getFullYear();
  const ageYears = Math.max(0, currentYear - input.year);

  // 1. MSRP anchor — carData DB > local MODEL_BASE > MAKE_BASE fallback
  const baseNewPrice = getBasePrice(input.make, input.model, input.trim);

  // 2. Per-model retention curve from real iSeeCars/CarEdge/Edmunds data
  const profile = getDepreciationProfile(input.make, input.model);
  const retention = retentionAtYear(profile, ageYears);
  const midBase = baseNewPrice * retention;

  // 3. Mileage adjustment using class-specific $/1k miles penalty
  const avgMileage = Math.max(ageYears * 13500, 1);
  const mileDelta = input.mileage - avgMileage;          // negative = below avg (good)
  const mileAdj = -(mileDelta / 1000) * profile.mileagePenaltyPer1k;
  // Cap adjustment at ±25% of base so extreme mileage doesn't break the model
  const mileAdjCapped = Math.max(-midBase * 0.25, Math.min(midBase * 0.25, mileAdj));

  // 4. Geographic price adjustment (coastal = higher demand = higher prices)
  const geoMult = getGeoMultiplier(input.zipCode);

  const midpoint = Math.max(500, Math.round(
    ((midBase + mileAdjCapped) * geoMult) / 100
  ) * 100);

  // Range width: ±7% (reflects real market variance in used car pricing)
  const spread = midpoint * 0.07;
  return {
    low:      Math.round((midpoint - spread) / 100) * 100,
    high:     Math.round((midpoint + spread) / 100) * 100,
    midpoint,
  };
}

/**
 * Estimate monthly payment using standard amortization formula.
 * Defaults match typical used-car financing (2024–25) if no overrides provided.
 */
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

export function scoreCarDeal(input: CarInput, fairValue?: PriceRange): ScoreResult {
  const fv = fairValue ?? estimateFairValue(input);
  const priceDelta    = input.askingPrice - fv.midpoint;
  const priceDeltaPct = priceDelta / fv.midpoint;

  const currentYear = new Date().getFullYear();
  const ageYears    = Math.max(0, currentYear - input.year);
  const avgMileage  = ageYears * 13500;
  const mileageRatio = input.mileage / Math.max(avgMileage, 1);

  // ── Price vs. market (primary driver, 0-65 pts) ──────────────────────
  let score = 65;
  if      (priceDeltaPct <= -0.15) score += 30;   // 15%+ below — great deal
  else if (priceDeltaPct <= -0.08) score += 20;   // 8–15% below — good deal
  else if (priceDeltaPct <= -0.03) score += 10;   // 3–8% below — slightly good
  else if (priceDeltaPct <=  0.03) score +=  5;   // within 3% — fair
  else if (priceDeltaPct <=  0.08) score -=  5;   // 3–8% over — slightly high
  else if (priceDeltaPct <=  0.15) score -= 18;   // 8–15% over — negotiate
  else if (priceDeltaPct <=  0.25) score -= 32;   // 15–25% over — walk away territory
  else                              score -= 45;   // >25% over — walk away

  // ── Mileage adjustment (up to ±12 pts) ───────────────────────────────
  if      (mileageRatio > 1.6)  score -= 12;
  else if (mileageRatio > 1.3)  score -=  7;
  else if (mileageRatio > 1.1)  score -=  3;
  else if (mileageRatio < 0.6)  score +=  8;  // very low miles — big plus
  else if (mileageRatio < 0.8)  score +=  4;  // low miles — moderate plus

  // ── Age adjustment (up to ±8 pts) ────────────────────────────────────
  if      (ageYears > 15) score -= 8;
  else if (ageYears > 10) score -= 4;
  else if (ageYears <=  2) score += 8;  // near-new
  else if (ageYears <=  4) score += 4;  // relatively new

  score = Math.max(0, Math.min(100, Math.round(score)));

  // ── Verdict ──────────────────────────────────────────────────────────
  let verdict: Verdict;
  if      (score >= 73) verdict = "Buy";
  else if (score >= 46) verdict = "Negotiate";
  else                  verdict = "Walk Away";

  // ── Reasons ──────────────────────────────────────────────────────────
  const reasons: string[] = [];
  const absDeltaK = (Math.abs(priceDelta) / 1000).toFixed(1);

  if (priceDelta > 0) {
    const pct = Math.round(priceDeltaPct * 100);
    reasons.push(`Asking price is $${absDeltaK}k (${pct}%) above our estimated fair value of $${fv.midpoint.toLocaleString()}.`);
  } else if (priceDelta < 0) {
    const pct = Math.round(Math.abs(priceDeltaPct) * 100);
    reasons.push(`Asking price is $${absDeltaK}k (${pct}%) below estimated fair value — potentially a strong deal.`);
  } else {
    reasons.push(`Asking price is right at estimated fair market value.`);
  }

  if (mileageRatio > 1.3) {
    reasons.push(
      `High mileage: ${input.mileage.toLocaleString()} mi is ${Math.round((mileageRatio - 1) * 100)}% above average for a ${ageYears}-year-old vehicle. Plan for higher maintenance costs.`
    );
  } else if (mileageRatio < 0.7) {
    reasons.push(
      `Excellent mileage: ${input.mileage.toLocaleString()} mi is well below average for its age — this adds significant value and suggests less wear.`
    );
  } else {
    reasons.push(
      `Mileage is ${mileageRatio < 1 ? "slightly below" : "typical for"} average at ${input.mileage.toLocaleString()} mi on a ${ageYears}-year-old car.`
    );
  }

  if (ageYears <= 3) {
    reasons.push(`${ageYears <= 1 ? "Nearly new" : `Only ${ageYears} years old`} — may still carry factory warranty or qualify for CPO certification.`);
  } else if (ageYears > 10) {
    reasons.push(`At ${ageYears} years old, budget for increased repair costs and consider a pre-purchase inspection by an independent mechanic.`);
  }

  const loanOpts = {
    apr: input.loanApr,
    downPct: input.loanDownPct,
    termMonths: input.loanTermMonths,
  };
  const monthly = estimateMonthlyPayment(input.askingPrice, loanOpts);
  const aprLabel = (input.loanApr ?? 7.5).toFixed(1);
  const downLabel = input.loanDownPct ?? 10;
  const termLabel = input.loanTermMonths ?? 60;
  reasons.push(`Estimated monthly payment: ~$${monthly}/mo (${downLabel}% down, ${aprLabel}% APR, ${termLabel} months).`);

  if (priceDelta > 0 && priceDeltaPct <= 0.25) {
    reasons.push(
      `Negotiation room: comparable ${input.year} ${input.make} ${input.model}s sell for $${fv.low.toLocaleString()}–$${fv.high.toLocaleString()}. Use that as your anchor.`
    );
  }

  return {
    score,
    verdict,
    fairValueRange: fv,
    priceDelta,
    priceDeltaPct,
    monthlyPayment: monthly,
    reasons,
  };
}
