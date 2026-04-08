/**
 * Comprehensive US market vehicle database.
 * Covers model years ~2010–2025 across 35+ makes.
 * MSRP values are approximate mid-cycle base prices for the listed generation.
 */

export interface ModelEntry {
  name: string;
  msrp: number; // mid-trim MSRP used as scoring anchor
  trims: string[];
}

export const CAR_DATABASE: Record<string, ModelEntry[]> = {
  // ── Acura ────────────────────────────────────────────────────────────────
  Acura: [
    { name: "ILX",   msrp: 28000, trims: ["Base", "Premium", "A-Spec", "Technology"] },
    { name: "MDX",   msrp: 50000, trims: ["Base", "Technology", "A-Spec", "A-Spec SH-AWD", "Advance", "Type S", "Type S Advance"] },
    { name: "RDX",   msrp: 42000, trims: ["Base", "Technology", "A-Spec", "A-Spec Technology", "Advance"] },
    { name: "TLX",   msrp: 40000, trims: ["Base", "Technology", "A-Spec", "A-Spec Technology", "Advance", "Type S", "Type S Advance"] },
    { name: "TL",    msrp: 36000, trims: ["Base", "Technology", "SH-AWD Technology", "SH-AWD Advance"] },
    { name: "TSX",   msrp: 28000, trims: ["Base", "Technology", "V6 Technology"] },
    { name: "RLX",   msrp: 55000, trims: ["Base", "Sport Hybrid", "Sport Hybrid Advance"] },
    { name: "ZDX",   msrp: 65000, trims: ["A-Spec", "Type S"] },
    { name: "NSX",   msrp: 160000, trims: ["Base", "Type S"] },
  ],

  // ── Alfa Romeo ───────────────────────────────────────────────────────────
  "Alfa Romeo": [
    { name: "Giulia",       msrp: 44000, trims: ["Sprint", "Ti", "Ti Sport", "Ti Lusso", "Veloce", "Quadrifoglio"] },
    { name: "Stelvio",      msrp: 46000, trims: ["Sprint", "Ti", "Ti Sport", "Ti Lusso", "Veloce", "Quadrifoglio"] },
    { name: "Tonale",       msrp: 40000, trims: ["Sprint", "Ti", "Ti Sport", "Veloce"] },
    { name: "4C",           msrp: 57000, trims: ["Coupe", "Spider"] },
  ],

  // ── Audi ─────────────────────────────────────────────────────────────────
  Audi: [
    { name: "A3",       msrp: 36000, trims: ["Premium", "Premium Plus", "Prestige", "S3 Premium", "S3 Premium Plus"] },
    { name: "A4",       msrp: 42000, trims: ["Premium", "Premium Plus", "Prestige", "S4 Premium", "S4 Premium Plus", "S4 Prestige"] },
    { name: "A5",       msrp: 46000, trims: ["Sportback Premium", "Sportback Premium Plus", "Cabriolet Premium", "Cabriolet Premium Plus", "S5 Sportback Premium", "S5 Cabriolet Premium"] },
    { name: "A6",       msrp: 56000, trims: ["Premium", "Premium Plus", "Prestige", "S6 Premium Plus"] },
    { name: "A7",       msrp: 70000, trims: ["Premium", "Premium Plus", "Prestige", "S7 Premium Plus"] },
    { name: "A8",       msrp: 90000, trims: ["L", "L 60 TFSI e", "S8"] },
    { name: "Q3",       msrp: 36000, trims: ["Premium", "Premium Plus", "Prestige"] },
    { name: "Q4 e-tron",msrp: 46000, trims: ["Premium", "Premium Plus", "Prestige"] },
    { name: "Q5",       msrp: 46000, trims: ["Premium", "Premium Plus", "Prestige", "SQ5 Premium", "SQ5 Premium Plus"] },
    { name: "Q7",       msrp: 58000, trims: ["Premium", "Premium Plus", "Prestige", "SQ7 Premium", "SQ7 Prestige"] },
    { name: "Q8",       msrp: 70000, trims: ["Premium", "Premium Plus", "Prestige", "SQ8 Premium Plus", "RS Q8"] },
    { name: "e-tron",   msrp: 68000, trims: ["Premium", "Premium Plus", "Prestige"] },
    { name: "e-tron GT",msrp: 110000, trims: ["Base", "RS"] },
    { name: "TT",       msrp: 50000, trims: ["TTS Coupe", "TTS Roadster"] },
    { name: "R8",       msrp: 170000, trims: ["V10 Performance Coupe", "V10 Performance Spyder"] },
  ],

  // ── BMW ──────────────────────────────────────────────────────────────────
  BMW: [
    { name: "2 Series",  msrp: 38000, trims: ["230i Coupe", "230i xDrive Coupe", "M240i Coupe", "M240i xDrive Coupe", "M2 Coupe", "M2 Competition"] },
    { name: "3 Series",  msrp: 46000, trims: ["330i", "330i xDrive", "330e", "330e xDrive", "M340i", "M340i xDrive", "M3", "M3 Competition", "M3 CS"] },
    { name: "4 Series",  msrp: 50000, trims: ["430i Coupe", "430i Gran Coupe", "430i Convertible", "M440i xDrive Coupe", "M440i Gran Coupe", "M4 Coupe", "M4 Competition", "M4 CS", "M4 CSL"] },
    { name: "5 Series",  msrp: 56000, trims: ["530i", "530i xDrive", "530e", "530e xDrive", "540i", "540i xDrive", "M550i xDrive", "M5", "M5 Competition", "M5 CS"] },
    { name: "7 Series",  msrp: 92000, trims: ["740i", "740i xDrive", "745e xDrive", "760i xDrive", "M760e xDrive"] },
    { name: "8 Series",  msrp: 86000, trims: ["840i Coupe", "840i Gran Coupe", "840i Convertible", "M850i xDrive Coupe", "M850i xDrive Gran Coupe", "M8 Coupe", "M8 Competition", "M8 Gran Coupe Competition"] },
    { name: "X1",        msrp: 38000, trims: ["sDrive28i", "xDrive28i", "M35i"] },
    { name: "X2",        msrp: 40000, trims: ["sDrive28i", "xDrive28i", "M35i"] },
    { name: "X3",        msrp: 47000, trims: ["sDrive30i", "xDrive30i", "xDrive30e", "M40i", "X3 M", "X3 M Competition"] },
    { name: "X4",        msrp: 52000, trims: ["xDrive30i", "M40i", "X4 M", "X4 M Competition"] },
    { name: "X5",        msrp: 62000, trims: ["sDrive40i", "xDrive40i", "xDrive45e", "M60i", "X5 M", "X5 M Competition", "X5 M60i"] },
    { name: "X6",        msrp: 68000, trims: ["sDrive40i", "xDrive40i", "M60i", "X6 M", "X6 M Competition"] },
    { name: "X7",        msrp: 78000, trims: ["xDrive40i", "M60i"] },
    { name: "i3",        msrp: 44000, trims: ["Base", "s", "REX"] },
    { name: "i4",        msrp: 56000, trims: ["eDrive35", "eDrive40", "xDrive40", "M50"] },
    { name: "i5",        msrp: 68000, trims: ["eDrive40", "xDrive40", "M60 xDrive"] },
    { name: "i7",        msrp: 105000, trims: ["xDrive60", "M70 xDrive"] },
    { name: "iX",        msrp: 88000, trims: ["xDrive40", "xDrive50", "M60"] },
    { name: "iX1",       msrp: 46000, trims: ["xDrive30"] },
    { name: "iX3",       msrp: 68000, trims: ["Base"] },
    { name: "Z4",        msrp: 52000, trims: ["sDrive30i", "M40i"] },
  ],

  // ── Buick ────────────────────────────────────────────────────────────────
  Buick: [
    { name: "Enclave",    msrp: 42000, trims: ["Preferred", "Essence", "Avenir", "Sport Touring"] },
    { name: "Encore",     msrp: 26000, trims: ["Preferred", "Sport Touring", "Essence"] },
    { name: "Encore GX",  msrp: 30000, trims: ["Preferred", "Select", "Sport Touring", "Essence", "Avenir"] },
    { name: "Envision",   msrp: 34000, trims: ["Preferred", "Select", "Essence", "Avenir", "Sport Touring"] },
    { name: "Envista",    msrp: 24000, trims: ["Preferred", "Sport Touring", "Avenir"] },
    { name: "LaCrosse",   msrp: 32000, trims: ["Base", "Preferred", "Essence", "Avenir"] },
    { name: "Verano",     msrp: 22000, trims: ["Base", "Leather", "Sport Touring", "Premium"] },
  ],

  // ── Cadillac ─────────────────────────────────────────────────────────────
  Cadillac: [
    { name: "ATS",          msrp: 36000, trims: ["Luxury", "Performance", "Premium", "V"] },
    { name: "CT4",          msrp: 38000, trims: ["Luxury", "Premium Luxury", "Sport", "V-Series", "V-Series Blackwing"] },
    { name: "CT4-V",        msrp: 52000, trims: ["V-Series", "Blackwing"] },
    { name: "CT5",          msrp: 42000, trims: ["Luxury", "Premium Luxury", "Sport", "V-Series", "V-Series Blackwing"] },
    { name: "CT5-V",        msrp: 60000, trims: ["V-Series", "Blackwing"] },
    { name: "CTS",          msrp: 46000, trims: ["Luxury", "Performance", "Premium", "V", "Vsport"] },
    { name: "Escalade",     msrp: 80000, trims: ["Luxury", "Premium Luxury", "Sport", "Platinum", "V-Series Blackwing"] },
    { name: "Escalade ESV", msrp: 84000, trims: ["Luxury", "Premium Luxury", "Platinum", "Sport"] },
    { name: "Lyriq",        msrp: 60000, trims: ["Luxury", "Luxury AWD", "Sport", "Sport AWD"] },
    { name: "SRX",          msrp: 36000, trims: ["Base", "Luxury", "Performance", "Premium"] },
    { name: "XT4",          msrp: 38000, trims: ["Luxury", "Premium Luxury", "Sport"] },
    { name: "XT5",          msrp: 44000, trims: ["Luxury", "Premium Luxury", "Sport", "Platinum"] },
    { name: "XT6",          msrp: 50000, trims: ["Luxury", "Premium Luxury", "Sport", "Platinum"] },
  ],

  // ── Chevrolet ────────────────────────────────────────────────────────────
  Chevrolet: [
    { name: "Blazer",          msrp: 34000, trims: ["LT", "RS", "Premier", "EV LT RWD", "EV RS AWD", "EV SS"] },
    { name: "Bolt EUV",        msrp: 28000, trims: ["LT", "Premier"] },
    { name: "Bolt EV",         msrp: 26000, trims: ["LT", "Premier"] },
    { name: "Camaro",          msrp: 30000, trims: ["LS", "LT", "LT1", "SS", "SS 1LE", "ZL1", "ZL1 1LE"] },
    { name: "Colorado",        msrp: 30000, trims: ["WT", "LT", "Z71", "Trail Boss", "ZR2", "ZR2 Bison"] },
    { name: "Corvette",        msrp: 68000, trims: ["Stingray 1LT", "Stingray 2LT", "Stingray 3LT", "Z06 1LZ", "Z06 2LZ", "Z06 3LZ", "ZR1", "E-Ray"] },
    { name: "Equinox",         msrp: 28000, trims: ["LS", "LT", "RS", "Premier", "EV LS", "EV LT", "EV RS", "EV 2RS", "EV 3RS"] },
    { name: "Impala",          msrp: 26000, trims: ["LS", "LT", "Premier"] },
    { name: "Malibu",          msrp: 24000, trims: ["L", "LS", "RS", "LT", "Premier"] },
    { name: "Silverado 1500",  msrp: 42000, trims: ["WT", "Custom", "Custom Trail Boss", "LT", "RST", "Trail Boss", "LTZ", "High Country", "ZR2"] },
    { name: "Silverado 2500HD",msrp: 48000, trims: ["WT", "Custom", "LT", "LTZ", "High Country"] },
    { name: "Silverado 3500HD",msrp: 52000, trims: ["WT", "Custom", "LT", "LTZ", "High Country"] },
    { name: "Sonic",           msrp: 18000, trims: ["LS", "LT", "Premier"] },
    { name: "Spark",           msrp: 15000, trims: ["LS", "LT", "ACTIV", "Premier"] },
    { name: "Suburban",        msrp: 56000, trims: ["LS", "LT", "RST", "Z71", "Premier", "High Country"] },
    { name: "Tahoe",           msrp: 54000, trims: ["LS", "LT", "RST", "Z71", "Premier", "High Country"] },
    { name: "Trailblazer",     msrp: 22000, trims: ["LS", "LT", "ACTIV", "RS", "Premier"] },
    { name: "Traverse",        msrp: 36000, trims: ["LS", "LT", "RS", "ACTIV", "Premier", "High Country"] },
    { name: "Trax",            msrp: 22000, trims: ["LS", "LT", "ACTIV", "RS", "LTZ"] },
  ],

  // ── Chrysler ─────────────────────────────────────────────────────────────
  Chrysler: [
    { name: "300",      msrp: 34000, trims: ["Touring", "Touring L", "300S", "300C", "SRT 8"] },
    { name: "Pacifica", msrp: 38000, trims: ["Touring", "Touring L", "Touring L Plus", "Limited", "Pinnacle", "Hybrid Touring", "Hybrid Touring Plus", "Hybrid Limited", "Hybrid Pinnacle"] },
    { name: "Voyager",  msrp: 28000, trims: ["LX"] },
    { name: "Town & Country", msrp: 28000, trims: ["Touring", "Touring L", "Limited", "S"] },
  ],

  // ── Dodge ────────────────────────────────────────────────────────────────
  Dodge: [
    { name: "Challenger",   msrp: 36000, trims: ["SXT", "GT", "R/T", "R/T Scat Pack", "R/T Scat Pack 392", "SRT Hellcat", "SRT Hellcat Redeye", "SRT Super Stock", "SRT Demon 170"] },
    { name: "Charger",      msrp: 38000, trims: ["SXT", "GT", "R/T", "Scat Pack", "Scat Pack 392", "SRT Hellcat", "SRT Hellcat Redeye", "SRT Hellcat Jailbreak"] },
    { name: "Durango",      msrp: 40000, trims: ["SXT", "GT", "Citadel", "R/T", "SRT 392", "SRT Hellcat"] },
    { name: "Grand Caravan",msrp: 26000, trims: ["SE", "SE Plus", "SXT", "GT"] },
    { name: "Journey",      msrp: 22000, trims: ["SE", "SXT", "Crossroad", "GT"] },
    { name: "Dart",         msrp: 18000, trims: ["SE", "SXT", "Aero", "Rallye", "GT", "R/T", "Limited"] },
  ],

  // ── Ford ─────────────────────────────────────────────────────────────────
  Ford: [
    { name: "Bronco",          msrp: 38000, trims: ["Base", "Big Bend", "Black Diamond", "Outer Banks", "Badlands", "Wildtrak", "Everglades", "Raptor", "Raptor R", "Heritage Edition", "Heritage Limited"] },
    { name: "Bronco Sport",    msrp: 30000, trims: ["Base", "Big Bend", "Outer Banks", "Badlands", "Heritage Edition", "Heritage Limited"] },
    { name: "EcoSport",        msrp: 22000, trims: ["S", "SE", "SES", "Titanium"] },
    { name: "Edge",            msrp: 36000, trims: ["SE", "SEL", "ST", "ST-Line", "Titanium"] },
    { name: "Escape",          msrp: 28000, trims: ["S", "SE", "SE Sport", "ST-Line", "Titanium", "PHEV SE", "PHEV Titanium"] },
    { name: "Expedition",      msrp: 54000, trims: ["XL", "XLT", "Limited", "Timberline", "Platinum", "King Ranch", "Stealth Edition"] },
    { name: "Expedition MAX",  msrp: 58000, trims: ["XL", "XLT", "Limited", "Platinum", "King Ranch"] },
    { name: "Explorer",        msrp: 38000, trims: ["Base", "XLT", "ST-Line", "Limited", "Timberline", "Platinum", "King Ranch", "ST"] },
    { name: "F-150",           msrp: 42000, trims: ["XL", "XLT", "Lariat", "King Ranch", "Platinum", "Limited", "Raptor", "Raptor R", "Tremor", "Lightning Pro", "Lightning XLT", "Lightning Lariat", "Lightning Platinum"] },
    { name: "F-250 Super Duty",msrp: 48000, trims: ["XL", "XLT", "Lariat", "King Ranch", "Platinum", "Limited", "Tremor"] },
    { name: "F-350 Super Duty",msrp: 52000, trims: ["XL", "XLT", "Lariat", "King Ranch", "Platinum", "Limited", "Tremor"] },
    { name: "F-450 Super Duty",msrp: 58000, trims: ["XL", "XLT", "Lariat", "King Ranch", "Platinum", "Limited"] },
    { name: "Maverick",        msrp: 24000, trims: ["XL", "XLT", "Lariat", "Tremor"] },
    { name: "Mustang",         msrp: 32000, trims: ["EcoBoost", "EcoBoost Premium", "GT", "GT Premium", "Mach 1", "Mach 1 Premium", "Dark Horse", "Dark Horse Premium", "Shelby GT500", "Shelby GT500 Heritage Edition"] },
    { name: "Mustang Mach-E",  msrp: 48000, trims: ["Select", "Premium", "GT", "GT Performance Edition", "California Route 1"] },
    { name: "Ranger",          msrp: 30000, trims: ["XL", "XLT", "Lariat", "Tremor", "Raptor"] },
    { name: "Transit",         msrp: 42000, trims: ["T-150 Cargo", "T-250 Cargo", "T-350 Cargo", "T-350 Passenger"] },
    { name: "Transit Connect",msrp: 24000, trims: ["XL Cargo", "XLT Cargo", "XLT Passenger", "Titanium Passenger"] },
  ],

  // ── Genesis ──────────────────────────────────────────────────────────────
  Genesis: [
    { name: "G70",  msrp: 40000, trims: ["Standard", "Advanced", "Sport", "Sport Prestige"] },
    { name: "G80",  msrp: 52000, trims: ["Standard", "Advanced", "Sport", "Sport Advanced", "Electrified Standard", "Electrified Advanced"] },
    { name: "G90",  msrp: 92000, trims: ["Premium", "Prestige", "5.0 Ultimate"] },
    { name: "GV70", msrp: 44000, trims: ["Standard", "Advanced", "Sport", "Sport Prestige", "Electrified Standard", "Electrified Advanced"] },
    { name: "GV80", msrp: 56000, trims: ["Standard", "Advanced", "Prestige", "Sport Prestige", "Coupe Advanced"] },
  ],

  // ── GMC ──────────────────────────────────────────────────────────────────
  GMC: [
    { name: "Acadia",       msrp: 38000, trims: ["SLE", "SLT", "AT4", "Denali"] },
    { name: "Canyon",       msrp: 32000, trims: ["Elevation", "AT4", "Denali", "AT4X"] },
    { name: "Envoy",        msrp: 30000, trims: ["SLE", "SLT", "Denali"] },
    { name: "Envoy XL",     msrp: 32000, trims: ["SLE", "SLT", "Denali"] },
    { name: "Envista",      msrp: 24000, trims: ["SLE", "SLT", "Denali"] },
    { name: "Hummer EV",    msrp: 80000, trims: ["Edition 1", "EV3X", "EV2X", "EV2", "SUV Edition 1", "SUV EV3X"] },
    { name: "Sierra 1500",  msrp: 44000, trims: ["Regular Cab SLE", "SLE", "SLT", "Elevation", "AT4", "AT4X", "Denali", "Denali Ultimate"] },
    { name: "Sierra 2500HD",msrp: 50000, trims: ["SLE", "SLT", "AT4", "Denali"] },
    { name: "Sierra 3500HD",msrp: 54000, trims: ["SLE", "SLT", "AT4", "Denali"] },
    { name: "Terrain",      msrp: 30000, trims: ["SLE", "SLT", "AT4", "Denali"] },
    { name: "Yukon",        msrp: 56000, trims: ["SLE", "SLT", "AT4", "Denali", "Denali Ultimate"] },
    { name: "Yukon XL",     msrp: 60000, trims: ["SLE", "SLT", "AT4", "Denali", "Denali Ultimate"] },
  ],

  // ── Honda ────────────────────────────────────────────────────────────────
  Honda: [
    { name: "Accord",   msrp: 28000, trims: ["LX", "Sport", "Sport Special Edition", "EX-L", "Sport-L", "Touring", "Hybrid Sport", "Hybrid Sport-L", "Hybrid EX-L", "Hybrid Touring"] },
    { name: "Civic",    msrp: 24000, trims: ["LX", "Sport", "EX", "Sport-L", "Touring", "Si", "Type R", "Hybrid Sport", "Hybrid Sport-L", "Hybrid Touring"] },
    { name: "CR-V",     msrp: 30000, trims: ["LX", "EX", "Sport", "EX-L", "Sport-L", "Touring", "Hybrid Sport", "Hybrid EX-L", "Hybrid Sport-L", "Hybrid Touring"] },
    { name: "Element",  msrp: 20000, trims: ["LX", "EX", "SC"] },
    { name: "Fit",      msrp: 18000, trims: ["LX", "Sport", "EX", "EX-L"] },
    { name: "HR-V",     msrp: 24000, trims: ["LX", "Sport", "EX", "EX-L"] },
    { name: "Insight",  msrp: 26000, trims: ["LX", "EX", "Touring"] },
    { name: "Odyssey",  msrp: 36000, trims: ["LX", "EX", "EX-L", "Touring", "Elite"] },
    { name: "Passport", msrp: 38000, trims: ["Sport", "EX-L", "TrailSport", "Elite"] },
    { name: "Pilot",    msrp: 40000, trims: ["Sport", "EX-L", "TrailSport", "Elite", "Black Edition"] },
    { name: "Prologue", msrp: 50000, trims: ["EX", "EX-L", "Touring"] },
    { name: "Ridgeline",msrp: 38000, trims: ["Sport", "RTL", "RTL-E", "Black Edition"] },
  ],

  // ── Hyundai ──────────────────────────────────────────────────────────────
  Hyundai: [
    { name: "Accent",       msrp: 18000, trims: ["SE", "SEL", "Limited"] },
    { name: "Elantra",      msrp: 22000, trims: ["SE", "SEL", "N Line", "Limited", "N", "Hybrid Blue", "Hybrid SEL", "Hybrid N Line", "Hybrid Limited"] },
    { name: "Ioniq",        msrp: 24000, trims: ["Blue", "SEL", "Limited", "Plug-In Hybrid Blue", "Plug-In Hybrid SEL", "Electric SEL", "Electric Limited"] },
    { name: "Ioniq 5",      msrp: 42000, trims: ["SE Standard Range", "SE", "SEL", "Limited", "N Line", "N"] },
    { name: "Ioniq 6",      msrp: 40000, trims: ["SE Standard Range", "SE", "SEL", "Limited"] },
    { name: "Kona",         msrp: 24000, trims: ["SE", "SEL", "N Line", "Limited", "Electric SE", "Electric SEL", "Electric Limited", "Electric N Line"] },
    { name: "Palisade",     msrp: 36000, trims: ["SE", "SEL", "XRT", "Limited", "Calligraphy"] },
    { name: "Santa Cruz",   msrp: 30000, trims: ["SE", "SEL", "SEL Premium", "Limited", "XRT"] },
    { name: "Santa Fe",     msrp: 32000, trims: ["SE", "SEL", "XRT", "Limited", "Calligraphy", "Hybrid SE", "Hybrid SEL", "Hybrid XRT", "Hybrid Limited", "Hybrid Calligraphy", "PHEV SE", "PHEV SEL", "PHEV Limited"] },
    { name: "Sonata",       msrp: 26000, trims: ["SE", "SEL", "SEL Plus", "N Line", "Limited", "Hybrid Blue", "Hybrid SEL", "Hybrid SEL Plus", "Hybrid N Line", "Hybrid Limited"] },
    { name: "Tucson",       msrp: 28000, trims: ["SE", "SEL", "XRT", "N Line", "Limited", "Hybrid Blue", "Hybrid SEL", "Hybrid N Line", "Hybrid XRT", "Hybrid Limited", "PHEV SE", "PHEV SEL", "PHEV Limited"] },
    { name: "Veloster",     msrp: 20000, trims: ["Base", "Premium", "Turbo", "Turbo Ultimate", "N"] },
    { name: "Venue",        msrp: 20000, trims: ["SE", "SEL", "Denim", "Limited"] },
  ],

  // ── Infiniti ─────────────────────────────────────────────────────────────
  Infiniti: [
    { name: "Q50",  msrp: 42000, trims: ["Pure", "Luxe", "Sport", "Red Sport 400"] },
    { name: "Q60",  msrp: 48000, trims: ["Pure", "Luxe", "Sport", "Red Sport 400"] },
    { name: "QX30", msrp: 34000, trims: ["Base", "Premium", "Sport", "Sport Premium"] },
    { name: "QX50", msrp: 38000, trims: ["Pure", "Luxe", "Sensory", "Autograph"] },
    { name: "QX55", msrp: 44000, trims: ["Pure", "Luxe", "Sensory", "Autograph"] },
    { name: "QX60", msrp: 48000, trims: ["Pure", "Luxe", "Sensory", "Autograph"] },
    { name: "QX80", msrp: 70000, trims: ["Luxe", "Sensory", "Autograph"] },
  ],

  // ── Jaguar ───────────────────────────────────────────────────────────────
  Jaguar: [
    { name: "E-Pace",    msrp: 44000, trims: ["S", "SE", "R-Dynamic SE", "HSE", "R-Dynamic HSE"] },
    { name: "F-Pace",    msrp: 56000, trims: ["S", "SE", "R-Dynamic SE", "HSE", "R-Dynamic HSE", "SVR"] },
    { name: "F-Type",    msrp: 66000, trims: ["Coupe", "P300 Coupe", "P450 Coupe", "R-Dynamic HSE", "R Coupe", "SVR"] },
    { name: "I-Pace",    msrp: 72000, trims: ["S", "SE", "HSE", "EV400"] },
    { name: "XE",        msrp: 38000, trims: ["S", "SE", "R-Dynamic SE", "HSE", "R-Dynamic HSE"] },
    { name: "XF",        msrp: 46000, trims: ["S", "SE", "R-Dynamic SE", "HSE", "R-Dynamic HSE"] },
    { name: "XJ",        msrp: 80000, trims: ["Portfolio", "XJL Portfolio", "XJL Autobiography"] },
  ],

  // ── Jeep ─────────────────────────────────────────────────────────────────
  Jeep: [
    { name: "Cherokee",       msrp: 32000, trims: ["Sport", "Latitude", "Latitude Plus", "Latitude Lux", "Altitude", "Limited", "Trailhawk", "High Altitude"] },
    { name: "Compass",        msrp: 28000, trims: ["Sport", "Latitude", "Latitude Lux", "Altitude", "Limited", "Trailhawk", "High Altitude"] },
    { name: "Gladiator",      msrp: 42000, trims: ["Sport", "Sport S", "Willys Sport", "Willys", "Overland", "Mojave", "Rubicon", "Farout Edition"] },
    { name: "Grand Cherokee", msrp: 42000, trims: ["Laredo", "Altitude", "Limited", "Overland", "Summit", "Trailhawk", "Limited X", "Summit Reserve", "SRT", "Trackhawk", "4xe", "4xe Summit Reserve"] },
    { name: "Grand Cherokee L",msrp: 46000, trims: ["Laredo", "Altitude", "Limited", "Overland", "Summit", "Trailhawk", "Summit Reserve"] },
    { name: "Grand Wagoneer", msrp: 90000, trims: ["Series I", "Series II", "Series III", "Obsidian", "Carbide"] },
    { name: "Renegade",       msrp: 26000, trims: ["Sport", "Latitude", "Altitude", "Limited", "Trailhawk"] },
    { name: "Wagoneer",       msrp: 60000, trims: ["Series I", "Series II", "Series III", "Carbide"] },
    { name: "Wrangler",       msrp: 38000, trims: ["Sport", "Sport S", "Willys Sport", "Willys", "Freedom", "Sahara", "Rubicon", "Rubicon 392", "4xe Sport S", "4xe Sahara", "4xe Rubicon"] },
  ],

  // ── Kia ──────────────────────────────────────────────────────────────────
  Kia: [
    { name: "Carnival",  msrp: 34000, trims: ["LX", "EX", "SX", "SX Prestige"] },
    { name: "EV6",       msrp: 42000, trims: ["Light", "Wind", "Wind AWD", "GT-Line", "GT-Line AWD", "GT"] },
    { name: "EV9",       msrp: 56000, trims: ["Light", "Wind", "GT-Line", "GT-Line AWD"] },
    { name: "Forte",     msrp: 20000, trims: ["FE", "LX", "LXS", "GT-Line", "GT", "GT Manual"] },
    { name: "K5",        msrp: 26000, trims: ["LX", "LXS", "GT-Line", "EX", "GT"] },
    { name: "Niro",      msrp: 28000, trims: ["LX", "EX", "SX Touring", "PHEV LX", "PHEV EX", "EV Wind", "EV Wave", "EV GT-Line"] },
    { name: "Seltos",    msrp: 24000, trims: ["LX", "S", "EX", "SX", "X-Line SX"] },
    { name: "Sorento",   msrp: 30000, trims: ["LX", "S", "EX", "SX", "SX Prestige", "X-Line SX", "PHEV SX", "PHEV SX Prestige"] },
    { name: "Soul",      msrp: 20000, trims: ["LX", "S", "EX", "GT-Line", "Turbo", "EV Wind", "EV Wave", "EV GT-Line"] },
    { name: "Sportage",  msrp: 28000, trims: ["LX", "EX", "X-Line", "SX Turbo", "X-Line EX", "X-Pro", "Hybrid LX", "Hybrid EX", "PHEV SX"] },
    { name: "Stinger",   msrp: 40000, trims: ["GT-Line", "GT1", "GT2"] },
    { name: "Telluride", msrp: 36000, trims: ["LX", "EX", "SX", "SX Prestige", "X-Line", "X-Pro", "X-Pro Prestige"] },
  ],

  // ── Land Rover ───────────────────────────────────────────────────────────
  "Land Rover": [
    { name: "Defender",           msrp: 56000, trims: ["90 S", "90 SE", "90 X-Dynamic SE", "90 HSE", "90 X", "110 S", "110 SE", "110 X-Dynamic SE", "110 HSE", "110 X", "110 V8"] },
    { name: "Discovery",          msrp: 60000, trims: ["S", "SE", "Metropolitan Edition", "HSE", "HSE Luxury", "R-Dynamic HSE"] },
    { name: "Discovery Sport",    msrp: 44000, trims: ["S", "SE", "R-Dynamic SE", "HSE", "R-Dynamic HSE"] },
    { name: "Range Rover",        msrp: 96000, trims: ["SE", "Autobiography", "SV", "First Edition", "SV Autobiography"] },
    { name: "Range Rover Evoque", msrp: 46000, trims: ["S", "SE", "R-Dynamic SE", "HSE", "R-Dynamic HSE", "Autobiography"] },
    { name: "Range Rover Sport",  msrp: 72000, trims: ["S", "SE", "Dynamic SE", "HSE", "Dynamic HSE", "Autobiography", "SVR"] },
    { name: "Range Rover Velar",  msrp: 58000, trims: ["S", "SE", "R-Dynamic SE", "HSE", "R-Dynamic HSE"] },
  ],

  // ── Lexus ────────────────────────────────────────────────────────────────
  Lexus: [
    { name: "ES",  msrp: 42000, trims: ["ES 250", "ES 300h", "ES 300h F Sport", "ES 350", "ES 350 F Sport", "ES 350 Ultra Luxury"] },
    { name: "GX",  msrp: 58000, trims: ["GX 460", "GX 460 Premium", "GX 460 Sport", "GX 460 Luxury", "GX 550 Premium+", "GX 550 Overtrail+", "GX 550 Luxury+"] },
    { name: "IS",  msrp: 40000, trims: ["IS 300", "IS 300 AWD", "IS 350", "IS 350 AWD", "IS 350 F Sport", "IS 500 F Sport Performance"] },
    { name: "LC",  msrp: 100000, trims: ["LC 500", "LC 500h", "LC 500 Convertible", "LC 500 Inspiration Series"] },
    { name: "LS",  msrp: 78000, trims: ["LS 500", "LS 500 AWD", "LS 500h", "LS 500h AWD"] },
    { name: "LX",  msrp: 92000, trims: ["LX 600 Premium+", "LX 600 Luxury+", "LX 600 F Sport+", "LX 600 Ultra Luxury"] },
    { name: "NX",  msrp: 40000, trims: ["NX 250", "NX 250 F Sport", "NX 350", "NX 350 F Sport", "NX 350h", "NX 350h F Sport", "NX 450h+", "NX 450h+ F Sport"] },
    { name: "RC",  msrp: 44000, trims: ["RC 300", "RC 300 AWD", "RC 350", "RC 350 AWD", "RC F", "RC F Track Edition"] },
    { name: "RX",  msrp: 48000, trims: ["RX 350", "RX 350 Premium", "RX 350 F Sport Handling", "RX 350 Luxury", "RX 350h", "RX 450h", "RX 500h", "RX 500h F Sport Performance"] },
    { name: "TX",  msrp: 56000, trims: ["TX 350", "TX 350 F Sport Handling", "TX 350 Luxury", "TX 500h F Sport Performance"] },
    { name: "UX",  msrp: 34000, trims: ["UX 200", "UX 200 F Sport", "UX 250h", "UX 250h F Sport"] },
  ],

  // ── Lincoln ──────────────────────────────────────────────────────────────
  Lincoln: [
    { name: "Aviator",      msrp: 54000, trims: ["Standard", "Reserve", "Black Label", "Grand Touring", "Grand Touring Reserve"] },
    { name: "Corsair",      msrp: 40000, trims: ["Standard", "Reserve", "Black Label", "Grand Touring"] },
    { name: "MKZ",          msrp: 36000, trims: ["Premiere", "Select", "Reserve I", "Reserve II", "Black Label"] },
    { name: "Nautilus",     msrp: 46000, trims: ["Standard", "Reserve", "Black Label"] },
    { name: "Navigator",    msrp: 78000, trims: ["Standard", "Reserve", "Black Label", "L Standard", "L Reserve", "L Black Label"] },
    { name: "Navigator L",  msrp: 82000, trims: ["Standard", "Reserve", "Black Label"] },
  ],

  // ── Maserati ─────────────────────────────────────────────────────────────
  Maserati: [
    { name: "Ghibli",       msrp: 76000, trims: ["GT", "Modena", "Trofeo"] },
    { name: "Grecale",      msrp: 66000, trims: ["GT", "Modena", "Trofeo", "Folgore"] },
    { name: "GranTurismo",  msrp: 180000, trims: ["Modena", "Trofeo", "Folgore"] },
    { name: "Levante",      msrp: 82000, trims: ["GT", "Modena", "Trofeo"] },
    { name: "Quattroporte", msrp: 110000, trims: ["GT", "Modena", "Trofeo"] },
  ],

  // ── Mazda ────────────────────────────────────────────────────────────────
  Mazda: [
    { name: "CX-3",         msrp: 22000, trims: ["Sport", "Touring", "Grand Touring"] },
    { name: "CX-30",        msrp: 26000, trims: ["S", "Select", "Preferred", "Premium", "Premium Plus", "Turbo", "Turbo Premium Plus"] },
    { name: "CX-5",         msrp: 30000, trims: ["S", "Select", "Preferred", "Carbon Edition", "Grand Touring", "Grand Touring Reserve", "Signature", "Turbo"] },
    { name: "CX-50",        msrp: 32000, trims: ["S", "Select", "Preferred", "Preferred Plus", "Premium", "Premium Plus", "Turbo", "Turbo Premium Plus"] },
    { name: "CX-70",        msrp: 42000, trims: ["PHEV Premium", "PHEV Premium Plus"] },
    { name: "CX-90",        msrp: 40000, trims: ["PHEV Premium", "PHEV Premium Plus", "PHEV Signature", "Turbo Select", "Turbo Preferred", "Turbo Preferred Plus", "Turbo Premium", "Turbo Premium Plus", "Turbo Signature"] },
    { name: "Mazda3",       msrp: 24000, trims: ["S", "Select", "Preferred", "Preferred AWD", "Premium", "Premium AWD", "2.5 Turbo Premium", "2.5 Turbo Premium Plus"] },
    { name: "Mazda6",       msrp: 26000, trims: ["Sport", "Touring", "Carbon Edition", "Grand Touring", "Grand Touring Reserve", "Signature"] },
    { name: "MX-5 Miata",   msrp: 30000, trims: ["Sport", "Club", "Grand Touring", "RF Club", "RF Grand Touring"] },
    { name: "MX-30",        msrp: 34000, trims: ["Select", "Premium"] },
  ],

  // ── Mercedes-Benz ────────────────────────────────────────────────────────
  "Mercedes-Benz": [
    { name: "A-Class",    msrp: 36000, trims: ["A 220", "A 220 4MATIC", "AMG A 35"] },
    { name: "C-Class",    msrp: 46000, trims: ["C 300", "C 300 4MATIC", "AMG C 43", "AMG C 43 4MATIC", "AMG C 63 S", "AMG C 63 S E Performance"] },
    { name: "CLA",        msrp: 38000, trims: ["CLA 250", "CLA 250 4MATIC", "AMG CLA 35", "AMG CLA 45 S"] },
    { name: "CLS",        msrp: 72000, trims: ["CLS 450", "CLS 450 4MATIC", "AMG CLS 53"] },
    { name: "E-Class",    msrp: 58000, trims: ["E 350", "E 450", "E 450 4MATIC", "AMG E 53", "AMG E 63 S"] },
    { name: "EQB",        msrp: 56000, trims: ["EQB 250+", "EQB 300 4MATIC", "EQB 350 4MATIC"] },
    { name: "EQE",        msrp: 76000, trims: ["EQE 350+", "EQE 350 4MATIC", "AMG EQE 43 4MATIC", "AMG EQE 53 4MATIC+"] },
    { name: "EQE SUV",    msrp: 80000, trims: ["EQE 350+", "EQE 350 4MATIC", "AMG EQE 53 4MATIC+"] },
    { name: "EQS",        msrp: 106000, trims: ["EQS 450+", "EQS 450 4MATIC", "EQS 580 4MATIC", "AMG EQS 53 4MATIC+"] },
    { name: "EQS SUV",    msrp: 106000, trims: ["EQS 450+", "EQS 450 4MATIC", "EQS 580 4MATIC", "AMG EQS 53 4MATIC+"] },
    { name: "G-Class",    msrp: 140000, trims: ["G 550", "AMG G 63", "AMG G 63 Grand Edition"] },
    { name: "GLA",        msrp: 40000, trims: ["GLA 250", "GLA 250 4MATIC", "AMG GLA 35", "AMG GLA 45 S"] },
    { name: "GLB",        msrp: 42000, trims: ["GLB 250", "GLB 250 4MATIC", "AMG GLB 35"] },
    { name: "GLC",        msrp: 48000, trims: ["GLC 300", "GLC 300 4MATIC", "GLC 350e 4MATIC", "AMG GLC 43", "AMG GLC 63 S"] },
    { name: "GLE",        msrp: 62000, trims: ["GLE 350", "GLE 350 4MATIC", "GLE 450 4MATIC", "GLE 580", "AMG GLE 53", "AMG GLE 63 S"] },
    { name: "GLS",        msrp: 92000, trims: ["GLS 450", "GLS 450 4MATIC", "GLS 580", "AMG GLS 63", "Maybach GLS 600"] },
    { name: "S-Class",    msrp: 114000, trims: ["S 500", "S 580", "S 580 4MATIC", "AMG S 63", "Maybach S 480", "Maybach S 580", "Maybach S 680"] },
    { name: "SL",         msrp: 132000, trims: ["SL 43", "SL 55 4MATIC+", "SL 63 4MATIC+", "AMG SL 55", "AMG SL 63"] },
    { name: "Sprinter",   msrp: 42000, trims: ["1500 Cargo Van", "2500 Cargo Van", "2500 Crew Van", "2500 Passenger Van", "3500 Cargo Van"] },
  ],

  // ── Mini ─────────────────────────────────────────────────────────────────
  Mini: [
    { name: "Clubman",      msrp: 36000, trims: ["Cooper S", "Cooper S ALL4", "John Cooper Works ALL4"] },
    { name: "Convertible",  msrp: 34000, trims: ["Cooper", "Cooper S", "John Cooper Works"] },
    { name: "Cooper",       msrp: 28000, trims: ["Base", "S", "SE Electric", "John Cooper Works"] },
    { name: "Countryman",   msrp: 36000, trims: ["Cooper", "Cooper S", "Cooper S ALL4", "Cooper SE", "John Cooper Works ALL4"] },
    { name: "Paceman",      msrp: 30000, trims: ["Cooper", "Cooper S", "Cooper S ALL4", "John Cooper Works ALL4"] },
  ],

  // ── Mitsubishi ───────────────────────────────────────────────────────────
  Mitsubishi: [
    { name: "Eclipse Cross",   msrp: 26000, trims: ["ES", "SE", "SE Special Edition", "SP", "LE", "SEL"] },
    { name: "Lancer",          msrp: 20000, trims: ["ES", "SE", "GT", "Ralliart", "Evolution GSR", "Evolution MR"] },
    { name: "Mirage",          msrp: 16000, trims: ["ES", "LE", "BE", "G4 ES", "G4 SE", "G4 SEL"] },
    { name: "Outlander",       msrp: 28000, trims: ["ES", "SE", "SE Special Edition", "SEL", "SEL Touring", "PHEV SE", "PHEV SEL"] },
    { name: "Outlander Sport", msrp: 24000, trims: ["ES", "LE", "SE", "SP", "SEL", "GT"] },
    { name: "Galant",          msrp: 22000, trims: ["ES", "SE", "Sport", "GTS"] },
  ],

  // ── Nissan ───────────────────────────────────────────────────────────────
  Nissan: [
    { name: "370Z",       msrp: 34000, trims: ["Sport", "Sport Touring", "Sport Tech", "Nismo", "Nismo Tech"] },
    { name: "Altima",     msrp: 26000, trims: ["S", "SR", "SV", "SL", "SR AWD", "SV AWD", "Platinum", "Platinum AWD"] },
    { name: "Armada",     msrp: 52000, trims: ["S", "SV", "SL", "Platinum"] },
    { name: "Ariya",      msrp: 44000, trims: ["Venture+", "Evolve+", "Engage+", "Empower+ e-4ORCE", "Premiere e-4ORCE"] },
    { name: "Frontier",   msrp: 32000, trims: ["S", "SV", "PRO-4X", "SL", "Pro-X"] },
    { name: "GT-R",       msrp: 115000, trims: ["Premium", "Nismo", "Nismo Special Edition"] },
    { name: "Kicks",      msrp: 22000, trims: ["S", "SR", "SV"] },
    { name: "Leaf",       msrp: 28000, trims: ["S", "S Plus", "SV", "SV Plus", "SL Plus"] },
    { name: "Maxima",     msrp: 38000, trims: ["S", "SV", "SR", "SL", "SR Midnight Edition", "Platinum"] },
    { name: "Murano",     msrp: 34000, trims: ["S", "SL", "SV", "Platinum"] },
    { name: "Pathfinder", msrp: 38000, trims: ["S", "SV", "SL", "Rock Creek", "Platinum"] },
    { name: "Rogue",      msrp: 30000, trims: ["S", "SV", "SL", "Platinum", "Rock Creek"] },
    { name: "Rogue Sport",msrp: 26000, trims: ["S", "SV", "SL"] },
    { name: "Sentra",     msrp: 22000, trims: ["S", "SR", "SV", "Midnight Edition"] },
    { name: "Titan",      msrp: 42000, trims: ["S", "SV", "PRO-4X", "SL", "Platinum Reserve"] },
    { name: "Titan XD",   msrp: 46000, trims: ["S", "SV", "PRO-4X", "SL", "Platinum Reserve"] },
    { name: "Versa",      msrp: 16000, trims: ["S", "SR", "SV"] },
    { name: "Z",          msrp: 42000, trims: ["Sport", "Performance", "Proto Spec", "Nismo"] },
  ],

  // ── Porsche ──────────────────────────────────────────────────────────────
  Porsche: [
    { name: "718 Boxster",msrp: 64000, trims: ["Base", "S", "GTS 4.0", "Spyder", "Spyder RS"] },
    { name: "718 Cayman", msrp: 64000, trims: ["Base", "S", "T", "GTS 4.0", "GT4", "GT4 RS"] },
    { name: "911",         msrp: 110000, trims: ["Carrera", "Carrera Cabriolet", "Carrera S", "Carrera 4S", "Targa 4S", "GTS", "GT3", "GT3 RS", "Turbo", "Turbo S"] },
    { name: "Cayenne",     msrp: 70000, trims: ["Base", "E-Hybrid", "S", "GTS", "Coupe", "S Coupe", "Turbo", "Turbo GT"] },
    { name: "Macan",       msrp: 60000, trims: ["Base", "S", "GTS", "Turbo", "Electric Base", "Electric 4", "Electric 4S", "Electric Turbo"] },
    { name: "Panamera",    msrp: 90000, trims: ["Base", "4", "4S", "4S E-Hybrid", "GTS", "Turbo S E-Hybrid", "Turbo", "4 E-Hybrid"] },
    { name: "Taycan",      msrp: 90000, trims: ["Base", "4S", "GTS", "Turbo", "Turbo S", "Turbo GT", "Sport Turismo 4S", "Sport Turismo GTS", "Cross Turismo 4S"] },
  ],

  // ── Ram ──────────────────────────────────────────────────────────────────
  Ram: [
    { name: "1500",         msrp: 46000, trims: ["Tradesman", "Big Horn", "Lone Star", "Laramie", "Rebel", "TRX", "Laramie Longhorn", "Limited", "Limited 10th Anniversary", "Limited Longhorn"] },
    { name: "1500 Classic", msrp: 36000, trims: ["Tradesman", "Big Horn", "Lone Star", "Warlock", "Laramie", "Express"] },
    { name: "2500",         msrp: 52000, trims: ["Tradesman", "Big Horn", "Lone Star", "Laramie", "Power Wagon", "Laramie Longhorn", "Limited"] },
    { name: "3500",         msrp: 58000, trims: ["Tradesman", "Big Horn", "Lone Star", "Laramie", "Laramie Longhorn", "Limited"] },
    { name: "ProMaster",    msrp: 38000, trims: ["1500 Low Roof Cargo", "1500 High Roof Cargo", "2500 High Roof Cargo", "3500 Extended High Roof Cargo"] },
    { name: "ProMaster City",msrp: 26000, trims: ["Tradesman", "ST", "SLT"] },
  ],

  // ── Subaru ───────────────────────────────────────────────────────────────
  Subaru: [
    { name: "Ascent",      msrp: 36000, trims: ["Base", "Premium", "Limited", "Touring"] },
    { name: "BRZ",         msrp: 30000, trims: ["Base", "Premium", "Limited", "tS"] },
    { name: "Crosstrek",   msrp: 26000, trims: ["Base", "Premium", "Sport", "Limited", "Outdoor", "Plug-In Hybrid", "Wilderness"] },
    { name: "Forester",    msrp: 28000, trims: ["Base", "Premium", "Sport", "Limited", "Touring", "Wilderness"] },
    { name: "Impreza",     msrp: 22000, trims: ["Base", "Premium", "Sport", "Limited RS"] },
    { name: "Legacy",      msrp: 24000, trims: ["Base", "Premium", "Sport", "Limited", "Touring XT"] },
    { name: "Outback",     msrp: 30000, trims: ["Base", "Premium", "Onyx Edition", "Limited", "Limited XT", "Sport", "Touring", "Touring XT", "Wilderness"] },
    { name: "Solterra",    msrp: 44000, trims: ["Base", "Premium", "Limited", "Touring"] },
    { name: "WRX",         msrp: 30000, trims: ["Base", "Premium", "Limited", "GT", "STI", "STI S209"] },
  ],

  // ── Tesla ────────────────────────────────────────────────────────────────
  Tesla: [
    { name: "Cybertruck", msrp: 68000, trims: ["RWD", "Foundation Series AWD", "AWD", "Cyberbeast"] },
    { name: "Model 3",    msrp: 44000, trims: ["Standard Range RWD", "Long Range AWD", "Performance", "Highland RWD", "Highland Long Range AWD", "Highland Performance"] },
    { name: "Model S",    msrp: 90000, trims: ["Base", "Plaid"] },
    { name: "Model X",    msrp: 98000, trims: ["Base", "Plaid"] },
    { name: "Model Y",    msrp: 50000, trims: ["Standard Range RWD", "Long Range AWD", "Performance", "Juniper RWD", "Juniper Long Range AWD", "Juniper Performance"] },
    { name: "Roadster",   msrp: 200000, trims: ["Base", "Founders Series"] },
  ],

  // ── Toyota ───────────────────────────────────────────────────────────────
  Toyota: [
    { name: "4Runner",        msrp: 40000, trims: ["SR5", "SR5 Premium", "TRD Sport", "TRD Off-Road", "TRD Off-Road Premium", "Limited", "Venture", "40th Anniversary", "TRD Pro"] },
    { name: "Avalon",         msrp: 38000, trims: ["XLE", "XSE", "Limited", "Touring", "Hybrid XLE", "Hybrid Limited"] },
    { name: "bZ4X",           msrp: 44000, trims: ["XLE", "XLE AWD", "Limited", "Limited AWD"] },
    { name: "C-HR",           msrp: 24000, trims: ["LE", "XLE", "XLE Premium", "Limited", "Nightshade"] },
    { name: "Camry",          msrp: 28000, trims: ["LE", "SE", "XSE", "XLE", "TRD", "Hybrid LE", "Hybrid SE", "Hybrid XSE", "Hybrid XLE"] },
    { name: "Corolla",        msrp: 23000, trims: ["L", "LE", "SE", "XSE", "XLE", "Apex Edition", "Hybrid LE", "Hybrid SE", "GR"] },
    { name: "Corolla Cross",  msrp: 24000, trims: ["L", "LE", "S", "XLE", "Hybrid S", "Hybrid SE", "Hybrid XLE"] },
    { name: "GR Supra",       msrp: 58000, trims: ["2.0", "3.0", "3.0 Premium", "A91-CF Edition", "A91-MT Edition"] },
    { name: "GR86",           msrp: 30000, trims: ["Base", "Premium"] },
    { name: "GR Corolla",     msrp: 36000, trims: ["Core", "Circuit Edition", "Morizo Edition"] },
    { name: "Highlander",     msrp: 38000, trims: ["L", "LE", "XLE", "Limited", "Platinum", "Hybrid LE", "Hybrid XLE", "Hybrid Limited", "Hybrid Platinum"] },
    { name: "Land Cruiser",   msrp: 58000, trims: ["1958 Edition", "First Edition"] },
    { name: "Mirai",          msrp: 50000, trims: ["XLE", "Limited"] },
    { name: "Prius",          msrp: 28000, trims: ["LE", "XLE", "Limited", "Prime SE", "Prime XSE", "Prime XSE Premium"] },
    { name: "RAV4",           msrp: 30000, trims: ["LE", "XLE", "XLE Premium", "TRD Off-Road", "Adventure", "Limited", "Hybrid LE", "Hybrid XLE", "Hybrid XSE", "Hybrid XLE Premium", "Hybrid Limited", "Prime SE", "Prime XSE", "Prime XSE Premium"] },
    { name: "Sequoia",        msrp: 58000, trims: ["SR5", "Limited", "Platinum", "Capstone", "TRD Pro"] },
    { name: "Sienna",         msrp: 36000, trims: ["LE", "XLE", "XSE", "Limited", "Platinum"] },
    { name: "Tacoma",         msrp: 34000, trims: ["SR", "SR5", "TRD Sport", "TRD Off-Road", "TRD Pro", "Limited", "Trail Edition", "Trailhunter", "PreRunner SR5"] },
    { name: "Tundra",         msrp: 42000, trims: ["SR", "SR5", "Limited", "Platinum", "1794 Edition", "Capstone", "TRD Pro"] },
    { name: "Venza",          msrp: 34000, trims: ["LE", "XLE", "Limited"] },
    { name: "Yaris",          msrp: 16000, trims: ["L", "LE"] },
  ],

  // ── Volkswagen ───────────────────────────────────────────────────────────
  Volkswagen: [
    { name: "Atlas",         msrp: 38000, trims: ["S", "SE", "SE with Technology", "SEL", "SEL R-Line", "SEL Premium"] },
    { name: "Atlas Cross Sport", msrp: 36000, trims: ["S", "SE", "SE with Technology", "SEL", "SEL R-Line", "SEL Premium"] },
    { name: "Golf",          msrp: 26000, trims: ["S", "SE", "SEL"] },
    { name: "Golf GTI",      msrp: 32000, trims: ["S", "SE", "Autobahn", "Project R"] },
    { name: "Golf R",        msrp: 44000, trims: ["Base", "20 Years Edition"] },
    { name: "ID.4",          msrp: 40000, trims: ["Standard", "S", "Pro", "Pro AWD", "Pro S", "Pro S AWD", "Pro S Plus AWD"] },
    { name: "Jetta",         msrp: 22000, trims: ["S", "Sport", "SE", "SEL", "GLI S", "GLI 35th Anniversary", "GLI Autobahn"] },
    { name: "Passat",        msrp: 26000, trims: ["S", "SE", "R-Line", "SEL"] },
    { name: "Taos",          msrp: 26000, trims: ["S", "SE", "SE FWD", "SEL", "SEL FWD"] },
    { name: "Tiguan",        msrp: 30000, trims: ["S", "SE", "SE R-Line Black", "SEL", "SEL R-Line", "SEL Premium"] },
  ],

  // ── Volvo ────────────────────────────────────────────────────────────────
  Volvo: [
    { name: "C40 Recharge",  msrp: 56000, trims: ["Core", "Plus", "Ultimate"] },
    { name: "EX30",          msrp: 36000, trims: ["Core", "Plus", "Ultra Single Motor", "Plus Twin Motor Performance"] },
    { name: "EX90",          msrp: 80000, trims: ["Core", "Plus", "Ultra Twin Motor Performance"] },
    { name: "S60",           msrp: 40000, trims: ["B5 Momentum", "B5 R-Design", "B6 R-Design", "T8 R-Design", "T8 Polestar Engineered"] },
    { name: "S90",           msrp: 58000, trims: ["B6 Momentum", "B6 R-Design", "T8 Recharge"] },
    { name: "V60",           msrp: 42000, trims: ["B5 Momentum", "B5 R-Design", "T8 R-Design"] },
    { name: "V90",           msrp: 56000, trims: ["B6 Momentum", "B6 R-Design", "T8 R-Design"] },
    { name: "XC40",          msrp: 42000, trims: ["Core", "Plus", "Ultra", "Recharge Core", "Recharge Plus", "Recharge Ultimate"] },
    { name: "XC60",          msrp: 48000, trims: ["B5 Momentum", "B5 Plus", "B5 Ultimate", "B6 R-Design", "T8 R-Design", "T8 Ultimate"] },
    { name: "XC90",          msrp: 58000, trims: ["Core", "Plus", "Ultimate", "T8 Recharge Core", "T8 Recharge Plus", "T8 Recharge Ultimate"] },
  ],
};

/** Sorted list of all makes */
export const ALL_MAKES = Object.keys(CAR_DATABASE).sort();

/** Get models for a make */
export function getModels(make: string): ModelEntry[] {
  return CAR_DATABASE[make] ?? [];
}

/** Get trim names for a make+model */
export function getTrims(make: string, model: string): string[] {
  return getModels(make).find((m) => m.name === model)?.trims ?? [];
}

/** Get MSRP for a make+model (trim-aware) */
export function getModelMSRP(make: string, model: string): number {
  const entry = getModels(make).find((m) => m.name === model);
  return entry?.msrp ?? 32000;
}

/**
 * Trim-level price multiplier.
 * Used to adjust model base price based on trim.
 */
export function getTrimMultiplier(trimName: string): number {
  const t = trimName.toLowerCase();

  // Performance / AMG / M / SVR / Nismo / Type R etc.
  if (/\b(svr|blackwing|hellcat redeye|demon|super stock|scat pack 392|hellcat|shelby gt500|gt3 rs|gt4 rs|spyder rs|turbo s|rs q8|s8|m8|m5|m3|m4 csl|m4 cs|m3 cs|amg g 63|amg c 63|amg e 63|amg gls 63|amg gle 63|quadrifoglio|nismo|type r|evolution mr|trackhawk|trd pro|raptor r|srt 392|zl1 1le|corvette zr1|z06|e-ray)\b/.test(t)) return 1.65;
  if (/\b(gt500|plaid|taycan turbo|911 turbo|gt3|gt4|m4 competition|m3 competition|m5 competition|amg|gt performance|zl1|hellcat|trd pro|nismo|type r|rs |svr|blackwing|v-series blackwing)\b/.test(t)) return 1.50;
  if (/\b(m40i|m50|m60i|m35i|s line|competition|performance|rs |r-sport|gt-line|st-line|trd sport|n line|scat pack|trail boss|at4x|tremor|trx|rebellion|trd off-road|sport turbo|turbo$|turbo premium|a91)\b/.test(t)) return 1.25;

  // Top-tier trim keywords
  if (/\b(platinum|king ranch|high country|denali|calligraphy|prestige|signature|autograph|black label|pinnacle|capstone|ultra luxury|ultra|1794|laramie longhorn|limited longhorn|summit reserve|grand touring|touring xt|premier|elite|sl plus|sl\b|first edition|maybach)\b/.test(t)) return 1.30;

  // Upper-mid trim keywords
  if (/\b(limited|overland|lariat|laramie|reserve|avenir|navigator|titanium|sel premium|awd prestige|q8 prestige|s prestige|hsе|black diamond|touring|ex-l|xle|xse|ltz|slt|denali|f sport|r-design|autobahn|prestige)\b/.test(t)) return 1.18;

  // Mid trim keywords
  if (/\b(sel|se|sle|xle|exl|xlt|sl|sv|ex|sport|se sport|ltz|slt|at4|xdrive40|lariat|r-dynamic|trd|premium|preferred|advanced|technology|luxe|sensory|luxury|essence|impression)\b/.test(t)) return 1.05;

  // Entry / base trim keywords
  if (/\b(s\b|l\b|le\b|lx\b|base|entry|sr\b|sr5\b|tradesman|wt\b|xl\b|se\b|ls\b|lt\b|wd\b|s plus|core|wind|standard range|rwd|fwd)\b/.test(t)) return 0.88;

  return 1.00; // default
}
