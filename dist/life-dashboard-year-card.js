// A year of any Home Assistant sensor as a grid with one square per day, drawn from its
// long-term statistics. A single ES module with no dependencies and no build step; the pure
// data functions are exported so test/data.test.mjs can run them under Node.

export const VERSION = "0.1.0";

const TAG = "life-dashboard-year-card";
const PLATFORM = "life_dashboard";
const DAY = 86400000;
const STATS_TTL = 15 * 60000;
const MAX_BACK = 30;
const MAX_METRICS = 8;
const MARGIN = 32;

// What the card recognizes, for a color, a name and thresholds without any configuration.
// Thresholds are in steps or in hours; durations are converted to the statistic's unit.
const KINDS = {
  steps: { label: "mSteps", color: "var(--life-dashboard-year-steps, #30b77e)", thresholds: [4000, 7000, 10000] },
  sleep: { label: "mSleep", color: "var(--life-dashboard-year-sleep, #8f7ff7)", thresholds: [6, 7, 8], hours: true },
  screen: { label: "mScreen", color: "var(--life-dashboard-year-screen-time, #e0a030)", thresholds: [2, 3, 4], hours: true },
  workouts: { label: "mWorkouts", color: "var(--life-dashboard-year-workouts, #4a9be8)", thresholds: [0.5, 0.75, 1], hours: true },
};
const PALETTE = ["#30b77e", "#8f7ff7", "#e0a030", "#4a9be8", "#df566f", "#3fb8af"];

// The Life Dashboard integration keeps each phone's history as external statistics,
// `life_dashboard:<entry>_<key>`; these are the keys behind its sensors' translation keys.
const LD_KEYS = {
  steps_today: "steps",
  sleep_duration: "sleep_minutes",
  last_sleep_asleep: "sleep_asleep",
  screen_time_today: "screen_time",
  screen_time_yesterday: "screen_time",
  exercise_today: "exercise_minutes",
  exercise_yesterday: "exercise_minutes",
  distance_today: "distance",
  active_calories_today: "active_calories",
  total_calories_today: "total_calories",
};
const LD_KINDS = { steps: "steps", sleep_minutes: "sleep", sleep_asleep: "sleep", screen_time: "screen", exercise_minutes: "workouts" };
// The sensors offered first in the card picker, in this order.
const STUB_KEYS = ["steps_today", "sleep_duration", "screen_time_today", "exercise_today"];

const STRINGS = {
  en: {
    year: "Year",
    previous: "Previous year",
    next: "Next year",
    rangeTo: "{from} to {to}",
    average: "daily average",
    daysWith: "with data",
    daysAt: "at {value} or more",
    tableDays: "days with data",
    best: "best, {date}",
    less: "Less",
    more: "More",
    noData: "no data",
    startsOn: "Statistics start on {date}.",
    empty: "No statistics in this period.",
    noStats: "No statistics yet. A new sensor gets its first day within the hour, and the grid fills in from there.",
    error: "Home Assistant could not read the statistics.",
    pickTitle: "Choose a sensor",
    pickBody: "Add a sensor with long-term statistics in the card settings.",
    missingBody: "{entity} has no long-term statistics. A sensor needs a state class for them.",
    gridLabel: "{name} per day, {range}",
    gridHint: "Use the arrow keys to move between days.",
    tableCaption: "{name} per month, {range}",
    month: "Month",
    mSteps: "Steps",
    mSleep: "Sleep",
    mScreen: "Screen time",
    mWorkouts: "Workouts",
    edTitle: "Title (optional)",
    edPeriod: "Period",
    edCalendar: "Calendar year",
    edRolling: "Last 12 months",
    edLayout: "Layout",
    edTabs: "One metric at a time",
    edRows: "All metrics below each other",
    edMetrics: "Metrics",
    edEntity: "Sensor",
    edStatistic: "Statistic (instead of a sensor)",
    edName: "Name (optional)",
    edColor: "Color (optional)",
    edThresholds: "Thresholds, such as 4000, 7000, 10000 (optional)",
    edAggregate: "Value per day",
    aggAuto: "Automatic",
    aggSum: "Total of the day",
    aggMax: "Highest of the day",
    aggMean: "Average of the day",
    aggMin: "Lowest of the day",
  },
  nl: {
    year: "Jaar",
    previous: "Vorig jaar",
    next: "Volgend jaar",
    rangeTo: "{from} tot {to}",
    average: "gemiddeld per dag",
    daysWith: "met gegevens",
    daysAt: "met {value} of meer",
    tableDays: "dagen met gegevens",
    best: "beste, {date}",
    less: "Minder",
    more: "Meer",
    noData: "geen gegevens",
    startsOn: "De statistieken beginnen op {date}.",
    empty: "Geen statistieken in deze periode.",
    noStats: "Nog geen statistieken. Een nieuwe sensor krijgt binnen een uur zijn eerste dag, en daarna vult het raster zich.",
    error: "Home Assistant kon de statistieken niet lezen.",
    pickTitle: "Kies een sensor",
    pickBody: "Voeg in de kaartinstellingen een sensor met langetermijnstatistieken toe.",
    missingBody: "{entity} heeft geen langetermijnstatistieken. Een sensor heeft daarvoor een statusklasse nodig.",
    gridLabel: "{name} per dag, {range}",
    gridHint: "Gebruik de pijltjestoetsen om tussen dagen te bewegen.",
    tableCaption: "{name} per maand, {range}",
    month: "Maand",
    mSteps: "Stappen",
    mSleep: "Slaap",
    mScreen: "Schermtijd",
    mWorkouts: "Workouts",
    edTitle: "Titel (optioneel)",
    edPeriod: "Periode",
    edCalendar: "Kalenderjaar",
    edRolling: "Laatste 12 maanden",
    edLayout: "Indeling",
    edTabs: "Eén metriek tegelijk",
    edRows: "Alle metrieken onder elkaar",
    edMetrics: "Metrieken",
    edEntity: "Sensor",
    edStatistic: "Statistiek (in plaats van een sensor)",
    edName: "Naam (optioneel)",
    edColor: "Kleur (optioneel)",
    edThresholds: "Drempels, zoals 4000, 7000, 10000 (optioneel)",
    edAggregate: "Waarde per dag",
    aggAuto: "Automatisch",
    aggSum: "Totaal van de dag",
    aggMax: "Hoogste van de dag",
    aggMean: "Gemiddelde van de dag",
    aggMin: "Laagste van de dag",
  },
  de: {
    year: "Jahr",
    previous: "Vorheriges Jahr",
    next: "Nächstes Jahr",
    rangeTo: "{from} bis {to}",
    average: "pro Tag im Schnitt",
    daysWith: "mit Daten",
    daysAt: "mit {value} oder mehr",
    tableDays: "Tage mit Daten",
    best: "Bestwert, {date}",
    less: "Weniger",
    more: "Mehr",
    noData: "keine Daten",
    startsOn: "Die Statistiken beginnen am {date}.",
    empty: "Keine Statistiken in diesem Zeitraum.",
    noStats: "Noch keine Statistiken. Ein neuer Sensor bekommt innerhalb einer Stunde seinen ersten Tag, danach füllt sich das Raster.",
    error: "Home Assistant konnte die Statistiken nicht lesen.",
    pickTitle: "Sensor auswählen",
    pickBody: "Füge in den Karteneinstellungen einen Sensor mit Langzeitstatistiken hinzu.",
    missingBody: "{entity} hat keine Langzeitstatistiken. Ein Sensor braucht dafür eine Zustandsklasse.",
    gridLabel: "{name} pro Tag, {range}",
    gridHint: "Mit den Pfeiltasten zwischen den Tagen wechseln.",
    tableCaption: "{name} pro Monat, {range}",
    month: "Monat",
    mSteps: "Schritte",
    mSleep: "Schlaf",
    mScreen: "Bildschirmzeit",
    mWorkouts: "Workouts",
    edTitle: "Titel (optional)",
    edPeriod: "Zeitraum",
    edCalendar: "Kalenderjahr",
    edRolling: "Letzte 12 Monate",
    edLayout: "Layout",
    edTabs: "Eine Metrik zur Zeit",
    edRows: "Alle Metriken untereinander",
    edMetrics: "Metriken",
    edEntity: "Sensor",
    edStatistic: "Statistik (statt eines Sensors)",
    edName: "Name (optional)",
    edColor: "Farbe (optional)",
    edThresholds: "Schwellen, etwa 4000, 7000, 10000 (optional)",
    edAggregate: "Wert pro Tag",
    aggAuto: "Automatisch",
    aggSum: "Summe des Tages",
    aggMax: "Höchstwert des Tages",
    aggMean: "Durchschnitt des Tages",
    aggMin: "Tiefstwert des Tages",
  },
  es: {
    year: "Año",
    previous: "Año anterior",
    next: "Año siguiente",
    rangeTo: "{from} a {to}",
    average: "media diaria",
    daysWith: "con datos",
    daysAt: "con {value} o más",
    tableDays: "días con datos",
    best: "mejor, {date}",
    less: "Menos",
    more: "Más",
    noData: "sin datos",
    startsOn: "Las estadísticas empiezan el {date}.",
    empty: "No hay estadísticas en este periodo.",
    noStats: "Aún no hay estadísticas. Un sensor nuevo recibe su primer día en menos de una hora, y la cuadrícula se va completando.",
    error: "Home Assistant no pudo leer las estadísticas.",
    pickTitle: "Elige un sensor",
    pickBody: "Añade un sensor con estadísticas a largo plazo en los ajustes de la tarjeta.",
    missingBody: "{entity} no tiene estadísticas a largo plazo. Un sensor necesita una clase de estado para tenerlas.",
    gridLabel: "{name} por día, {range}",
    gridHint: "Usa las flechas para moverte entre los días.",
    tableCaption: "{name} por mes, {range}",
    month: "Mes",
    mSteps: "Pasos",
    mSleep: "Sueño",
    mScreen: "Tiempo de pantalla",
    mWorkouts: "Entrenamientos",
    edTitle: "Título (opcional)",
    edPeriod: "Periodo",
    edCalendar: "Año natural",
    edRolling: "Últimos 12 meses",
    edLayout: "Diseño",
    edTabs: "Una métrica cada vez",
    edRows: "Todas las métricas una debajo de otra",
    edMetrics: "Métricas",
    edEntity: "Sensor",
    edStatistic: "Estadística (en lugar de un sensor)",
    edName: "Nombre (opcional)",
    edColor: "Color (opcional)",
    edThresholds: "Umbrales, como 4000, 7000, 10000 (opcional)",
    edAggregate: "Valor por día",
    aggAuto: "Automático",
    aggSum: "Total del día",
    aggMax: "Máximo del día",
    aggMean: "Media del día",
    aggMin: "Mínimo del día",
  },
  fr: {
    year: "Année",
    previous: "Année précédente",
    next: "Année suivante",
    rangeTo: "{from} à {to}",
    average: "moyenne par jour",
    daysWith: "avec des données",
    daysAt: "à {value} ou plus",
    tableDays: "jours avec des données",
    best: "record, {date}",
    less: "Moins",
    more: "Plus",
    noData: "pas de données",
    startsOn: "Les statistiques commencent le {date}.",
    empty: "Aucune statistique sur cette période.",
    noStats: "Pas encore de statistiques. Un nouveau capteur reçoit son premier jour dans l'heure, puis la grille se remplit.",
    error: "Home Assistant n'a pas pu lire les statistiques.",
    pickTitle: "Choisissez un capteur",
    pickBody: "Ajoutez un capteur avec des statistiques à long terme dans les réglages de la carte.",
    missingBody: "{entity} n'a pas de statistiques à long terme. Un capteur a besoin d'une classe d'état pour en avoir.",
    gridLabel: "{name} par jour, {range}",
    gridHint: "Utilisez les flèches pour passer d'un jour à l'autre.",
    tableCaption: "{name} par mois, {range}",
    month: "Mois",
    mSteps: "Pas",
    mSleep: "Sommeil",
    mScreen: "Temps d'écran",
    mWorkouts: "Entraînements",
    edTitle: "Titre (facultatif)",
    edPeriod: "Période",
    edCalendar: "Année civile",
    edRolling: "12 derniers mois",
    edLayout: "Disposition",
    edTabs: "Une mesure à la fois",
    edRows: "Toutes les mesures l'une sous l'autre",
    edMetrics: "Mesures",
    edEntity: "Capteur",
    edStatistic: "Statistique (à la place d'un capteur)",
    edName: "Nom (facultatif)",
    edColor: "Couleur (facultatif)",
    edThresholds: "Seuils, par exemple 4000, 7000, 10000 (facultatif)",
    edAggregate: "Valeur par jour",
    aggAuto: "Automatique",
    aggSum: "Total du jour",
    aggMax: "Maximum du jour",
    aggMean: "Moyenne du jour",
    aggMin: "Minimum du jour",
  },
  it: {
    year: "Anno",
    previous: "Anno precedente",
    next: "Anno successivo",
    rangeTo: "da {from} a {to}",
    average: "media giornaliera",
    daysWith: "con dati",
    daysAt: "con {value} o più",
    tableDays: "giorni con dati",
    best: "migliore, {date}",
    less: "Meno",
    more: "Più",
    noData: "nessun dato",
    startsOn: "Le statistiche iniziano il {date}.",
    empty: "Nessuna statistica in questo periodo.",
    noStats: "Ancora nessuna statistica. Un nuovo sensore riceve il suo primo giorno entro un'ora, poi la griglia si riempie.",
    error: "Home Assistant non è riuscito a leggere le statistiche.",
    pickTitle: "Scegli un sensore",
    pickBody: "Aggiungi un sensore con statistiche a lungo termine nelle impostazioni della scheda.",
    missingBody: "{entity} non ha statistiche a lungo termine. A un sensore serve una classe di stato per averle.",
    gridLabel: "{name} per giorno, {range}",
    gridHint: "Usa i tasti freccia per spostarti tra i giorni.",
    tableCaption: "{name} per mese, {range}",
    month: "Mese",
    mSteps: "Passi",
    mSleep: "Sonno",
    mScreen: "Tempo di utilizzo",
    mWorkouts: "Allenamenti",
    edTitle: "Titolo (facoltativo)",
    edPeriod: "Periodo",
    edCalendar: "Anno solare",
    edRolling: "Ultimi 12 mesi",
    edLayout: "Disposizione",
    edTabs: "Una metrica alla volta",
    edRows: "Tutte le metriche una sotto l'altra",
    edMetrics: "Metriche",
    edEntity: "Sensore",
    edStatistic: "Statistica (al posto di un sensore)",
    edName: "Nome (facoltativo)",
    edColor: "Colore (facoltativo)",
    edThresholds: "Soglie, ad esempio 4000, 7000, 10000 (facoltativo)",
    edAggregate: "Valore per giorno",
    aggAuto: "Automatico",
    aggSum: "Totale del giorno",
    aggMax: "Massimo del giorno",
    aggMean: "Media del giorno",
    aggMin: "Minimo del giorno",
  },
  pt: {
    year: "Ano",
    previous: "Ano anterior",
    next: "Próximo ano",
    rangeTo: "{from} a {to}",
    average: "média diária",
    daysWith: "com dados",
    daysAt: "com {value} ou mais",
    tableDays: "dias com dados",
    best: "melhor, {date}",
    less: "Menos",
    more: "Mais",
    noData: "sem dados",
    startsOn: "As estatísticas começam em {date}.",
    empty: "Sem estatísticas neste período.",
    noStats: "Ainda sem estatísticas. Um sensor novo recebe seu primeiro dia em até uma hora, e a grade vai se completando.",
    error: "O Home Assistant não conseguiu ler as estatísticas.",
    pickTitle: "Escolha um sensor",
    pickBody: "Adicione um sensor com estatísticas de longo prazo nas configurações do cartão.",
    missingBody: "{entity} não tem estatísticas de longo prazo. Um sensor precisa de uma classe de estado para tê-las.",
    gridLabel: "{name} por dia, {range}",
    gridHint: "Use as setas para mover entre os dias.",
    tableCaption: "{name} por mês, {range}",
    month: "Mês",
    mSteps: "Passos",
    mSleep: "Sono",
    mScreen: "Tempo de tela",
    mWorkouts: "Treinos",
    edTitle: "Título (opcional)",
    edPeriod: "Período",
    edCalendar: "Ano civil",
    edRolling: "Últimos 12 meses",
    edLayout: "Layout",
    edTabs: "Uma métrica por vez",
    edRows: "Todas as métricas uma abaixo da outra",
    edMetrics: "Métricas",
    edEntity: "Sensor",
    edStatistic: "Estatística (em vez de um sensor)",
    edName: "Nome (opcional)",
    edColor: "Cor (opcional)",
    edThresholds: "Limites, como 4000, 7000, 10000 (opcional)",
    edAggregate: "Valor por dia",
    aggAuto: "Automático",
    aggSum: "Total do dia",
    aggMax: "Máximo do dia",
    aggMean: "Média do dia",
    aggMin: "Mínimo do dia",
  },
  ja: {
    year: "年間",
    previous: "前の年",
    next: "次の年",
    rangeTo: "{from} から {to}",
    average: "1日の平均",
    daysWith: "データあり",
    daysAt: "{value} 以上",
    tableDays: "データのある日数",
    best: "最高、{date}",
    less: "少ない",
    more: "多い",
    noData: "データなし",
    startsOn: "統計は {date} から始まります。",
    empty: "この期間の統計はありません。",
    noStats: "まだ統計がありません。新しいセンサーは1時間以内に最初の日が記録され、そこからグリッドが埋まります。",
    error: "Home Assistant が統計を読み取れませんでした。",
    pickTitle: "センサーを選択",
    pickBody: "カードの設定で長期統計のあるセンサーを追加してください。",
    missingBody: "{entity} には長期統計がありません。センサーには状態クラスが必要です。",
    gridLabel: "{name} の日別、{range}",
    gridHint: "矢印キーで日を移動します。",
    tableCaption: "{name} の月別、{range}",
    month: "月",
    mSteps: "歩数",
    mSleep: "睡眠",
    mScreen: "スクリーンタイム",
    mWorkouts: "ワークアウト",
    edTitle: "タイトル (任意)",
    edPeriod: "期間",
    edCalendar: "暦年",
    edRolling: "過去12か月",
    edLayout: "レイアウト",
    edTabs: "指標を1つずつ表示",
    edRows: "すべての指標を縦に並べる",
    edMetrics: "指標",
    edEntity: "センサー",
    edStatistic: "統計 (センサーの代わり)",
    edName: "名前 (任意)",
    edColor: "色 (任意)",
    edThresholds: "しきい値、例: 4000, 7000, 10000 (任意)",
    edAggregate: "1日の値",
    aggAuto: "自動",
    aggSum: "1日の合計",
    aggMax: "1日の最高値",
    aggMean: "1日の平均",
    aggMin: "1日の最低値",
  },
  zh: {
    year: "全年",
    previous: "上一年",
    next: "下一年",
    rangeTo: "{from} 至 {to}",
    average: "每日平均",
    daysWith: "有数据",
    daysAt: "达到 {value}",
    tableDays: "有数据的天数",
    best: "最佳，{date}",
    less: "少",
    more: "多",
    noData: "无数据",
    startsOn: "统计数据从 {date} 开始。",
    empty: "此期间没有统计数据。",
    noStats: "还没有统计数据。新传感器会在一小时内记录第一天，之后网格会逐渐填满。",
    error: "Home Assistant 无法读取统计数据。",
    pickTitle: "选择传感器",
    pickBody: "请在卡片设置中添加带有长期统计的传感器。",
    missingBody: "{entity} 没有长期统计。传感器需要状态类别才能产生统计。",
    gridLabel: "{name} 每日数据，{range}",
    gridHint: "使用方向键在日期之间移动。",
    tableCaption: "{name} 每月数据，{range}",
    month: "月份",
    mSteps: "步数",
    mSleep: "睡眠",
    mScreen: "屏幕使用时间",
    mWorkouts: "锻炼",
    edTitle: "标题（可选）",
    edPeriod: "时间范围",
    edCalendar: "自然年",
    edRolling: "最近 12 个月",
    edLayout: "布局",
    edTabs: "一次显示一个指标",
    edRows: "所有指标上下排列",
    edMetrics: "指标",
    edEntity: "传感器",
    edStatistic: "统计（代替传感器）",
    edName: "名称（可选）",
    edColor: "颜色（可选）",
    edThresholds: "阈值，例如 4000, 7000, 10000（可选）",
    edAggregate: "每日的值",
    aggAuto: "自动",
    aggSum: "当日总计",
    aggMax: "当日最高",
    aggMean: "当日平均",
    aggMin: "当日最低",
  },
  hi: {
    year: "साल",
    previous: "पिछला साल",
    next: "अगला साल",
    rangeTo: "{from} से {to}",
    average: "प्रति दिन औसत",
    daysWith: "डेटा के साथ",
    daysAt: "{value} या ज़्यादा",
    tableDays: "डेटा वाले दिन",
    best: "सबसे अच्छा, {date}",
    less: "कम",
    more: "ज़्यादा",
    noData: "कोई डेटा नहीं",
    startsOn: "आँकड़े {date} से शुरू होते हैं।",
    empty: "इस अवधि में कोई आँकड़े नहीं।",
    noStats: "अभी कोई आँकड़े नहीं। नए सेंसर का पहला दिन एक घंटे के अंदर आता है, और फिर ग्रिड भरता जाता है।",
    error: "Home Assistant आँकड़े नहीं पढ़ सका।",
    pickTitle: "सेंसर चुनें",
    pickBody: "कार्ड की सेटिंग में दीर्घकालिक आँकड़ों वाला सेंसर जोड़ें।",
    missingBody: "{entity} के दीर्घकालिक आँकड़े नहीं हैं। इसके लिए सेंसर को स्टेट क्लास चाहिए।",
    gridLabel: "{name} प्रति दिन, {range}",
    gridHint: "दिनों के बीच जाने के लिए तीर कुंजियों का इस्तेमाल करें।",
    tableCaption: "{name} प्रति महीना, {range}",
    month: "महीना",
    mSteps: "कदम",
    mSleep: "नींद",
    mScreen: "स्क्रीन टाइम",
    mWorkouts: "वर्कआउट",
    edTitle: "शीर्षक (वैकल्पिक)",
    edPeriod: "अवधि",
    edCalendar: "कैलेंडर वर्ष",
    edRolling: "पिछले 12 महीने",
    edLayout: "लेआउट",
    edTabs: "एक बार में एक मेट्रिक",
    edRows: "सभी मेट्रिक एक के नीचे एक",
    edMetrics: "मेट्रिक",
    edEntity: "सेंसर",
    edStatistic: "आँकड़ा (सेंसर की जगह)",
    edName: "नाम (वैकल्पिक)",
    edColor: "रंग (वैकल्पिक)",
    edThresholds: "सीमाएँ, जैसे 4000, 7000, 10000 (वैकल्पिक)",
    edAggregate: "प्रति दिन का मान",
    aggAuto: "स्वचालित",
    aggSum: "दिन का कुल",
    aggMax: "दिन का सबसे ज़्यादा",
    aggMean: "दिन का औसत",
    aggMin: "दिन का सबसे कम",
  },
  ar: {
    year: "السنة",
    previous: "السنة السابقة",
    next: "السنة التالية",
    rangeTo: "{from} إلى {to}",
    average: "المتوسط اليومي",
    daysWith: "فيها بيانات",
    daysAt: "بلغت {value} أو أكثر",
    tableDays: "أيام فيها بيانات",
    best: "الأفضل، {date}",
    less: "أقل",
    more: "أكثر",
    noData: "لا توجد بيانات",
    startsOn: "تبدأ الإحصاءات في {date}.",
    empty: "لا توجد إحصاءات في هذه الفترة.",
    noStats: "لا توجد إحصاءات بعد. يحصل المستشعر الجديد على يومه الأول خلال ساعة، ثم تمتلئ الشبكة.",
    error: "تعذّر على Home Assistant قراءة الإحصاءات.",
    pickTitle: "اختر مستشعرًا",
    pickBody: "أضف مستشعرًا له إحصاءات طويلة المدى في إعدادات البطاقة.",
    missingBody: "{entity} ليس له إحصاءات طويلة المدى. يحتاج المستشعر إلى فئة حالة للحصول عليها.",
    gridLabel: "{name} لكل يوم، {range}",
    gridHint: "استخدم مفاتيح الأسهم للتنقل بين الأيام.",
    tableCaption: "{name} لكل شهر، {range}",
    month: "الشهر",
    mSteps: "الخطوات",
    mSleep: "النوم",
    mScreen: "وقت الشاشة",
    mWorkouts: "التمارين",
    edTitle: "العنوان (اختياري)",
    edPeriod: "الفترة",
    edCalendar: "سنة تقويمية",
    edRolling: "آخر 12 شهرًا",
    edLayout: "التخطيط",
    edTabs: "مقياس واحد في كل مرة",
    edRows: "كل المقاييس تحت بعضها",
    edMetrics: "المقاييس",
    edEntity: "المستشعر",
    edStatistic: "إحصائية (بدل المستشعر)",
    edName: "الاسم (اختياري)",
    edColor: "اللون (اختياري)",
    edThresholds: "العتبات، مثل 4000, 7000, 10000 (اختياري)",
    edAggregate: "القيمة لكل يوم",
    aggAuto: "تلقائي",
    aggSum: "مجموع اليوم",
    aggMax: "أعلى قيمة في اليوم",
    aggMean: "متوسط اليوم",
    aggMin: "أدنى قيمة في اليوم",
  },
};

/** Every language that lacks a text English has, as [language, key]; the tests want none. */
export function missingStrings() {
  const keys = Object.keys(STRINGS.en);
  return Object.entries(STRINGS).flatMap(([language, table]) =>
    keys.filter((key) => typeof table[key] !== "string").map((key) => [language, key]));
}

export function translate(language, key, values = {}) {
  const base = String(language || "en").split("-")[0].toLowerCase();
  const template = STRINGS[base]?.[key] ?? STRINGS.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ""));
}

// ---------------------------------------------------------------- dates

// Days are "YYYY-MM-DD" keys; the arithmetic on them runs in UTC, so no time zone or
// daylight saving step can shift a square.
export function keyToTime(key) {
  const [year, month, day] = String(key).split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function timeToKey(time) {
  return new Date(time).toISOString().slice(0, 10);
}

export function addDays(key, count) {
  return timeToKey(keyToTime(key) + count * DAY);
}

const dayFormats = new Map();
/** The date of an instant in a time zone, as a day key. */
export function dayKey(instant, timeZone) {
  const zone = timeZone || "UTC";
  if (!dayFormats.has(zone)) {
    dayFormats.set(zone, new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }));
  }
  return dayFormats.get(zone).format(new Date(instant));
}

function shiftYears(key, years) {
  const [year, month, day] = key.split("-").map(Number);
  const target = year + years;
  const last = new Date(Date.UTC(target, month, 0)).getUTCDate();
  return timeToKey(Date.UTC(target, month - 1, Math.min(day, last)));
}

/**
 * The days a page shows. `calendar` is 1 January to 31 December, `rolling` the twelve
 * months that end today; `offset` pages back a year at a time.
 */
export function yearRange(period, offset, now, timeZone) {
  const today = dayKey(now, timeZone);
  const back = Math.max(0, Math.floor(Number(offset) || 0));
  if (period === "rolling") {
    const end = shiftYears(today, -back);
    return { period: "rolling", start: addDays(shiftYears(end, -1), 1), end, today };
  }
  const year = Number(today.slice(0, 4)) - back;
  return { period: "calendar", start: `${year}-01-01`, end: `${year}-12-31`, today, year };
}

/**
 * Where each day of a range sits: a column per week, a row per weekday, and the column
 * each month's label goes above. `firstWeekday` is 0 for Sunday up to 6 for Saturday.
 */
export function gridLayout(start, end, firstWeekday = 1) {
  const startTime = keyToTime(start);
  const count = Math.round((keyToTime(end) - startTime) / DAY) + 1;
  const lead = (new Date(startTime).getUTCDay() - firstWeekday + 7) % 7;
  const cells = [];
  const months = [];
  for (let index = 0; index < count; index += 1) {
    const time = startTime + index * DAY;
    const date = new Date(time);
    const col = Math.floor((lead + index) / 7);
    cells.push({ key: timeToKey(time), col, row: (lead + index) % 7 });
    if (date.getUTCDate() === 1) months.push({ col, month: date.getUTCMonth(), year: date.getUTCFullYear() });
  }
  const weeks = Math.ceil((lead + count) / 7);
  // A range that starts mid-month names that month too, when there is room before the next.
  const first = new Date(startTime);
  if (first.getUTCDate() !== 1 && (!months.length || months[0].col >= 3)) {
    months.unshift({ col: 0, month: first.getUTCMonth(), year: first.getUTCFullYear() });
  }
  return { weeks, cells, months: months.filter((month) => month.col <= weeks - 2) };
}

const WEEKDAYS = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

/** The first day of the week from the Home Assistant profile, else from the language. */
export function firstWeekday(hass) {
  const setting = hass?.locale?.first_weekday;
  if (setting in WEEKDAYS) return WEEKDAYS[setting];
  try {
    const locale = new Intl.Locale(hass?.locale?.language || hass?.language || "en");
    const info = typeof locale.getWeekInfo === "function" ? locale.getWeekInfo() : locale.weekInfo;
    if (info && Number.isFinite(info.firstDay)) return info.firstDay % 7;
  } catch {
    // An unknown language tag: Monday.
  }
  return 1;
}

export function localeSettings(hass) {
  const locale = hass?.locale ?? {};
  return {
    language: locale.language || hass?.language || "en",
    // The recorder cuts its days at the server's midnight, so the grid does too.
    timeZone: hass?.config?.time_zone || undefined,
  };
}

// ---------------------------------------------------------------- data

const UNIT_MINUTES = { d: 1440, h: 60, min: 1, s: 1 / 60, ms: 1 / 60000 };
const AGGREGATES = { sum: "change", max: "max", mean: "mean", min: "min" };

/** [4000, 7000, 10000] or "4000, 7000, 10000" into ascending numbers; null when there are none. */
export function parseThresholds(value) {
  let list = value;
  if (typeof value === "string") list = value.split(/[\s,;]+/).filter(Boolean);
  else if (typeof value === "number") list = [value];
  if (!Array.isArray(list)) return null;
  const numbers = [...new Set(list.map((item) => Number(String(item).replace(",", "."))).filter((n) => Number.isFinite(n) && n > 0))]
    .sort((a, b) => a - b).slice(0, 6);
  return numbers.length ? numbers : null;
}

function nice(value) {
  if (!(value > 0)) return value;
  const magnitude = 10 ** (Math.floor(Math.log10(value)) - 1);
  return Math.round(value / magnitude) * magnitude;
}

/** Thresholds from the data itself: the quartiles of the days above zero, rounded to two digits. */
export function autoThresholds(values) {
  const sorted = [...values].filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (sorted.length < 4) return null;
  const at = (share) => sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))];
  const cuts = [...new Set([at(0.25), at(0.5), at(0.75)].map(nice))].filter((cut) => cut > sorted[0]);
  return cuts.length ? cuts : null;
}

/** -1 for a day without data, 0 for zero, then 1 up to one more than the number of thresholds. */
export function levelOf(value, thresholds) {
  if (value === null || value === undefined || !Number.isFinite(value)) return -1;
  if (value <= 0) return 0;
  let level = 1;
  for (const cut of thresholds ?? []) if (value >= cut) level += 1;
  return level;
}

/** How much of the metric's color a level gets, in percent: 32 for the lowest, 100 for the highest. */
export function levelShade(level, levels) {
  if (level <= 0) return 0;
  if (levels <= 1) return 100;
  return Math.round(32 + ((Math.min(level, levels) - 1) / (levels - 1)) * 68);
}

/** Which field of a statistics row is the day's value. */
export function pickField(rows, aggregate = "auto") {
  if (AGGREGATES[aggregate]) return AGGREGATES[aggregate];
  const list = Array.isArray(rows) ? rows : [];
  // A statistic with a sum (steps today, energy, a daily counter) has the day as its change;
  // a measurement has a maximum, which for a sensor that holds the day's total is that total.
  for (const field of ["change", "max", "mean", "state"]) {
    if (list.some((row) => Number.isFinite(row?.[field]))) return field;
  }
  return "change";
}

/** Statistics rows of the period `day` into a value per day key. */
export function perDay(rows, field, timeZone) {
  const out = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const raw = row?.[field];
    if (raw === null || raw === undefined) continue;
    const value = Number(raw);
    const start = typeof row.start === "number" ? row.start : Date.parse(row.start);
    if (!Number.isFinite(value) || !Number.isFinite(start)) continue;
    // Noon of the period, so a day that starts at 23:00 UTC still lands on its own date.
    const key = dayKey(start + DAY / 2, timeZone);
    // A counter that was reset by hand can give a negative change; that is no day's total.
    if (field === "change") out.set(key, (out.get(key) ?? 0) + Math.max(0, value));
    else out.set(key, value);
  }
  return out;
}

/**
 * A statistic with a sum has no row for a day on which nothing was counted. Between two
 * days with a row those days are zero, not unknown; after the last one nothing is known yet.
 */
export function fillZeros(values) {
  const keys = [...values.keys()].sort();
  if (!keys.length) return values;
  const out = new Map(values);
  for (let key = keys[0]; key <= keys[keys.length - 1]; key = addDays(key, 1)) if (!out.has(key)) out.set(key, 0);
  return out;
}

/** The figures above a grid, over the days of the range up to today. */
export function summarize(values, range, top = null) {
  const end = range.end < range.today ? range.end : range.today;
  const out = { count: 0, active: 0, total: 0, average: null, best: null, reached: 0, first: null };
  for (const [key, value] of values) {
    if (key < range.start || key > end || !Number.isFinite(value)) continue;
    out.count += 1;
    out.total += value;
    if (value > 0) out.active += 1;
    if (!out.best || value > out.best.value) out.best = { key, value };
    if (top !== null && value >= top) out.reached += 1;
    if (!out.first || key < out.first) out.first = key;
  }
  if (out.count) out.average = out.total / out.count;
  return out;
}

/** The same per month, for the table screen readers get instead of the squares. */
export function monthSummaries(values, range) {
  const end = range.end < range.today ? range.end : range.today;
  const months = new Map();
  for (const [key, value] of [...values].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    if (key < range.start || key > end || !Number.isFinite(value)) continue;
    const month = key.slice(0, 7);
    const held = months.get(month) ?? { month, count: 0, total: 0 };
    held.count += 1;
    held.total += value;
    months.set(month, held);
  }
  return [...months.values()].map((held) => ({ ...held, average: held.total / held.count }));
}

/** The statistic ids the Life Dashboard integration may keep for one of its sensors. */
export function statisticCandidates(entry) {
  if (!entry || entry.platform !== PLATFORM || !entry.config_entry_id || !entry.translation_key) return [];
  const prefix = `${PLATFORM}:${String(entry.config_entry_id).toLowerCase()}_`;
  const key = entry.translation_key;
  const bare = key.replace(/_(today|yesterday)$/, "").replace(/^last_/, "");
  return [...new Set([LD_KEYS[key], bare, `${bare}_minutes`, key].filter(Boolean))].map((name) => prefix + name);
}

/** steps, sleep, screen or workouts when an id says so, for the defaults; else null. */
export function kindOf(id) {
  const text = String(id || "").toLowerCase();
  // An id of the integration is `life_dashboard:<entry>_<key>`, and an entry id has no underscore.
  const own = text.startsWith(`${PLATFORM}:`) ? text.slice(PLATFORM.length + 1) : null;
  const key = own === null ? null : own.slice(own.indexOf("_") + 1);
  if (key && LD_KINDS[key]) return LD_KINDS[key];
  if (key) return null;
  if (/screen_?time/.test(text)) return "screen";
  if (/steps?(_|$)/.test(text)) return "steps";
  if (/sleep/.test(text) && !/(deep|light|rem|awake|score|stage)/.test(text)) return "sleep";
  if (/exercise|workout/.test(text)) return "workouts";
  return null;
}

/** The thresholds a recognized kind starts with, in the statistic's unit; null for the rest. */
export function defaultThresholds(kind, unit) {
  const known = KINDS[kind];
  if (!known) return null;
  if (!known.hours) return unit === "steps" || !unit ? known.thresholds : null;
  const minutes = UNIT_MINUTES[unit];
  return minutes ? known.thresholds.map((hours) => (hours * 60) / minutes) : null;
}

/** The card's `metrics`, or the `entity` shorthand, as a clean list. */
export function readMetrics(config) {
  let list = config?.metrics;
  if (!Array.isArray(list)) list = list && typeof list === "object" ? [list] : [];
  if (!list.length && typeof config?.entity === "string" && config.entity) list = [{ entity: config.entity }];
  const out = [];
  for (const item of list) {
    const metric = typeof item === "string" ? { entity: item } : item;
    if (!metric || typeof metric !== "object") continue;
    const entity = typeof metric.entity === "string" && metric.entity.trim() ? metric.entity.trim() : null;
    const statistic = typeof metric.statistic === "string" && metric.statistic.trim() ? metric.statistic.trim() : null;
    if (!entity && !statistic) continue;
    out.push({
      entity,
      statistic,
      name: typeof metric.name === "string" && metric.name.trim() ? metric.name.trim() : null,
      color: cssColor(metric.color),
      thresholds: parseThresholds(metric.thresholds),
      aggregate: AGGREGATES[metric.aggregate] ? metric.aggregate : "auto",
    });
    if (out.length === MAX_METRICS) break;
  }
  return out;
}

/** "#30b77e", "teal" or [48, 183, 126] as a CSS color; null for anything that could carry more than a color. */
export function cssColor(value) {
  if (Array.isArray(value) && value.length === 3 && value.every((part) => Number.isFinite(Number(part)))) {
    return `#${value.map((part) => Math.max(0, Math.min(255, Math.round(Number(part)))).toString(16).padStart(2, "0")).join("")}`;
  }
  if (typeof value !== "string") return null;
  const text = value.trim();
  return /^(#[0-9a-f]{3,8}|[a-z]+|(rgb|hsl|oklch)a?\([\d\s.,%/a-z-]+\)|var\(--[\w-]+\))$/i.test(text) ? text : null;
}

export function hexToRgb(value) {
  const match = /^#([0-9a-f]{6})$/i.exec(typeof value === "string" ? value.trim() : "");
  if (!match) return null;
  const n = parseInt(match[1], 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

/** A metric's color: its own, its kind's, or the next of the palette. */
export function metricColor(metric, kind, index) {
  return metric.color || KINDS[kind]?.color || PALETTE[index % PALETTE.length];
}

/** The sensors a new card starts with: Life Dashboard's when it is there, else a step sensor. */
export function stubMetrics(hass) {
  const entries = Object.values(hass?.entities ?? {});
  const ours = STUB_KEYS
    .map((key) => entries.find((entry) => entry.platform === PLATFORM && entry.translation_key === key &&
      !entry.hidden && hass.states?.[entry.entity_id]))
    .filter(Boolean)
    .map((entry) => ({ entity: entry.entity_id }));
  if (ours.length) return ours;
  const steps = Object.keys(hass?.states ?? {}).find((id) => id.startsWith("sensor.") && kindOf(id) === "steps" &&
    hass.states[id].attributes?.state_class);
  return steps ? [{ entity: steps }] : [];
}

// ---------------------------------------------------------------- formatting

const numberFormats = new Map();
function numberFormat(language, options) {
  const key = `${language}|${JSON.stringify(options)}`;
  if (!numberFormats.has(key)) numberFormats.set(key, new Intl.NumberFormat(language, options));
  return numberFormats.get(key);
}

/** "3h 16m" in the user's language. */
export function formatDuration(minutes, language = "en") {
  if (!(minutes >= 0) || !Number.isFinite(minutes)) return "";
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  const unit = (name) => numberFormat(language, { style: "unit", unit: name, unitDisplay: "narrow" });
  if (hours && rest) return `${unit("hour").format(hours)} ${unit("minute").format(rest)}`;
  return hours ? unit("hour").format(hours) : unit("minute").format(rest);
}

/**
 * A day's value as text: a duration for time units, else the number with its unit.
 * `compact` is for the legend ("10K"), `bare` leaves the unit out.
 */
export function formatValue(value, unit, language = "en", { compact = false, bare = false } = {}) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  if (UNIT_MINUTES[unit]) return formatDuration(value * UNIT_MINUTES[unit], language);
  const size = Math.abs(value);
  const digits = size >= 100 || Number.isInteger(value) ? 0 : size >= 10 ? 1 : 2;
  const number = compact
    ? numberFormat(language, { notation: "compact", maximumFractionDigits: 1 }).format(value)
    : numberFormat(language, { maximumFractionDigits: digits }).format(value);
  if (bare || compact || !unit) return number;
  return unit === "%" ? `${number}%` : `${number} ${unit}`;
}

function dateFormat(language, options) {
  return new Intl.DateTimeFormat(language, { timeZone: "UTC", ...options });
}

/** "2026", or "Nov 2025 to Nov 2026" for the last twelve months. */
export function rangeLabel(range, language = "en") {
  if (range.period === "calendar") {
    return dateFormat(language, { year: "numeric" }).format(new Date(keyToTime(range.start)));
  }
  const month = dateFormat(language, { month: "short", year: "numeric" });
  return translate(language, "rangeTo", {
    from: month.format(new Date(keyToTime(range.start))),
    to: month.format(new Date(keyToTime(range.end))),
  });
}

// ---------------------------------------------------------------- statistics

const resolveCache = new Map();
const statsCache = new Map();

/**
 * The statistic behind a metric and its metadata. A sensor of the Life Dashboard
 * integration resolves to the phone's history, which goes back further than the sensor
 * itself; any other sensor is its own statistic.
 */
export async function resolveMetric(hass, metric) {
  const cacheKey = metric.statistic || metric.entity;
  const held = resolveCache.get(cacheKey);
  if (held && Date.now() - held.at < STATS_TTL) return held.value;
  let ids = [metric.statistic];
  if (!metric.statistic) {
    let entry = null;
    if (hass.entities?.[metric.entity]?.platform === PLATFORM) {
      entry = await hass.callWS({ type: "config/entity_registry/get", entity_id: metric.entity }).catch(() => null);
    }
    ids = [...statisticCandidates(entry), metric.entity];
  }
  const meta = await hass.callWS({ type: "recorder/get_statistics_metadata", statistic_ids: ids }).catch(() => []);
  const byId = new Map((Array.isArray(meta) ? meta : []).map((item) => [item.statistic_id, item]));
  const id = ids.find((candidate) => byId.has(candidate)) ?? ids[ids.length - 1];
  const found = byId.get(id) ?? null;
  const value = {
    id,
    found: Boolean(found),
    unit: found?.statistics_unit_of_measurement ?? found?.display_unit_of_measurement ?? null,
    statName: found?.name ?? null,
    external: id.includes(":"),
  };
  // Only a hit is worth keeping: a sensor without statistics may get them within the hour.
  if (found) resolveCache.set(cacheKey, { at: Date.now(), value });
  return value;
}

/** A value per day for each metric over a range, in one request. */
export async function loadRange(hass, metrics, range, timeZone) {
  const resolved = await Promise.all(metrics.map((metric) => resolveMetric(hass, metric)));
  const ids = [...new Set(resolved.filter((item) => item.found).map((item) => item.id))];
  const cacheKey = `${ids.join(",")}|${range.start}|${range.end}|${timeZone}`;
  let rows = {};
  if (ids.length) {
    const held = statsCache.get(cacheKey);
    if (held && Date.now() - held.at < STATS_TTL) rows = held.value;
    else {
      rows = await hass.callWS({
        type: "recorder/statistics_during_period",
        // A month either side: it tells whether a statistic was already there before the
        // page, and whether a day without a row at the page's edge lies between two with one.
        start_time: new Date(keyToTime(range.start) - MARGIN * DAY).toISOString(),
        end_time: new Date(keyToTime(range.end) + MARGIN * DAY).toISOString(),
        statistic_ids: ids,
        period: "day",
        types: ["change", "max", "mean", "min", "state"],
      });
      statsCache.set(cacheKey, { at: Date.now(), value: rows });
      if (statsCache.size > 24) statsCache.delete(statsCache.keys().next().value);
    }
  }
  return metrics.map((metric, index) => {
    const source = resolved[index];
    const own = rows?.[source.id] ?? [];
    const field = pickField(own, metric.aggregate);
    let values = perDay(own, field, timeZone);
    if (field === "change") values = fillZeros(values);
    return { ...source, field, values };
  });
}

// ---------------------------------------------------------------- DOM

// DOM is only ever built through these helpers: values reach the page as text nodes and
// attribute values, never as markup.
function el(tag, attributes = {}, ...children) {
  return applyTo(document.createElement(tag), attributes, children);
}
function svg(tag, attributes = {}, ...children) {
  return applyTo(document.createElementNS("http://www.w3.org/2000/svg", tag), attributes, children);
}
function applyTo(node, attributes, children) {
  for (const [name, value] of Object.entries(attributes)) {
    if (value === undefined || value === null || value === false) continue;
    if (name === "style" && typeof value === "object") {
      for (const [prop, v] of Object.entries(value)) if (v !== undefined && v !== null) node.style.setProperty(prop, String(v));
    } else node.setAttribute(name, String(value));
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

const STYLE = `
  :host {
    --_ink: var(--primary-text-color, #1c1c1c);
    --_muted: var(--secondary-text-color, #5f6368);
    --_hairline: var(--divider-color, rgba(127, 127, 127, 0.25));
    --_track: color-mix(in srgb, var(--_ink) 10%, transparent);
    --_none: color-mix(in srgb, var(--_ink) 4%, transparent);
    --_accent: var(--primary-color, #03a9f4);
    display: block;
    height: 100%;
  }
  ha-card { height: 100%; box-sizing: border-box; }
  .root { container-type: inline-size; position: relative; padding: 16px; color: var(--_ink); }
  button { font: inherit; color: inherit; }
  button:focus-visible, .plot:focus-visible { outline: 2px solid var(--_accent); outline-offset: 2px; }

  .head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; min-height: 36px; }
  .chip { width: 36px; height: 36px; border-radius: var(--ha-tile-icon-border-radius, 12px); flex: none;
    display: grid; place-items: center; color: var(--_accent);
    background: color-mix(in srgb, var(--_accent) 18%, transparent); --mdc-icon-size: 20px; }
  .head .names { min-width: 0; flex: 1; }
  .head .t { font-weight: 500; font-size: 15px; line-height: 1.3; }
  .head .s { color: var(--_muted); font-size: 12.5px; font-variant-numeric: tabular-nums; }
  .nav { display: flex; gap: 4px; flex: none; }
  .nav button { width: 36px; height: 36px; border-radius: 50%; border: 0; background: none; cursor: pointer;
    display: grid; place-items: center; color: var(--_muted); --mdc-icon-size: 22px; }
  .nav button:hover:not(:disabled) { background: var(--_track); color: var(--_ink); }
  .nav button:disabled { opacity: 0.3; cursor: default; }

  .tabs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
  .tab { border: 1px solid var(--_hairline); background: none; border-radius: 999px; padding: 4px 12px;
    cursor: pointer; color: var(--_muted); font-size: 13px; display: inline-flex; align-items: center; gap: 7px; }
  .tab i { width: 9px; height: 9px; border-radius: 3px; background: var(--_c); display: block; }
  .tab[aria-pressed="true"] { background: var(--_track); color: var(--_ink); border-color: var(--_muted); font-weight: 500; }

  .stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 0 0 14px; }
  .stats > div { display: flex; flex-direction: column; }
  .stats dd { order: -1; margin: 0; font-size: 19px; font-weight: 600; letter-spacing: -0.01em; line-height: 1.25;
    font-variant-numeric: tabular-nums; }
  .stats dt { color: var(--_muted); font-size: 12px; }

  .metric + .metric { margin-top: 18px; }
  .mhead { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
  .mhead .n { font-weight: 500; font-size: 14px; display: inline-flex; align-items: center; gap: 7px; }
  .mhead .n i { width: 9px; height: 9px; border-radius: 3px; background: var(--_c); display: block; }
  .mhead .a { color: var(--_muted); font-size: 12.5px; font-variant-numeric: tabular-nums; text-align: end; }

  .wrap { overflow-x: auto; overflow-y: hidden; scrollbar-width: thin; }
  .plot { display: block; width: max-content; border-radius: 6px; touch-action: pan-x pan-y; }
  .plot svg { display: block; }
  .plot text { fill: var(--_muted); font-size: 10.5px; }
  rect.c { fill: color-mix(in srgb, var(--_c) var(--_p), var(--_track)); }
  rect.c.zero { fill: var(--_track); }
  rect.c.none { fill: var(--_none); }
  rect.c.today { stroke: var(--_muted); stroke-width: 1; }
  rect.cursor { fill: none; stroke: var(--_ink); stroke-width: 1.5; pointer-events: none; }

  .legend { display: flex; align-items: center; gap: 4px; justify-content: flex-end; font-size: 11px;
    color: var(--_muted); margin-top: 8px; font-variant-numeric: tabular-nums; }
  .legend i { width: 11px; height: 11px; border-radius: 3px; display: block;
    background: color-mix(in srgb, var(--_c) var(--_p), var(--_track)); }
  .legend span:first-child { margin-inline-end: 3px; }
  .legend span:last-child { margin-inline-start: 3px; }

  .tip { position: absolute; top: 0; left: 0; z-index: 1; pointer-events: none; opacity: 0;
    background: var(--_ink); color: var(--ha-card-background, var(--card-background-color, #fff));
    font-size: 12px; line-height: 1.35; padding: 5px 9px; border-radius: 8px; white-space: nowrap;
    font-variant-numeric: tabular-nums; }
  .tip.on { opacity: 1; }
  .tip b { font-weight: 600; display: block; }

  .note { margin: 10px 0 0; font-size: 12.5px; line-height: 1.4; color: var(--_muted); display: flex; gap: 6px;
    align-items: flex-start; --mdc-icon-size: 16px; overflow-wrap: anywhere; }
  .note ha-icon { flex: none; }
  .empty-figure { font-size: 19px; line-height: 1.25; font-weight: 500; }
  .empty-body { margin: 2px 0 0; font-size: 13px; line-height: 1.4; color: var(--_muted); overflow-wrap: anywhere; }
  .visually-hidden { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden;
    clip-path: inset(50%); border: 0; white-space: nowrap; }

  @container (max-width: 380px) {
    .stats { gap: 8px; }
    .stats dd { font-size: 16px; }
    .stats dt { font-size: 11.5px; }
  }
  @media (forced-colors: active) {
    .plot svg, .legend i, .tab i, .mhead .n i { forced-color-adjust: none; }
    :host { --_track: color-mix(in srgb, CanvasText 12%, Canvas); --_none: Canvas; }
    .metric, .tab { --_c: CanvasText !important; }
    rect.c.none { stroke: GrayText; stroke-width: 0.5; }
    rect.cursor { stroke: Highlight; }
  }
`;

// ---------------------------------------------------------------- card

const Base = globalThis.HTMLElement ?? class {};

class YearCard extends Base {
  static getConfigElement() {
    return document.createElement(`${TAG}-editor`);
  }

  static getStubConfig(hass) {
    return { metrics: stubMetrics(hass) };
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.append(el("style", {}, STYLE));
    this._card = el("ha-card");
    this._root = el("div", { class: "root" });
    this._card.append(this._root);
    this.shadowRoot.append(this._card);
    this._ui = { metric: 0, offset: 0 };
    this._plots = [];
    this._width = 0;
  }

  connectedCallback() {
    if (typeof ResizeObserver === "undefined" || this._observer) return;
    this._observer = new ResizeObserver(() => {
      const width = this._root.clientWidth;
      if (width && Math.abs(width - this._width) >= 1) {
        this._width = width;
        this._draw();
      }
    });
    this._observer.observe(this._root);
  }

  disconnectedCallback() {
    this._observer?.disconnect();
    this._observer = undefined;
    clearTimeout(this._tipTimer);
  }

  setConfig(config) {
    if (!config || typeof config !== "object") throw new Error("Invalid configuration");
    if (config.metrics !== undefined && !Array.isArray(config.metrics)) throw new Error("`metrics` is a list of sensors");
    this._config = { ...config };
    this._metrics = readMetrics(config);
    this._ui = { metric: 0, offset: 0 };
    this._data = undefined;
    this._seen = undefined;
    if (this._hass) this._update();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    this._update();
  }

  get hass() {
    return this._hass;
  }

  getCardSize() {
    return this._config?.layout === "rows" ? 2 + 3 * Math.max(1, this._metrics.length) : 6;
  }

  getGridOptions() {
    return { columns: "full", rows: "auto", min_columns: 6 };
  }

  get _lang() {
    return localeSettings(this._hass).language;
  }

  _t(key, values) {
    return translate(this._lang, key, values);
  }

  _range() {
    const period = this._config.period === "rolling" ? "rolling" : "calendar";
    return yearRange(period, this._ui.offset, Date.now(), localeSettings(this._hass).timeZone);
  }

  /** Called on every state change in Home Assistant, so it only acts on what the card shows. */
  _update() {
    const hass = this._hass;
    const range = this._range();
    const names = this._metrics.map((metric) => hass.states?.[metric.entity]?.attributes?.friendly_name);
    const fingerprint = JSON.stringify([hass.locale?.language, hass.language, hass.locale?.first_weekday,
      hass.config?.time_zone, range.start, range.end, range.today, names]);
    const key = `${range.start}|${range.end}`;
    const stale = !this._data || this._data.key !== key || Date.now() - this._data.at > STATS_TTL;
    if (stale && this._loading !== key && this._metrics.length && typeof hass.callWS === "function") this._load(range, key);
    if (fingerprint === this._seen) return;
    this._seen = fingerprint;
    this._render();
  }

  _load(range, key) {
    this._loading = key;
    loadRange(this._hass, this._metrics, range, localeSettings(this._hass).timeZone)
      .then((sources) => ({ key, at: Date.now(), sources }))
      .catch(() => ({ key, at: Date.now(), error: true }))
      .then((data) => {
        if (this._loading === key) this._loading = undefined;
        // An answer for a page the user already left is dropped.
        if (key !== `${this._range().start}|${this._range().end}`) return;
        this._data = data;
        this._render();
      });
  }

  /** Everything the drawing needs for one metric on the current page. */
  _model(metric, index, range) {
    const language = this._lang;
    const loaded = this._data?.key === `${range.start}|${range.end}` && !this._data.error ? this._data.sources[index] : null;
    const kind = kindOf(loaded?.id ?? metric.statistic ?? metric.entity);
    const unit = loaded?.unit ?? null;
    const values = loaded?.values ?? new Map();
    const inRange = [...values].filter(([key]) => key >= range.start && key <= range.end).map(([, value]) => value);
    const preset = metric.thresholds ?? defaultThresholds(kind, unit);
    const thresholds = preset ?? autoThresholds(inRange);
    const friendly = metric.entity ? this._hass.states?.[metric.entity]?.attributes?.friendly_name : null;
    const known = loaded?.external && KINDS[kind] ? this._t(KINDS[kind].label) : null;
    const name = metric.name || known || (loaded?.external ? loaded.statName : null) || friendly || loaded?.statName ||
      metric.entity || metric.statistic;
    return {
      metric, index, kind, unit, values, thresholds, name, loaded,
      levels: (thresholds?.length ?? 0) + 1,
      color: metricColor(metric, kind, index),
      summary: summarize(values, range, preset ? preset[preset.length - 1] : null),
      top: preset ? preset[preset.length - 1] : null,
      text: (value, options) => formatValue(value, unit, language, options),
    };
  }

  _render() {
    if (!this._hass || !this._config) return;
    const focus = this._refocus ?? this._focused();
    this._refocus = undefined;
    this._renders = (this._renders ?? 0) + 1;
    this._plots = [];
    clearTimeout(this._tipTimer);
    this._tip = el("div", { class: "tip", "aria-hidden": "true" });
    this._root.replaceChildren(...[this._build(), this._tip].flat(Infinity).filter(Boolean));
    this._width = this._root.clientWidth || this._width;
    this._draw();
    if (focus) {
      const target = this._root.querySelector(focus);
      // The last page disables the button that led to it: its neighbor takes the focus.
      (target?.disabled ? this._root.querySelector(".nav button:not(:disabled)") : target)?.focus();
    }
  }

  /** A selector for the control that has the focus, so a redraw can hand it back. */
  _focused() {
    const active = this.shadowRoot.activeElement;
    if (!active) return undefined;
    if (active.closest(".nav")) return `.nav .${active.className}`;
    if (active.classList.contains("tab")) return `.tab:nth-child(${[...active.parentElement.children].indexOf(active) + 1})`;
    return undefined;
  }

  _head(range, canGoBack) {
    const nav = el("div", { class: "nav", dir: "ltr" });
    const button = (name, icon, disabled, step) => {
      const node = el("button", { type: "button", class: name, "aria-label": this._t(name), title: this._t(name), disabled },
        el("ha-icon", { icon }));
      node.addEventListener("click", () => {
        this._ui.offset = Math.max(0, this._ui.offset + step);
        this._refocus = `.nav .${name}`;
        this._seen = undefined;
        this._update();
      });
      return node;
    };
    nav.append(
      button("previous", "mdi:chevron-left", !canGoBack || this._ui.offset >= MAX_BACK, 1),
      button("next", "mdi:chevron-right", this._ui.offset === 0, -1));
    return el("div", { class: "head" },
      el("span", { class: "chip", "aria-hidden": "true" }, el("ha-icon", { icon: "mdi:calendar-month" })),
      el("div", { class: "names" },
        el("div", { class: "t" }, this._config.title || this._t("year")),
        el("div", { class: "s", "aria-live": "polite" }, rangeLabel(range, this._lang))),
      nav);
  }

  _build() {
    const range = this._range();
    if (!this._metrics.length) {
      return el("div", { class: "empty" },
        el("div", { class: "empty-figure" }, this._t("pickTitle")),
        el("p", { class: "empty-body" }, this._t("pickBody")));
    }
    const models = this._metrics.map((metric, index) => this._model(metric, index, range));
    const ready = this._data?.key === `${range.start}|${range.end}`;
    // Paging back stops at the first year in which no metric has a day.
    const canGoBack = !ready || models.some((model) => model.summary.count > 0);
    const rows = this._config.layout === "rows" && models.length > 1;
    const out = [this._head(range, canGoBack)];
    if (ready && this._data.error) {
      out.push(this._note(this._t("error"), "mdi:alert-circle-outline"));
      return out;
    }
    if (rows) {
      for (const model of models) out.push(this._metricBlock(model, range, ready, true));
      return out;
    }
    const chosen = models[Math.min(this._ui.metric, models.length - 1)];
    if (models.length > 1) {
      const tabs = el("div", { class: "tabs" });
      for (const model of models) {
        const tab = el("button", { type: "button", class: "tab", "aria-pressed": String(model === chosen), style: { "--_c": model.color } },
          el("i", { "aria-hidden": "true" }), model.name);
        tab.addEventListener("click", () => {
          this._ui.metric = model.index;
          this._refocus = `.tab:nth-child(${model.index + 1})`;
          this._render();
        });
        tabs.append(tab);
      }
      out.push(tabs);
    }
    out.push(this._metricBlock(chosen, range, ready, false));
    return out;
  }

  _stats(model, ready) {
    const { summary } = model;
    const dash = "-";
    const short = dateFormat(this._lang, { day: "numeric", month: "short" });
    // "1 day" and "63 days" in the user's language, so no text has to guess a plural.
    const days = (count) => numberFormat(this._lang, { style: "unit", unit: "day", unitDisplay: "long" }).format(count);
    const items = [
      [ready && summary.count ? model.text(summary.average) : dash, this._t("average")],
      model.top !== null
        ? [ready && summary.count ? days(summary.reached) : dash, this._t("daysAt", { value: model.text(model.top, { bare: true }) })]
        : [ready && summary.count ? days(summary.active) : dash, this._t("daysWith")],
      [ready && summary.best ? model.text(summary.best.value) : dash,
        summary.best ? this._t("best", { date: short.format(new Date(keyToTime(summary.best.key))) }) : this._t("best", { date: dash })],
    ];
    return el("dl", { class: "stats" }, items.map(([value, label]) => el("div", {}, el("dt", {}, label), el("dd", {}, value))));
  }

  _legend(model) {
    const cuts = model.thresholds;
    const swatches = Array.from({ length: model.levels }, (_, i) =>
      el("i", { style: { "--_p": `${levelShade(i + 1, model.levels)}%` } }));
    const low = cuts ? `< ${model.text(cuts[0], { compact: true })}` : this._t("less");
    const high = cuts ? `${model.text(cuts[cuts.length - 1], { compact: true })}+` : this._t("more");
    return el("div", { class: "legend", "aria-hidden": "true", dir: "ltr" }, el("span", {}, low), swatches, el("span", {}, high));
  }

  _note(text, icon = "mdi:information-outline") {
    return el("p", { class: "note" }, el("ha-icon", { icon, "aria-hidden": "true" }), el("span", {}, text));
  }

  _metricBlock(model, range, ready, compact) {
    const language = this._lang;
    const label = rangeLabel(range, language);
    const { summary } = model;
    const block = el("div", { class: "metric", style: { "--_c": model.color } });
    if (compact) {
      block.append(el("div", { class: "mhead" },
        el("span", { class: "n" }, el("i", { "aria-hidden": "true" }), model.name),
        el("span", { class: "a" }, ready && summary.count ? `${model.text(summary.average)}, ${this._t("average")}` : "")));
    } else {
      block.append(this._stats(model, ready));
    }
    const plot = el("div", {
      class: "plot",
      dir: "ltr",
      tabindex: "0",
      role: "slider",
      "aria-label": `${this._t("gridLabel", { name: model.name, range: label })}. ${this._t("gridHint")}`,
      "aria-valuemin": "1",
      "aria-valuemax": "1",
      "aria-valuenow": "1",
    });
    block.append(el("div", { class: "wrap" }, plot));
    this._plots.push({ plot, model, range, active: null });
    block.append(this._legend(model));

    if (ready && model.loaded && !model.loaded.found) {
      block.append(this._note(this._t("missingBody", { entity: model.metric.statistic || model.metric.entity })));
    } else if (ready && !summary.count) {
      block.append(this._note(this._t(this._ui.offset === 0 ? "noStats" : "empty")));
    } else if (ready && summary.first > range.start && model.values.size && ![...model.values.keys()].some((key) => key < range.start)) {
      const long = dateFormat(language, { day: "numeric", month: "long", year: "numeric" });
      block.append(this._note(this._t("startsOn", { date: long.format(new Date(keyToTime(summary.first))) })));
    }

    // Screen readers get the months as a table in place of several hundred squares.
    const months = monthSummaries(model.values, range);
    if (months.length) {
      const monthName = dateFormat(language, { month: "long", year: "numeric" });
      // In a box of its own: a table ignores a width of one pixel and would widen the card.
      block.append(el("div", { class: "visually-hidden" }, el("table", {},
        el("caption", {}, this._t("tableCaption", { name: model.name, range: label })),
        el("thead", {}, el("tr", {},
          el("th", { scope: "col" }, this._t("month")),
          el("th", { scope: "col" }, this._t("average")),
          el("th", { scope: "col" }, this._t("tableDays")))),
        el("tbody", {}, months.map((month) => el("tr", {},
          el("th", { scope: "row" }, monthName.format(new Date(keyToTime(`${month.month}-01`)))),
          el("td", {}, model.text(month.average)),
          el("td", {}, month.count)))))));
    }
    return block;
  }

  /** The squares, at the size the card's width allows. Runs again whenever that width changes. */
  _draw() {
    if (!this._plots.length || !this._hass) return;
    const language = this._lang;
    const first = firstWeekday(this._hass);
    const available = Math.max(0, this._width - 32);
    const left = 34;
    const top = 18;
    for (const entry of this._plots) {
      const { plot, model, range } = entry;
      const layout = gridLayout(range.start, range.end, first);
      let column = (available - left) / layout.weeks;
      // Below this the squares get too small to read or touch: keep them and scroll instead.
      if (column < 7.5) column = 11;
      const gap = column >= 14 ? 3 : column >= 10 ? 2 : 1;
      const cell = Math.min(18, Math.floor((column - gap) * 2) / 2);
      const step = cell + gap;
      const width = left + layout.weeks * step;
      const height = top + 7 * step;
      const root = svg("svg", { width, height, viewBox: `0 0 ${width} ${height}`, "aria-hidden": "true" });
      const weekday = dateFormat(language, { weekday: "short" });
      for (const row of [0, 2, 4]) {
        // 4 January 1970 was a Sunday.
        const name = weekday.format(new Date((3 + ((first + row) % 7)) * DAY));
        root.append(svg("text", { x: 0, y: top + row * step + cell / 2 + 3.5 }, name));
      }
      const month = dateFormat(language, { month: "short" });
      for (const item of layout.months) {
        root.append(svg("text", { x: left + item.col * step, y: 10 }, month.format(new Date(Date.UTC(item.year, item.month, 1)))));
      }
      entry.cells = [];
      for (const item of layout.cells) {
        const future = item.key > range.today;
        const value = future ? null : model.values.get(item.key) ?? null;
        const level = levelOf(value, model.thresholds);
        const rect = svg("rect", {
          class: `c${level < 0 ? " none" : level === 0 ? " zero" : ""}${item.key === range.today ? " today" : ""}`,
          x: left + item.col * step, y: top + item.row * step, width: cell, height: cell, rx: Math.max(1.5, cell / 4.5),
          style: level > 0 ? { "--_p": `${levelShade(level, model.levels)}%` } : undefined,
          "data-i": future ? undefined : entry.cells.length,
        });
        root.append(rect);
        if (!future) entry.cells.push({ ...item, value, rect });
      }
      entry.cursor = svg("rect", { class: "cursor", width: cell + 2, height: cell + 2, rx: Math.max(2, cell / 4.5 + 1), visibility: "hidden" });
      root.append(entry.cursor);
      entry.step = step;
      plot.replaceChildren(root);
      plot.setAttribute("aria-valuemax", Math.max(1, entry.cells.length));
      if (!entry.bound) {
        entry.bound = true;
        this._bind(entry);
      }
      // Start at today, or at the end of an earlier year, when the grid is wider than the card.
      const wrap = plot.parentElement;
      if (entry.cells.length && wrap.scrollWidth > wrap.clientWidth) {
        const last = entry.cells[entry.cells.length - 1];
        wrap.scrollLeft = Math.max(0, left + (last.col + 3) * step - wrap.clientWidth);
      }
      if (entry.active !== null) this._activate(entry, Math.min(entry.active, entry.cells.length - 1), false);
    }
  }

  _bind(entry) {
    const { plot } = entry;
    const over = (event) => {
      const index = event.target?.getAttribute?.("data-i");
      if (index === null || index === undefined) return;
      clearTimeout(this._tipTimer);
      this._activate(entry, Number(index), false);
    };
    plot.addEventListener("pointermove", over);
    plot.addEventListener("pointerdown", over);
    plot.addEventListener("pointerleave", (event) => {
      clearTimeout(this._tipTimer);
      // A finger lifts straight away, so a touch keeps its readout for a moment.
      if (event.pointerType === "touch") this._tipTimer = setTimeout(() => this._clear(entry), 3500);
      else if (this.shadowRoot.activeElement !== plot) this._clear(entry);
    });
    plot.addEventListener("focus", () => {
      if (entry.active === null && entry.cells.length) this._activate(entry, entry.cells.length - 1, true);
    });
    plot.addEventListener("blur", () => this._clear(entry));
    plot.addEventListener("keydown", (event) => {
      const moves = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1, PageUp: -28, PageDown: 28 };
      const last = entry.cells.length - 1;
      if (last < 0) return;
      const from = entry.active ?? last;
      let to;
      if (event.key in moves) to = Math.max(0, Math.min(last, from + moves[event.key]));
      else if (event.key === "Home") to = 0;
      else if (event.key === "End") to = last;
      else if (event.key === "Escape") { this._clear(entry); return; }
      else return;
      event.preventDefault();
      this._activate(entry, to, true);
    });
  }

  _clear(entry) {
    entry.active = null;
    entry.cursor?.setAttribute("visibility", "hidden");
    this._tip?.classList.remove("on");
  }

  _activate(entry, index, scroll) {
    const cell = entry.cells?.[index];
    if (!cell) return;
    for (const other of this._plots) if (other !== entry && other.active !== null) this._clear(other);
    entry.active = index;
    const language = this._lang;
    const date = dateFormat(language, { weekday: "short", day: "numeric", month: "short", year: "numeric" })
      .format(new Date(keyToTime(cell.key)));
    const value = cell.value === null ? this._t("noData") : entry.model.text(cell.value);
    entry.cursor.setAttribute("x", Number(cell.rect.getAttribute("x")) - 1);
    entry.cursor.setAttribute("y", Number(cell.rect.getAttribute("y")) - 1);
    entry.cursor.setAttribute("visibility", "visible");
    entry.plot.setAttribute("aria-valuenow", index + 1);
    entry.plot.setAttribute("aria-valuetext", `${date}, ${value}`);
    const wrap = entry.plot.parentElement;
    if (scroll && wrap.scrollWidth > wrap.clientWidth) {
      const x = Number(cell.rect.getAttribute("x"));
      if (x < wrap.scrollLeft + 34) wrap.scrollLeft = Math.max(0, x - 34 - entry.step);
      else if (x + entry.step > wrap.scrollLeft + wrap.clientWidth) wrap.scrollLeft = x + 2 * entry.step - wrap.clientWidth;
    }
    this._tip.replaceChildren(el("b", {}, value), date);
    this._tip.classList.add("on");
    const box = cell.rect.getBoundingClientRect();
    const host = this._root.getBoundingClientRect();
    const tipWidth = this._tip.offsetWidth;
    const center = box.left - host.left + box.width / 2;
    const leftEdge = Math.max(4, Math.min(host.width - tipWidth - 4, center - tipWidth / 2));
    let topEdge = box.top - host.top - this._tip.offsetHeight - 6;
    // No room above the first rows of a short card: below the square instead.
    if (topEdge < 0) topEdge = box.bottom - host.top + 6;
    this._tip.style.left = `${Math.round(leftEdge)}px`;
    this._tip.style.top = `${Math.round(topEdge)}px`;
  }
}

// ---------------------------------------------------------------- editor

/** The card's config as the form holds it: thresholds as text, a color as red, green, blue. */
export function toForm(config) {
  const data = { ...config };
  const source = Array.isArray(config.metrics) ? config.metrics
    : typeof config.entity === "string" && config.entity ? [{ entity: config.entity }] : [];
  delete data.entity;
  data.metrics = source.map((item) => {
    const metric = typeof item === "string" ? { entity: item } : { ...item };
    if (Array.isArray(metric.thresholds)) metric.thresholds = metric.thresholds.join(", ");
    const rgb = hexToRgb(metric.color);
    if (rgb) metric.color = rgb;
    else delete metric.color;
    return metric;
  });
  return data;
}

/** And back: what the form gives, as the YAML a person would write. */
export function fromForm(value, previous = {}) {
  const config = { ...value };
  delete config.entity;
  const before = Array.isArray(previous.metrics) ? previous.metrics : [];
  config.metrics = (Array.isArray(value.metrics) ? value.metrics : []).map((item, index) => {
    const metric = { ...item };
    const thresholds = parseThresholds(metric.thresholds);
    if (thresholds) metric.thresholds = thresholds;
    else delete metric.thresholds;
    const color = cssColor(metric.color);
    // A color the picker cannot show, such as a theme variable, stays as it was written.
    const kept = before[index] && typeof before[index] === "object" && before[index].entity === metric.entity &&
      !hexToRgb(before[index].color) ? cssColor(before[index].color) : null;
    if (color) metric.color = color;
    else if (kept) metric.color = kept;
    else delete metric.color;
    if (metric.aggregate === "auto") delete metric.aggregate;
    for (const [key, held] of Object.entries(metric)) if (held === "" || held === undefined || held === null) delete metric[key];
    return metric;
  });
  for (const key of ["period", "layout"]) if (config[key] === "calendar" || config[key] === "tabs") delete config[key];
  for (const [key, held] of Object.entries(config)) if (held === "" || held === undefined || held === null) delete config[key];
  return config;
}

class YearCardEditor extends Base {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  connectedCallback() {
    this._render();
  }

  get _lang() {
    return localeSettings(this._hass).language;
  }

  _schema() {
    const t = (key) => translate(this._lang, key);
    const select = (options) => ({ select: { mode: "dropdown", options: options.map(([value, key]) => ({ value, label: t(key) })) } });
    return [
      { name: "title", selector: { text: {} } },
      {
        name: "metrics",
        selector: {
          object: {
            multiple: true,
            label_field: "entity",
            fields: {
              entity: { selector: { entity: { domain: "sensor" } }, label: t("edEntity") },
              statistic: { selector: { statistic: {} }, label: t("edStatistic") },
              name: { selector: { text: {} }, label: t("edName") },
              color: { selector: { color_rgb: {} }, label: t("edColor") },
              thresholds: { selector: { text: {} }, label: t("edThresholds") },
              aggregate: {
                selector: select([["auto", "aggAuto"], ["sum", "aggSum"], ["max", "aggMax"], ["mean", "aggMean"], ["min", "aggMin"]]),
                label: t("edAggregate"),
              },
            },
          },
        },
      },
      { name: "period", selector: select([["calendar", "edCalendar"], ["rolling", "edRolling"]]) },
      { name: "layout", selector: select([["tabs", "edTabs"], ["rows", "edRows"]]) },
    ];
  }

  _label(name) {
    const key = { title: "edTitle", metrics: "edMetrics", period: "edPeriod", layout: "edLayout" }[name];
    return translate(this._lang, key ?? name);
  }

  _render() {
    if (!this.shadowRoot || !this.isConnected || !this._hass) return;
    if (!customElements.get("ha-form")) {
      if (!this._waiting) {
        this._waiting = true;
        customElements.whenDefined("ha-form").then(() => this._render());
      }
      return;
    }
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (item) => item.label ?? this._label(item.name);
      this._form.addEventListener("value-changed", (event) => {
        event.stopPropagation();
        const config = fromForm({ ...this._config, ...event.detail.value }, this._config);
        this._config = config;
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
      });
      this.shadowRoot.replaceChildren(this._form);
    }
    this._form.hass = this._hass;
    const schema = this._schema();
    const key = JSON.stringify(schema);
    if (key !== this._schemaKey) {
      this._schemaKey = key;
      this._form.schema = schema;
    }
    this._form.data = { period: "calendar", layout: "tabs", ...toForm(this._config) };
  }
}

if (typeof customElements !== "undefined") {
  if (!customElements.get(TAG)) customElements.define(TAG, YearCard);
  if (!customElements.get(`${TAG}-editor`)) customElements.define(`${TAG}-editor`, YearCardEditor);
}

if (typeof window !== "undefined") {
  window.customCards = window.customCards || [];
  if (!window.customCards.some((card) => card.type === TAG)) {
    window.customCards.push({
      type: TAG,
      name: "Life Dashboard Year",
      description: "A year of any sensor as a grid with one square per day, from its long-term statistics.",
      preview: true,
      documentationURL: "https://github.com/owen282000/life-dashboard-year-card",
    });
  }
}
