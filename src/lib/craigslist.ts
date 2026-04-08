/**
 * Craigslist regional listing scraper.
 *
 * Craigslist provides a public JSON search endpoint used here to gather
 * regional asking prices for comparable vehicles. This is purely
 * additive — if the request fails or returns bad data, the system
 * falls back gracefully to the statistical model.
 *
 * ZIP code → Craigslist subdomain mapping covers every major US metro.
 */

import type { CarInput, PriceRange } from "./types";

// ZIP prefix (first 3 digits) → Craigslist subdomain
const ZIP_TO_CL: Record<string, string> = {
  // New England
  "010":"boston","011":"boston","012":"boston","013":"boston","014":"boston",
  "015":"boston","016":"boston","017":"boston","018":"boston","019":"boston",
  "020":"boston","021":"boston","022":"boston","023":"boston","024":"boston",
  "028":"providence","029":"providence",
  "030":"nh","031":"nh","032":"nh","033":"nh","034":"nh","035":"nh",
  "036":"nh","037":"nh","038":"nh",
  "039":"maine","040":"maine","041":"maine","042":"maine","043":"maine",
  "044":"maine","045":"maine","046":"maine","047":"maine","048":"maine","049":"maine",
  "060":"newhaven","061":"newhaven","062":"newhaven","063":"newhaven","064":"newhaven",
  "065":"hartford","066":"hartford","067":"hartford","068":"hartford","069":"hartford",
  // New York / NJ
  "070":"newjersey","071":"newjersey","072":"newjersey","073":"newjersey","074":"newjersey",
  "075":"newjersey","076":"newjersey","077":"newjersey","078":"newjersey","079":"newjersey",
  "080":"southjersey","081":"southjersey","082":"southjersey","083":"southjersey",
  "084":"southjersey","085":"newjersey","086":"newjersey","087":"newjersey",
  "100":"newyork","101":"newyork","102":"newyork","103":"newyork","104":"newyork",
  "105":"westchester","106":"westchester","107":"westchester","108":"westchester","109":"westchester",
  "110":"longisland","111":"longisland","112":"longisland","113":"longisland","114":"longisland",
  "115":"longisland","116":"longisland","117":"longisland","118":"longisland","119":"longisland",
  "120":"albany","121":"albany","122":"albany","123":"albany","124":"albany",
  "125":"hudsonvalley","126":"hudsonvalley","127":"hudsonvalley","128":"hudsonvalley",
  "130":"syracuse","131":"syracuse","132":"syracuse","133":"utica","134":"utica",
  "140":"rochester","141":"rochester","142":"rochester","143":"rochester",
  "144":"rochester","145":"rochester","146":"rochester","147":"rochester",
  "148":"ithaca","149":"ithaca",
  // Pennsylvania / Delaware / DC
  "150":"pittsburgh","151":"pittsburgh","152":"pittsburgh","153":"pittsburgh","154":"pittsburgh",
  "155":"pittsburgh","156":"pittsburgh","157":"pittsburgh","158":"pittsburgh","159":"pittsburgh",
  "160":"pittsburgh","161":"pittsburgh","162":"pittsburgh","163":"pittsburgh",
  "170":"harrisburg","171":"harrisburg","172":"harrisburg","173":"harrisburg","174":"harrisburg",
  "175":"harrisburg","176":"harrisburg","177":"harrisburg","178":"harrisburg","179":"harrisburg",
  "190":"philadelphia","191":"philadelphia","192":"philadelphia","193":"philadelphia",
  "194":"philadelphia","195":"philadelphia","196":"philadelphia",
  "197":"delaware","198":"delaware","199":"delaware",
  "200":"washingtondc","201":"washingtondc","202":"washingtondc","203":"washingtondc",
  "204":"washingtondc","205":"washingtondc",
  "206":"baltimore","207":"baltimore","208":"baltimore","209":"baltimore",
  "210":"baltimore","211":"baltimore","212":"baltimore","214":"baltimore",
  // Virginia / WV
  "220":"washingtondc","221":"washingtondc","222":"washingtondc","223":"washingtondc",
  "224":"norfolk","225":"norfolk","226":"norfolk","227":"norfolk","228":"norfolk",
  "229":"norfolk","230":"norfolk","231":"norfolk","232":"norfolk","233":"norfolk",
  "234":"norfolk","235":"norfolk","236":"norfolk","237":"norfolk","238":"richmond",
  "239":"richmond","240":"roanoke","241":"roanoke","242":"roanoke","243":"roanoke",
  "247":"charlestonwv","248":"charlestonwv","249":"charlestonwv","250":"charlestonwv",
  "251":"charlestonwv","252":"charlestonwv","253":"charlestonwv","254":"charlestonwv",
  // NC / SC
  "270":"triangle","271":"triangle","272":"triangle","273":"triangle","274":"triangle",
  "275":"triangle","276":"triangle","277":"triangle","278":"triangle","279":"triangle",
  "280":"charlotte","281":"charlotte","282":"charlotte","283":"charlotte","284":"charlotte",
  "285":"charlotte","286":"charlotte","287":"charlotte","288":"charlotte","289":"charlotte",
  "290":"columbia","291":"columbia","292":"columbia","293":"columbia","294":"columbia",
  "295":"columbia","296":"columbia","297":"columbia","298":"columbia","299":"hiltonhead",
  // Georgia / Florida
  "300":"atlanta","301":"atlanta","302":"atlanta","303":"atlanta","304":"atlanta",
  "305":"atlanta","306":"atlanta","307":"atlanta","308":"atlanta","309":"atlanta",
  "310":"savannah","311":"savannah","312":"savannah","313":"savannah","314":"savannah",
  "315":"savannah","316":"savannah","317":"savannah","318":"savannah","319":"savannah",
  "320":"jacksonville","321":"jacksonville","322":"jacksonville","323":"jacksonville",
  "324":"tallahassee","325":"tallahassee","326":"tallahassee","327":"orlando",
  "328":"orlando","329":"orlando","330":"miami","331":"miami","332":"miami",
  "333":"miami","334":"miami","335":"tampabay","336":"tampabay","337":"tampabay",
  "338":"tampabay","339":"sarasota","340":"miami","341":"southflorida",
  // Alabama / Tennessee / Mississippi
  "350":"birmingham","351":"birmingham","352":"birmingham","354":"tuscaloosa",
  "355":"birmingham","356":"huntsville","357":"huntsville","358":"huntsville",
  "359":"huntsville","360":"montgomery","361":"montgomery","362":"montgomery",
  "370":"nashville","371":"nashville","372":"nashville","373":"nashville",
  "374":"nashville","376":"nashville","377":"knoxville","378":"knoxville",
  "379":"knoxville","380":"memphis","381":"memphis","382":"memphis",
  "383":"memphis","384":"memphis","385":"memphis",
  "386":"gulfport","387":"gulfport","388":"gulfport","389":"gulfport",
  "390":"jackson","391":"jackson","392":"jackson","393":"jackson",
  // Kentucky / Ohio
  "400":"louisville","401":"louisville","402":"louisville","403":"louisville",
  "404":"louisville","405":"lexington","406":"lexington","407":"lexington",
  "408":"lexington","409":"lexington","410":"lexington","411":"lexington",
  "412":"lexington","413":"lexington","414":"lexington","415":"lexington",
  "430":"columbus","431":"columbus","432":"columbus","433":"columbus",
  "434":"columbus","435":"columbus","436":"columbus","437":"columbus",
  "438":"columbus","439":"columbus","440":"cleveland","441":"cleveland",
  "442":"cleveland","443":"cleveland","444":"cleveland","445":"youngstown",
  "446":"youngstown","447":"youngstown","448":"akron","449":"akron",
  "450":"dayton","451":"dayton","452":"dayton","453":"dayton","454":"dayton",
  "455":"dayton","456":"dayton","457":"dayton","458":"dayton",
  // Indiana
  "460":"indianapolis","461":"indianapolis","462":"indianapolis","463":"indianapolis",
  "464":"southbend","465":"southbend","466":"southbend",
  "470":"indianapolis","471":"evansville","472":"evansville","473":"muncie",
  "474":"bloomington","475":"bloomington","476":"fortwayne","477":"fortwayne",
  // Michigan
  "480":"detroit","481":"detroit","482":"detroit","483":"detroit","484":"annarbor",
  "485":"flint","486":"flint","487":"flint","488":"lansing","489":"lansing",
  "490":"kalamazoo","491":"kalamazoo","492":"grandrapids","493":"grandrapids",
  "494":"grandrapids","495":"grandrapids","496":"grandrapids","497":"grandrapids",
  "498":"up","499":"up",
  // Iowa / Wisconsin / Minnesota
  "500":"desmoines","501":"desmoines","502":"desmoines","503":"desmoines",
  "504":"desmoines","505":"desmoines","506":"desmoines","507":"desmoines",
  "508":"desmoines","509":"desmoines","510":"desmoines","511":"desmoines",
  "512":"desmoines","513":"desmoines","514":"desmoines","515":"desmoines",
  "516":"desmoines",
  "530":"milwaukee","531":"milwaukee","534":"madison","535":"madison",
  "537":"madison","538":"milwaukee","539":"appleton","540":"greenbay",
  "541":"greenbay","542":"greenbay","543":"greenbay","544":"greenbay",
  "545":"greenbay","546":"lacrosse","547":"lacrosse","548":"lacrosse","549":"lacrosse",
  "550":"minneapolis","551":"minneapolis","553":"minneapolis","554":"minneapolis",
  "555":"minneapolis","556":"minneapolis","557":"minneapolis","558":"duluth",
  "559":"duluth",
  // Dakotas / Montana / Wyoming
  "570":"southdakota","571":"southdakota","572":"southdakota","573":"southdakota",
  "574":"southdakota","575":"southdakota","576":"southdakota","577":"southdakota",
  "580":"fargo","581":"fargo","582":"fargo","583":"fargo","584":"fargo",
  "585":"fargo","586":"fargo","587":"fargo","588":"fargo",
  "590":"billings","591":"billings","592":"billings","593":"billings",
  "594":"billings","595":"billings","596":"billings","597":"billings",
  "598":"billings","599":"billings",
  // Illinois / Missouri / Kansas / Nebraska
  "600":"chicago","601":"chicago","602":"chicago","603":"chicago","604":"chicago",
  "605":"chicago","606":"chicago","607":"chicago","608":"chicago","609":"chicago",
  "610":"chicago","611":"chicago","612":"chicago","613":"chicago","614":"chicago",
  "615":"chicago","616":"chicago","617":"chicago","618":"peoria","619":"peoria",
  "620":"springfieldil","622":"springfieldil","623":"springfieldil",
  "624":"springfieldil","625":"springfieldil","626":"springfieldil",
  "630":"stlouis","631":"stlouis","633":"stlouis","634":"stlouis","635":"stlouis",
  "636":"stlouis","637":"stlouis","638":"stlouis","639":"stlouis",
  "640":"kansascity","641":"kansascity","644":"kansascity","645":"kansascity",
  "646":"kansascity","647":"kansascity","648":"kansascity",
  "650":"springfieldmo","651":"springfieldmo","652":"springfieldmo",
  "653":"springfieldmo","654":"springfieldmo","655":"springfieldmo",
  "660":"wichita","661":"wichita","662":"wichita","664":"topeka",
  "665":"topeka","666":"topeka","667":"topeka",
  "680":"omaha","681":"omaha","683":"lincoln","684":"lincoln",
  "685":"lincoln","686":"lincoln","687":"lincoln","688":"lincoln",
  // Louisiana / Arkansas / Oklahoma
  "700":"neworleans","701":"neworleans","703":"batonrouge","704":"batonrouge",
  "705":"lafayette","706":"lafayette","707":"shreveport","708":"shreveport",
  "710":"shreveport","711":"shreveport","712":"shreveport",
  "716":"arkansas","717":"arkansas","718":"arkansas","719":"arkansas",
  "720":"arkansas","721":"arkansas","722":"littlerock","723":"littlerock",
  "724":"littlerock","725":"arkansas","726":"arkansas","727":"arkansas",
  "730":"oklahoma","731":"oklahoma","733":"oklahoma","734":"oklahoma",
  "735":"oklahoma","736":"oklahoma","737":"oklahoma","738":"oklahoma",
  "739":"oklahoma","740":"tulsa","741":"tulsa","743":"tulsa",
  "744":"tulsa","745":"tulsa","746":"tulsa","747":"tulsa","748":"lawton",
  // Texas
  "750":"dallas","751":"dallas","752":"dallas","753":"dallas","754":"dallas",
  "755":"dallas","756":"dallas","757":"dallas","758":"dallas","759":"dallas",
  "760":"fortworth","761":"fortworth","762":"fortworth","763":"fortworth",
  "764":"waco","765":"waco","766":"abilene","767":"abilene","768":"abilene",
  "769":"abilene","770":"houston","771":"houston","772":"houston","773":"houston",
  "774":"houston","775":"houston","776":"houston","777":"houston","778":"houston",
  "779":"houston","780":"sanantonio","781":"sanantonio","782":"sanantonio",
  "783":"sanantonio","784":"sanantonio","785":"sanantonio","786":"austin",
  "787":"austin","788":"austin","789":"austin","790":"amarillo","791":"amarillo",
  "792":"amarillo","793":"lubbock","794":"lubbock","795":"lubbock","796":"abilene",
  "797":"abilene","798":"elpaso","799":"elpaso",
  // Colorado / Wyoming / New Mexico / Arizona / Nevada
  "800":"denver","801":"denver","802":"denver","803":"denver","804":"denver",
  "805":"denver","806":"denver","807":"denver","808":"denver","809":"denver",
  "810":"denver","811":"denver","812":"puebloco","813":"puebloco","814":"puebloco",
  "820":"wyoming","821":"wyoming","822":"wyoming","823":"wyoming","824":"wyoming",
  "825":"wyoming","826":"wyoming","827":"wyoming","828":"wyoming","829":"wyoming",
  "830":"wyoming","831":"wyoming",
  "840":"utah","841":"saltlakecity","842":"saltlakecity","843":"saltlakecity",
  "844":"utah","845":"utah","846":"utah","847":"utah",
  "850":"phoenix","851":"phoenix","852":"phoenix","853":"phoenix","855":"phoenix",
  "856":"tucson","857":"tucson","859":"tucson","860":"flagstaff",
  "863":"phoenix","864":"phoenix","865":"phoenix",
  "870":"albuquerque","871":"albuquerque","872":"albuquerque","873":"albuquerque",
  "874":"albuquerque","875":"albuquerque","877":"albuquerque","878":"albuquerque",
  "879":"albuquerque","880":"elpaso","881":"elpaso","882":"elpaso",
  "889":"lasvegas","890":"lasvegas","891":"lasvegas","893":"lasvegas",
  "894":"reno","895":"reno","897":"reno","898":"reno",
  // California
  "900":"losangeles","901":"losangeles","902":"losangeles","903":"losangeles",
  "904":"losangeles","905":"losangeles","906":"losangeles","907":"losangeles",
  "908":"losangeles","909":"inlandempire","910":"losangeles","911":"losangeles",
  "912":"losangeles","913":"losangeles","914":"losangeles","915":"losangeles",
  "916":"losangeles","917":"losangeles","918":"losangeles","919":"sandiego",
  "920":"sandiego","921":"sandiego","922":"sandiego","923":"sandiego",
  "924":"sandiego","925":"sfbay","926":"orangecounty","927":"orangecounty",
  "928":"inlandempire","929":"inlandempire","930":"ventura","931":"ventura",
  "932":"bakersfield","933":"bakersfield","934":"bakersfield","935":"bakersfield",
  "936":"fresno","937":"fresno","938":"fresno","939":"monterey",
  "940":"sfbay","941":"sfbay","942":"sfbay","943":"sfbay","944":"sfbay",
  "945":"sfbay","946":"sfbay","947":"sfbay","948":"sfbay","949":"sfbay",
  "950":"sfbay","951":"sfbay","952":"sfbay","953":"sfbay","954":"sfbay",
  "955":"sfbay","956":"sacramento","957":"sacramento","958":"sacramento",
  "959":"redding","960":"redding","961":"reno",
  // Oregon / Washington / Alaska / Hawaii
  "970":"portland","971":"portland","972":"portland","973":"portland",
  "974":"portland","975":"portland","976":"portland","977":"medford",
  "978":"corvallis","979":"corvallis",
  "980":"seattle","981":"seattle","982":"seattle","983":"seattle",
  "984":"tacoma","985":"tacoma","986":"seattle","988":"yakima",
  "989":"spokane","990":"spokane","991":"spokane","992":"spokane",
  "993":"tricities","994":"tricities",
  "995":"anchorage","996":"anchorage","997":"anchorage","998":"anchorage","999":"anchorage",
  "967":"honolulu","968":"honolulu",
};

function getRegionForZip(zipCode: string): string | null {
  const prefix = zipCode.slice(0, 3);
  return ZIP_TO_CL[prefix] ?? null;
}

/**
 * Scrape Craigslist for comparable vehicle listings near the user's ZIP.
 * Returns median + low/high of filtered prices, or null on any failure.
 */
export async function fetchCraigslistPrices(
  input: CarInput
): Promise<PriceRange | null> {
  const region = getRegionForZip(input.zipCode);
  if (!region) return null;

  // Build query: make + model (not trim — too narrow)
  const query = encodeURIComponent(`${input.make} ${input.model}`);

  // ±2 years from target year gives more comparable listings
  const minYear = input.year - 1;
  const maxYear = input.year + 1;

  // Price floor/ceiling to filter junk listings
  const minPrice = 1000;
  const maxPrice = input.askingPrice * 2.5;

  const url = [
    `https://${region}.craigslist.org/search/cta`,
    `?format=json`,
    `&auto_make_model=${query}`,
    `&min_auto_year=${minYear}`,
    `&max_auto_year=${maxYear}`,
    `&min_price=${minPrice}`,
    `&max_price=${maxPrice}`,
  ].join("");

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json, text/javascript, */*",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: `https://${region}.craigslist.org/`,
      },
      signal: AbortSignal.timeout(6000), // 6s timeout — don't block the response
    });

    if (!res.ok) return null;

    const raw = await res.json();

    // Craigslist JSON format can vary — handle both array and object shapes
    let items: unknown[] = [];
    if (Array.isArray(raw)) {
      items = raw;
    } else if (raw?.data?.result && Array.isArray(raw.data.result)) {
      items = raw.data.result;
    } else if (raw?.items && Array.isArray(raw.items)) {
      items = raw.items;
    } else if (raw?.results && Array.isArray(raw.results)) {
      items = raw.results;
    }

    if (!items.length) return null;

    // Extract prices — Craigslist returns price as "$18,500" string or as number
    const prices: number[] = items
      .map((item) => {
        const i = item as Record<string, unknown>;
        const raw = i.price ?? i.ask ?? i.listing_price;
        if (typeof raw === "number") return raw;
        if (typeof raw === "string") {
          const num = parseFloat(raw.replace(/[^0-9.]/g, ""));
          return isNaN(num) ? null : num;
        }
        return null;
      })
      .filter((p): p is number => p !== null && p >= 1000 && p <= 200000)
      .sort((a, b) => a - b);

    if (prices.length < 3) return null;

    // Trim outliers: drop lowest 10% and highest 10%
    const trimCount = Math.max(1, Math.floor(prices.length * 0.1));
    const trimmed = prices.slice(trimCount, prices.length - trimCount);
    if (!trimmed.length) return null;

    const median = trimmed[Math.floor(trimmed.length / 2)];
    return {
      low:      trimmed[Math.floor(trimmed.length * 0.1)],
      high:     trimmed[Math.floor(trimmed.length * 0.9)],
      midpoint: median,
    };
  } catch {
    // Network error, timeout, parse error — all non-fatal
    return null;
  }
}
