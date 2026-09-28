/**
 * SPM — mock seed data.
 *
 * TEMPORARY. This file exists only until KSS.Service.SPM is built; it is the
 * single place fake data lives. Nothing here is imported by a page directly —
 * pages go through `spm-api.ts`, so deleting this file later touches one import.
 *
 * Deliberately DETERMINISTIC: fixed ids, fixed timestamps, no Math.random() and
 * no Date.now(). Random or clock-derived values would differ between the server
 * render and the client hydration and produce React hydration mismatches.
 *
 * Ids look like v7 GUIDs because the real backend produces v7 GUIDs. They are
 * still literals — the UI never generates an id.
 */

import type {
  AuditEntry,
  Discrepancy,
  ExternalServiceHealth,
  Holding,
  Instrument,
  InstrumentFaq,
  InvestmentOrder,
  InvestmentRequest,
  InvestorAccount,
  LedgerEntry,
  ManualAdjustment,
  OrderEvent,
  PaymentTransaction,
  ProfitDistribution,
  ReconciliationRun,
  ResolutionCase,
  Settlement,
} from './types';

/** The day this dataset is anchored to. Keeps every relative display stable. */
export const MOCK_TODAY = '2026-08-21T00:00:00.000Z';

const g = (n: string) => `01991f2a-${n}-7000-8000-000000000001`;

/* ── instruments ──────────────────────────────────────────────────────────── */

/**
 * The questions every fund answers the same way, with the fund's own name woven
 * in. A helper rather than five copy-pasted arrays — it is a pure function of
 * its arguments, so the data stays as deterministic as a literal would be, and
 * a wording fix lands on all five funds at once instead of four of them.
 *
 * Fund-specific questions are appended at each call site.
 */
function commonFaq(nameFa: string, nameEn: string): InstrumentFaq[] {
  return [
    {
      questionFa: 'منظور از NAV صدور چیست؟',
      questionEn: 'What is the issue NAV?',
      answerFa:
        'NAV صدور قیمتی است که شما برای خرید هر واحد سرمایه‌گذاری می‌پردازید. این قیمت از ارزش خالص دارایی‌های صندوق به‌علاوه‌ی کارمزد صدور به دست می‌آید و روزانه محاسبه می‌شود.',
      answerEn:
        'The issue NAV is the price you pay for each unit you buy. It is the fund’s net asset value plus the issuance fee, and it is recalculated every business day.',
    },
    {
      questionFa: 'منظور از NAV ابطال چیست؟',
      questionEn: 'What is the redemption NAV?',
      answerFa:
        'NAV ابطال قیمتی است که هنگام برداشت، بابت هر واحد به شما پرداخت می‌شود. اختلاف آن با NAV صدور همان کارمزد صدور صندوق است.',
      answerEn:
        'The redemption NAV is what you are paid per unit when you withdraw. The gap between it and the issue NAV is the fund’s issuance fee.',
    },
    {
      questionFa: 'از کدام بخش می‌توان سرمایه‌گذاری و برداشت انجام داد؟',
      questionEn: 'Where do I invest or withdraw?',
      answerFa:
        'از همین صفحه، با دکمه‌های «سرمایه‌گذاری» و «برداشت»، درخواست شما با صندوق انتخاب‌شده باز می‌شود و تنها کافی است مبلغ یا تعداد واحد را وارد کنید.',
      answerEn:
        'From this page — the “Invest” and “Withdraw” buttons open a new request with this fund already selected, so you only enter the amount or the number of units.',
    },
    {
      questionFa: `حداقل مبلغ برای شروع سرمایه‌گذاری در ${nameFa} چقدر است؟`,
      questionEn: `What is the minimum to start investing in ${nameEn}?`,
      answerFa:
        'حداقل و حداکثر مبلغ هر درخواست در بخش «قوانین صندوق» همین صفحه آمده است و همان مقدار در فرم ثبت درخواست اعتبارسنجی می‌شود.',
      answerEn:
        'The minimum and maximum per request are shown in the “Fund rules” section of this page, and the request form validates against exactly those figures.',
    },
    {
      questionFa: 'درخواست من چه زمانی پردازش می‌شود؟',
      questionEn: 'When is my request processed?',
      answerFa:
        'درخواست‌های ثبت‌شده پیش از ساعت مقرر (cut-off) همان روز کاری پردازش می‌شوند و درخواست‌های پس از آن به روز کاری بعد منتقل می‌شود. زمان تسویه به‌صورت T+n در همین صفحه آمده است.',
      answerEn:
        'Requests submitted before the cut-off time are processed the same business day; later ones roll to the next. The settlement window is shown as T+n on this page.',
    },
    {
      questionFa: 'آیا امکان ضرر بر روی اصل سرمایه وجود دارد؟',
      questionEn: 'Can I lose my principal?',
      answerFa:
        'در صندوق‌های درآمد ثابت، ترکیب دارایی به‌گونه‌ای است که نوسان اصل سرمایه بسیار محدود باشد؛ اما هیچ بازدهی تضمین‌شده نیست و بازدهی گذشته تضمینی برای آینده نیست. در صندوق‌های کالایی و سهامی نوسان اصل سرمایه کاملاً محتمل است.',
      answerEn:
        'Fixed-income funds are built so that principal moves very little, but no return is guaranteed and past performance does not guarantee future results. In commodity and equity funds the principal can and does move.',
    },
  ];
}

export const MOCK_INSTRUMENTS: Instrument[] = [
  {
    id: g('0001'),
    symbol: 'سپاس',
    nameFa: 'صندوق درآمد ثابت سپاس',
    nameEn: 'Sepas Fixed Income ETF',
    instrumentType: 'FixedIncomeEtf',
    isActive: true,
    navPerUnit: 10_450,
    navIssue: 10_512,
    navRedeem: 10_450,
    profile: {
      annualYieldPct: 31.5,
      monthlyReturnPct: 2.1,
      yearlyReturnPct: 28.4,
      profitDistributionFa: '۲۵ هرماه',
      profitDistributionEn: '25th of each month',
      headlineFa: 'افزایش سود سالیانه تا ۳۱.۵٪ با فعال‌سازی گزینه صدور از محل سود',
      headlineEn: 'Annual yield up to 31.5% with profit-reinvestment issuance enabled',
      aboutFa:
        'صندوق درآمد ثابت سپاس با بیش از ده سال سابقه، یکی از پرحجم‌ترین صندوق‌های درآمد ثابت مجموعه است. سود این صندوق به‌صورت روزشمار محاسبه و در دوره‌های ماهانه به‌صورت سود نقدی به دارندگان واحدهای سرمایه‌گذاری پرداخت می‌شود. ارزش اسمی هر واحد ۱۰٬۰۰۰ ریال است و سرمایه‌گذاری حتی با خرید یک واحد نیز امکان‌پذیر است.',
      aboutEn:
        'Sepas is one of the largest fixed-income funds in the family, with over ten years of history. Profit accrues daily and is paid out monthly in cash to unit holders. The nominal value of a unit is 10,000 IRR, and an investment can begin with a single unit.',
      registrationNumber: '11726',
      guarantorNameFa: 'بانک توسعه پارس',
      guarantorNameEn: 'Pars Development Bank',
      managerNameFa: 'تأمین سرمایه کاسپین',
      managerNameEn: 'Caspian Investment Banking',
      custodianNameFa: 'مؤسسه حسابرسی آگاه‌نگر',
      custodianNameEn: 'Agah Negar Audit Institute',
      workingDaysFa: 'شنبه تا چهارشنبه (به جز ایام تعطیل رسمی)',
      workingDaysEn: 'Saturday to Wednesday, excluding public holidays',
      websiteUrl: 'https://example.ir/funds/sepas',
      highlight: {
        titleFa: 'برداشت آنی',
        titleEn: 'Instant withdrawal',
        bodyFa:
          'در یک سرمایه‌گذاری هوشمندانه، دسترسی سریع به پول (نقدشوندگی) به اندازه‌ی سودآوری اهمیت دارد. با ثبت درخواست «ابطال آنی»، مبلغ درخواستی بدون معطلی به حساب بانکی ثبت‌شده‌ی شما واریز می‌شود.',
        bodyEn:
          'In a well-made investment, getting to your money quickly matters as much as the return. With an instant-redemption request, the amount is transferred to your registered bank account without waiting.',
        calloutFa: 'واریز در کمتر از ۱۰ دقیقه',
        calloutEn: 'Paid out in under 10 minutes',
      },
      faq: commonFaq('صندوق درآمد ثابت سپاس', 'Sepas Fixed Income ETF'),
    },
    rule: {
      minAmount: 1_000_000,
      maxAmount: 5_000_000_000,
      minUnits: 100,
      cutOffTime: '12:30',
      settlementDays: 1,
      effectiveFrom: '2026-01-01T00:00:00.000Z',
      effectiveTo: null,
    },
  },
  {
    id: g('0002'),
    symbol: 'سپینا',
    nameFa: 'صندوق درآمد ثابت سپینا',
    nameEn: 'Sepina Fixed Income ETF',
    instrumentType: 'FixedIncomeEtf',
    isActive: true,
    navPerUnit: 12_180,
    navIssue: 12_253,
    navRedeem: 12_180,
    profile: {
      annualYieldPct: 33.2,
      monthlyReturnPct: 2.24,
      yearlyReturnPct: 29,
      profitDistributionFa: '۳۱ هرماه',
      profitDistributionEn: '31st of each month',
      headlineFa: 'افزایش سود سالیانه تا ۳۳.۲٪ با فعال‌سازی گزینه صدور از محل سود',
      headlineEn: 'Annual yield up to 33.2% with profit-reinvestment issuance enabled',
      aboutFa:
        'صندوق درآمد ثابت سپینا با بیش از پانزده سال سابقه، هم‌اکنون به‌عنوان یکی از بزرگ‌ترین صندوق‌های درآمد ثابت شناخته می‌شود و مدیریت دارایی‌هایی بالغ بر ۵۷۰ هزار میلیارد ریال را بر عهده دارد. سود این صندوق روزشمار محاسبه و ماهانه پرداخت می‌شود و ارزش اسمی هر واحد ۱٬۰۰۰٬۰۰۰ ریال است.',
      aboutEn:
        'Sepina, with more than fifteen years of history, is among the largest fixed-income funds in the market and manages assets of over 570,000 billion IRR. Profit accrues daily and is paid monthly; the nominal value of a unit is 1,000,000 IRR.',
      registrationNumber: '11384',
      guarantorNameFa: 'بانک توسعه پارس',
      guarantorNameEn: 'Pars Development Bank',
      managerNameFa: 'تأمین سرمایه تمدن نو',
      managerNameEn: 'Tamaddon No Investment Banking',
      custodianNameFa: 'مؤسسه حسابرسی آگاه‌نگر',
      custodianNameEn: 'Agah Negar Audit Institute',
      workingDaysFa: 'شنبه تا پنجشنبه (به جز ایام تعطیل رسمی)',
      workingDaysEn: 'Saturday to Thursday, excluding public holidays',
      websiteUrl: 'https://example.ir/funds/sepina',
      highlight: {
        titleFa: 'برداشت آنی',
        titleEn: 'Instant withdrawal',
        bodyFa:
          'با ثبت درخواست «ابطال آنی»، مبلغ درخواستی در کمتر از ۱۰ دقیقه به حساب بانکی‌تان واریز می‌شود تا تجربه‌ی یک سرمایه‌گذاری مطمئن با سود مستمر و دسترسی همیشگی برای شما فراهم شود.',
        bodyEn:
          'With an instant-redemption request the amount reaches your bank account in under ten minutes — steady income without giving up access to your money.',
        calloutFa: 'واریز در کمتر از ۱۰ دقیقه',
        calloutEn: 'Paid out in under 10 minutes',
      },
      faq: commonFaq('صندوق درآمد ثابت سپینا', 'Sepina Fixed Income ETF'),
    },
    rule: {
      minAmount: 5_000_000,
      maxAmount: 20_000_000_000,
      minUnits: 500,
      cutOffTime: '12:00',
      settlementDays: 2,
      effectiveFrom: '2026-03-15T00:00:00.000Z',
      effectiveTo: null,
    },
  },
  {
    id: g('0003'),
    symbol: 'سپهر',
    nameFa: 'صندوق درآمد ثابت سپهر',
    nameEn: 'Sepehr Fixed Income ETF',
    instrumentType: 'FixedIncomeEtf',
    isActive: false,
    navPerUnit: 9_900,
    navIssue: 9_959,
    navRedeem: 9_900,
    // The closed fund, and the only one with an EMPTY highlight — it is the
    // fixture that proves the highlight band renders nothing rather than an
    // empty box. It also has no holdings and no orders (see MOCK_HOLDINGS), so
    // it is the row that exercises every empty state on the detail page at once.
    profile: {
      annualYieldPct: 27.8,
      monthlyReturnPct: 1.9,
      yearlyReturnPct: 26.1,
      profitDistributionFa: '۱۵ هرماه',
      profitDistributionEn: '15th of each month',
      headlineFa: 'این صندوق برای پذیره‌نویسی جدید بسته است',
      headlineEn: 'This fund is closed to new subscriptions',
      aboutFa:
        'صندوق درآمد ثابت سپهر از مردادماه ۱۴۰۵ برای صدور واحد جدید بسته شده است و صدور و ابطال از طریق این درگاه در دسترس نیست. برای وضعیت واحدهای موجود خود با واحد پشتیبانی تماس بگیرید.',
      aboutEn:
        'Sepehr has been closed to new unit issuance since August 2026, and issuance and redemption are not available through this portal. Contact support about the status of units you already hold.',
      registrationNumber: '10952',
      guarantorNameFa: 'بانک توسعه پارس',
      guarantorNameEn: 'Pars Development Bank',
      managerNameFa: 'تأمین سرمایه کاسپین',
      managerNameEn: 'Caspian Investment Banking',
      custodianNameFa: 'مؤسسه حسابرسی آگاه‌نگر',
      custodianNameEn: 'Agah Negar Audit Institute',
      workingDaysFa: 'شنبه تا چهارشنبه (به جز ایام تعطیل رسمی)',
      workingDaysEn: 'Saturday to Wednesday, excluding public holidays',
      websiteUrl: '',
      highlight: {
        titleFa: '',
        titleEn: '',
        bodyFa: '',
        bodyEn: '',
        calloutFa: '',
        calloutEn: '',
      },
      faq: commonFaq('صندوق درآمد ثابت سپهر', 'Sepehr Fixed Income ETF'),
    },
    rule: {
      minAmount: 1_000_000,
      maxAmount: 1_000_000_000,
      minUnits: 100,
      cutOffTime: '11:30',
      settlementDays: 1,
      effectiveFrom: '2025-06-01T00:00:00.000Z',
      effectiveTo: '2026-07-31T00:00:00.000Z',
    },
  },
  {
    id: g('0004'),
    symbol: 'سپیدار',
    nameFa: 'صندوق کالایی سپیدار',
    nameEn: 'Sepidar Commodity Fund',
    instrumentType: 'CommodityFund',
    isActive: true,
    navPerUnit: 28_640,
    navIssue: 28_812,
    navRedeem: 28_640,
    profile: {
      annualYieldPct: 24,
      monthlyReturnPct: 3.6,
      yearlyReturnPct: 41.7,
      profitDistributionFa: 'بدون تقسیم سود دوره‌ای',
      profitDistributionEn: 'No periodic distribution',
      headlineFa: 'پوشش نوسان قیمت کالا، بدون نگهداری فیزیکی',
      headlineEn: 'Commodity exposure without holding the physical asset',
      aboutFa:
        'صندوق کالایی سپیدار دارایی خود را عمدتاً در گواهی سپرده‌ی کالایی و اوراق مبتنی بر کالا سرمایه‌گذاری می‌کند. این صندوق سود دوره‌ای پرداخت نمی‌کند؛ بازدهی سرمایه‌گذار از تغییر ارزش هر واحد به دست می‌آید و بنابراین نوسان اصل سرمایه در آن طبیعی است.',
      aboutEn:
        'Sepidar invests mainly in commodity deposit certificates and commodity-backed securities. It pays no periodic profit — the investor’s return comes from the change in unit value, so movement in the principal is normal and expected.',
      registrationNumber: '11890',
      guarantorNameFa: 'بانک توسعه پارس',
      guarantorNameEn: 'Pars Development Bank',
      managerNameFa: 'تأمین سرمایه کاسپین',
      managerNameEn: 'Caspian Investment Banking',
      custodianNameFa: 'مؤسسه حسابرسی رهنمون',
      custodianNameEn: 'Rahnemoon Audit Institute',
      workingDaysFa: 'شنبه تا چهارشنبه (به جز ایام تعطیل رسمی)',
      workingDaysEn: 'Saturday to Wednesday, excluding public holidays',
      websiteUrl: 'https://example.ir/funds/sepidar',
      highlight: {
        titleFa: 'بدون انبارداری و حمل',
        titleEn: 'No storage, no delivery',
        bodyFa:
          'سرمایه‌گذاری در کالا بدون دغدغه‌ی نگهداری فیزیکی، بیمه و حمل. هر واحد صندوق نماینده‌ی سهمی از سبد کالایی است و نقدشوندگی آن از طریق همین سامانه انجام می‌شود.',
        bodyEn:
          'Commodity exposure without the storage, insurance and transport that owning the physical asset would bring. Each unit represents a share of the commodity basket, and it is liquidated through this same portal.',
        calloutFa: 'نقدشوندگی در چارچوب تسویه‌ی T+۲',
        calloutEn: 'Liquidated within the T+2 settlement window',
      },
      faq: commonFaq('صندوق کالایی سپیدار', 'Sepidar Commodity Fund'),
    },
    rule: {
      minAmount: 10_000_000,
      maxAmount: 10_000_000_000,
      minUnits: 200,
      cutOffTime: '12:00',
      settlementDays: 2,
      effectiveFrom: '2026-02-01T00:00:00.000Z',
      effectiveTo: null,
    },
  },
  {
    id: g('0005'),
    symbol: 'سپند',
    nameFa: 'صندوق سهامی و مختلط سپند',
    nameEn: 'Sepand Equity & Mixed Fund',
    instrumentType: 'EquityMixedFund',
    isActive: true,
    navPerUnit: 41_320,
    navIssue: 41_568,
    navRedeem: 41_320,
    // The only fund with a NEGATIVE trailing return. Deliberate: it is the
    // fixture for the down-tone percentage path, which no other row exercises.
    profile: {
      annualYieldPct: 22.5,
      monthlyReturnPct: -1.4,
      yearlyReturnPct: 52.3,
      profitDistributionFa: 'بدون تقسیم سود دوره‌ای',
      profitDistributionEn: 'No periodic distribution',
      headlineFa: 'بازدهی یکسال گذشته ۵۲.۳٪ — با پذیرش نوسان کوتاه‌مدت',
      headlineEn: 'Up 52.3% over the past year — with short-term volatility accepted',
      aboutFa:
        'صندوق سهامی و مختلط سپند بخش عمده‌ی دارایی خود را در سهام شرکت‌های پذیرفته‌شده در بورس و بخشی را در اوراق با درآمد ثابت نگهداری می‌کند. این صندوق برای سرمایه‌گذاری میان‌مدت و بلندمدت طراحی شده و نوسان کوتاه‌مدت ارزش هر واحد در آن کاملاً محتمل است.',
      aboutEn:
        'Sepand holds most of its assets in listed equities and the remainder in fixed-income securities. It is built for a medium- to long-term horizon, and short-term movement in unit value is entirely expected.',
      registrationNumber: '12014',
      guarantorNameFa: '—',
      guarantorNameEn: '—',
      managerNameFa: 'تأمین سرمایه تمدن نو',
      managerNameEn: 'Tamaddon No Investment Banking',
      custodianNameFa: 'مؤسسه حسابرسی رهنمون',
      custodianNameEn: 'Rahnemoon Audit Institute',
      workingDaysFa: 'شنبه تا چهارشنبه (به جز ایام تعطیل رسمی)',
      workingDaysEn: 'Saturday to Wednesday, excluding public holidays',
      websiteUrl: 'https://example.ir/funds/sepand',
      highlight: {
        titleFa: '',
        titleEn: '',
        bodyFa: '',
        bodyEn: '',
        calloutFa: '',
        calloutEn: '',
      },
      faq: commonFaq('صندوق سهامی و مختلط سپند', 'Sepand Equity & Mixed Fund'),
    },
    rule: {
      minAmount: 20_000_000,
      maxAmount: 15_000_000_000,
      minUnits: 100,
      cutOffTime: '11:45',
      settlementDays: 3,
      effectiveFrom: '2026-04-01T00:00:00.000Z',
      effectiveTo: null,
    },
  },
];

/* ── investor accounts ────────────────────────────────────────────────────── */

export const MOCK_ACCOUNTS: InvestorAccount[] = [
  {
    id: g('1001'),
    personId: g('a001'),
    fullNameFa: 'علی رضایی',
    fullNameEn: 'Ali Rezaei',
    nationalId: '0064553121',
    brokerageAccountCode: 'BRK-114522',
    iban: 'IR820540102680020817909002',
    accountHolderName: 'علی رضایی',
    isActive: true,
    openedAt: '2026-02-11T08:15:00.000Z',
    totalUnits: 24_500,
    balance: 256_025_000,
  },
  {
    id: g('1002'),
    personId: g('a002'),
    fullNameFa: 'مریم کاظمی',
    fullNameEn: 'Maryam Kazemi',
    nationalId: '0079221845',
    brokerageAccountCode: 'BRK-114598',
    iban: 'IR330550104680020817909117',
    accountHolderName: 'مریم کاظمی',
    isActive: true,
    openedAt: '2026-03-02T09:40:00.000Z',
    totalUnits: 61_200,
    balance: 745_416_000,
  },
  {
    id: g('1003'),
    personId: g('a003'),
    fullNameFa: 'حسین مرادی',
    fullNameEn: 'Hossein Moradi',
    nationalId: '2298114076',
    brokerageAccountCode: null,
    iban: 'IR470170000000123456789001',
    accountHolderName: 'حسین مرادی',
    isActive: true,
    openedAt: '2026-08-18T11:05:00.000Z',
    totalUnits: 0,
    balance: 0,
  },
  {
    id: g('1004'),
    personId: g('a004'),
    fullNameFa: 'زهرا احمدی',
    fullNameEn: 'Zahra Ahmadi',
    nationalId: '0451889233',
    brokerageAccountCode: 'BRK-115003',
    iban: 'IR610120000000987654321005',
    accountHolderName: 'زهرا احمدی',
    isActive: true,
    openedAt: '2026-05-21T07:25:00.000Z',
    totalUnits: 8_000,
    balance: 83_600_000,
  },
  {
    id: g('1005'),
    personId: g('a005'),
    fullNameFa: 'رضا نوری',
    fullNameEn: 'Reza Nouri',
    nationalId: '1288340512',
    brokerageAccountCode: 'BRK-115240',
    iban: null,
    accountHolderName: 'رضا نوری',
    isActive: false,
    openedAt: '2026-06-30T13:50:00.000Z',
    totalUnits: 1_500,
    balance: 15_675_000,
  },
];

/* ── requests ─────────────────────────────────────────────────────────────── */

const req = (
  n: number,
  type: InvestmentRequest['requestType'],
  status: InvestmentRequest['status'],
  accountIdx: number,
  instrumentIdx: number,
  amount: number,
  units: number | null,
  submittedAt: string,
  needsManualReview = false,
): InvestmentRequest => ({
  id: g(`2${String(n).padStart(3, '0')}`),
  requestNumber: `SPM-1405-${String(n).padStart(4, '0')}`,
  requestType: type,
  status,
  investorAccountId: MOCK_ACCOUNTS[accountIdx].id,
  instrumentId: MOCK_INSTRUMENTS[instrumentIdx].id,
  amount,
  units,
  submittedAt,
  cutOffAt: null,
  needsManualReview,
  idempotencyKey: `srv-${String(n).padStart(4, '0')}`,
});

export const MOCK_REQUESTS: InvestmentRequest[] = [
  req(1, 'Deposit', 'Settled', 0, 0, 100_000_000, 9_569, '2026-08-11T06:20:00.000Z'),
  req(2, 'Deposit', 'Settled', 1, 1, 500_000_000, 41_050, '2026-08-11T07:05:00.000Z'),
  req(3, 'Withdrawal', 'Settled', 0, 0, 50_000_000, 4_784, '2026-08-12T08:30:00.000Z'),
  req(4, 'Deposit', 'Filled', 3, 0, 80_000_000, 7_655, '2026-08-13T05:55:00.000Z'),
  req(5, 'Deposit', 'PartiallyFilled', 1, 1, 300_000_000, 24_630, '2026-08-17T06:10:00.000Z'),
  req(6, 'Withdrawal', 'OrderPlaced', 1, 1, 120_000_000, 9_852, '2026-08-19T07:45:00.000Z'),
  req(7, 'Deposit', 'Paid', 0, 0, 45_000_000, null, '2026-08-20T05:30:00.000Z'),
  req(8, 'Deposit', 'AwaitingPayment', 2, 0, 20_000_000, null, '2026-08-20T09:15:00.000Z'),
  req(9, 'Deposit', 'Validated', 2, 0, 15_000_000, null, '2026-08-21T04:40:00.000Z'),
  req(10, 'Deposit', 'Submitted', 3, 1, 60_000_000, null, '2026-08-21T05:12:00.000Z'),
  req(11, 'Withdrawal', 'Failed', 4, 0, 15_000_000, 1_435, '2026-08-18T10:20:00.000Z', true),
  req(12, 'Deposit', 'Rejected', 4, 2, 2_000_000, null, '2026-08-16T11:00:00.000Z'),
  req(13, 'Deposit', 'Cancelled', 3, 0, 30_000_000, null, '2026-08-15T09:00:00.000Z'),
  req(14, 'Withdrawal', 'PartiallyFilled', 0, 0, 40_000_000, 3_827, '2026-08-20T06:55:00.000Z', true),
  req(15, 'Deposit', 'Settled', 1, 0, 250_000_000, 23_923, '2026-08-10T06:00:00.000Z'),
  req(16, 'Deposit', 'Draft', 2, 1, 10_000_000, null, '2026-08-21T06:05:00.000Z'),
];

/* ── payments ─────────────────────────────────────────────────────────────── */

export const MOCK_PAYMENTS: PaymentTransaction[] = [
  { id: g('3001'), requestId: g('2001'), status: 'Succeeded', amount: 100_000_000, gatewayReference: 'PG-88213344', rrn: '013422881190', paidAt: '2026-08-11T06:24:00.000Z' },
  { id: g('3002'), requestId: g('2002'), status: 'Succeeded', amount: 500_000_000, gatewayReference: 'PG-88213401', rrn: '013422881233', paidAt: '2026-08-11T07:09:00.000Z' },
  { id: g('3004'), requestId: g('2004'), status: 'Succeeded', amount: 80_000_000, gatewayReference: 'PG-88219922', rrn: '013422885510', paidAt: '2026-08-13T05:59:00.000Z' },
  { id: g('3005'), requestId: g('2005'), status: 'Succeeded', amount: 300_000_000, gatewayReference: 'PG-88231180', rrn: '013422890034', paidAt: '2026-08-17T06:14:00.000Z' },
  { id: g('3007'), requestId: g('2007'), status: 'Succeeded', amount: 45_000_000, gatewayReference: 'PG-88240515', rrn: '013422893371', paidAt: '2026-08-20T05:34:00.000Z' },
  { id: g('3008'), requestId: g('2008'), status: 'Pending', amount: 20_000_000, gatewayReference: null, rrn: null, paidAt: null },
  { id: g('3012'), requestId: g('2012'), status: 'Failed', amount: 2_000_000, gatewayReference: 'PG-88228877', rrn: null, paidAt: null },
  { id: g('3015'), requestId: g('2015'), status: 'Succeeded', amount: 250_000_000, gatewayReference: 'PG-88208844', rrn: '013422877712', paidAt: '2026-08-10T06:03:00.000Z' },
];

/* ── orders ───────────────────────────────────────────────────────────────── */

export const MOCK_ORDERS: InvestmentOrder[] = [
  { id: g('4001'), requestId: g('2001'), instrumentId: g('0001'), side: 'Buy', status: 'Executed', quantity: 9_569, filledQuantity: 9_569, price: 10_450, omsOrderRef: 'OMS-5512001', failureReason: null, placedAt: '2026-08-11T06:30:00.000Z', lastPolledAt: '2026-08-11T06:41:00.000Z' },
  { id: g('4002'), requestId: g('2002'), instrumentId: g('0002'), side: 'Buy', status: 'Executed', quantity: 41_050, filledQuantity: 41_050, price: 12_180, omsOrderRef: 'OMS-5512044', failureReason: null, placedAt: '2026-08-11T07:15:00.000Z', lastPolledAt: '2026-08-11T07:28:00.000Z' },
  { id: g('4003'), requestId: g('2003'), instrumentId: g('0001'), side: 'Sell', status: 'Executed', quantity: 4_784, filledQuantity: 4_784, price: 10_450, omsOrderRef: 'OMS-5514120', failureReason: null, placedAt: '2026-08-12T08:35:00.000Z', lastPolledAt: '2026-08-12T08:52:00.000Z' },
  { id: g('4004'), requestId: g('2004'), instrumentId: g('0001'), side: 'Buy', status: 'Executed', quantity: 7_655, filledQuantity: 7_655, price: 10_450, omsOrderRef: 'OMS-5518330', failureReason: null, placedAt: '2026-08-13T06:05:00.000Z', lastPolledAt: '2026-08-13T06:20:00.000Z' },
  { id: g('4005'), requestId: g('2005'), instrumentId: g('0002'), side: 'Buy', status: 'Partial', quantity: 24_630, filledQuantity: 14_800, price: 12_180, omsOrderRef: 'OMS-5524871', failureReason: null, placedAt: '2026-08-17T06:20:00.000Z', lastPolledAt: '2026-08-21T05:00:00.000Z' },
  { id: g('4006'), requestId: g('2006'), instrumentId: g('0002'), side: 'Sell', status: 'AwaitingResponse', quantity: 9_852, filledQuantity: 0, price: null, omsOrderRef: 'OMS-5531002', failureReason: null, placedAt: '2026-08-19T07:50:00.000Z', lastPolledAt: '2026-08-21T05:00:00.000Z' },
  { id: g('4011'), requestId: g('2011'), instrumentId: g('0001'), side: 'Sell', status: 'Failed', quantity: 1_435, filledQuantity: 0, price: null, omsOrderRef: null, failureReason: 'OMS rejected: insufficient free units at broker', placedAt: '2026-08-18T10:25:00.000Z', lastPolledAt: '2026-08-18T10:26:00.000Z' },
  { id: g('4014'), requestId: g('2014'), instrumentId: g('0001'), side: 'Sell', status: 'Partial', quantity: 3_827, filledQuantity: 1_900, price: 10_450, omsOrderRef: 'OMS-5540118', failureReason: null, placedAt: '2026-08-20T07:00:00.000Z', lastPolledAt: '2026-08-21T05:00:00.000Z' },
  { id: g('4015'), requestId: g('2015'), instrumentId: g('0001'), side: 'Buy', status: 'Executed', quantity: 23_923, filledQuantity: 23_923, price: 10_450, omsOrderRef: 'OMS-5502771', failureReason: null, placedAt: '2026-08-10T06:10:00.000Z', lastPolledAt: '2026-08-10T06:22:00.000Z' },
  { id: g('4007'), requestId: g('2007'), instrumentId: g('0001'), side: 'Buy', status: 'Pending', quantity: 4_306, filledQuantity: 0, price: null, omsOrderRef: null, failureReason: null, placedAt: null, lastPolledAt: null },
];

export const MOCK_ORDER_EVENTS: OrderEvent[] = [
  { id: g('5001'), orderId: g('4005'), action: 'Placed', detail: 'Order sent to OMS (24,630 units)', occurredAt: '2026-08-17T06:20:00.000Z', actor: 'system' },
  { id: g('5002'), orderId: g('4005'), action: 'Acknowledged', detail: 'OMS accepted, ref OMS-5524871', occurredAt: '2026-08-17T06:21:00.000Z', actor: 'system' },
  { id: g('5003'), orderId: g('4005'), action: 'PartialFill', detail: 'Filled 9,000 of 24,630', occurredAt: '2026-08-17T09:12:00.000Z', actor: 'system' },
  { id: g('5004'), orderId: g('4005'), action: 'PartialFill', detail: 'Filled 5,800 more — 14,800 of 24,630', occurredAt: '2026-08-18T09:40:00.000Z', actor: 'system' },
  { id: g('5005'), orderId: g('4005'), action: 'ManualReview', detail: 'Remaining 9,830 units unfilled past T+2 — flagged', occurredAt: '2026-08-20T11:00:00.000Z', actor: 'a.moradi' },
  { id: g('5011'), orderId: g('4011'), action: 'Placed', detail: 'Sell order sent to OMS (1,435 units)', occurredAt: '2026-08-18T10:25:00.000Z', actor: 'system' },
  { id: g('5012'), orderId: g('4011'), action: 'Rejected', detail: 'OMS rejected: insufficient free units at broker', occurredAt: '2026-08-18T10:26:00.000Z', actor: 'system' },
  { id: g('5013'), orderId: g('4011'), action: 'CaseOpened', detail: 'Resolution case SPM-C-0003 opened', occurredAt: '2026-08-18T10:35:00.000Z', actor: 'system' },
  { id: g('5014'), orderId: g('4014'), action: 'Placed', detail: 'Sell order sent to OMS (3,827 units)', occurredAt: '2026-08-20T07:00:00.000Z', actor: 'system' },
  { id: g('5015'), orderId: g('4014'), action: 'PartialFill', detail: 'Filled 1,900 of 3,827', occurredAt: '2026-08-20T10:05:00.000Z', actor: 'system' },
];

/* ── settlements ──────────────────────────────────────────────────────────── */

export const MOCK_SETTLEMENTS: Settlement[] = [
  { id: g('6001'), requestId: g('2001'), status: 'Settled', tradeDate: '2026-08-11T00:00:00.000Z', settlementDueDate: '2026-08-12T00:00:00.000Z', grossAmount: 100_000_000, feeAmount: 150_000, netPayable: 99_850_000, paidAt: '2026-08-12T07:30:00.000Z', failureReason: null },
  { id: g('6002'), requestId: g('2002'), status: 'Settled', tradeDate: '2026-08-11T00:00:00.000Z', settlementDueDate: '2026-08-13T00:00:00.000Z', grossAmount: 500_000_000, feeAmount: 750_000, netPayable: 499_250_000, paidAt: '2026-08-13T08:10:00.000Z', failureReason: null },
  { id: g('6003'), requestId: g('2003'), status: 'Settled', tradeDate: '2026-08-12T00:00:00.000Z', settlementDueDate: '2026-08-13T00:00:00.000Z', grossAmount: 50_000_000, feeAmount: 75_000, netPayable: 49_925_000, paidAt: '2026-08-13T09:05:00.000Z', failureReason: null },
  { id: g('6006'), requestId: g('2006'), status: 'PendingSale', tradeDate: '2026-08-19T00:00:00.000Z', settlementDueDate: '2026-08-21T00:00:00.000Z', grossAmount: 120_000_000, feeAmount: 180_000, netPayable: 119_820_000, paidAt: null, failureReason: null },
  { id: g('6014'), requestId: g('2014'), status: 'Delayed', tradeDate: '2026-08-20T00:00:00.000Z', settlementDueDate: '2026-08-21T00:00:00.000Z', grossAmount: 40_000_000, feeAmount: 60_000, netPayable: 39_940_000, paidAt: null, failureReason: 'Partial fill — remaining units unsold at cut-off' },
  { id: g('6011'), requestId: g('2011'), status: 'Failed', tradeDate: '2026-08-18T00:00:00.000Z', settlementDueDate: '2026-08-19T00:00:00.000Z', grossAmount: 15_000_000, feeAmount: 22_500, netPayable: 14_977_500, paidAt: null, failureReason: 'Sell order rejected by OMS' },
  { id: g('6015'), requestId: g('2015'), status: 'Settled', tradeDate: '2026-08-10T00:00:00.000Z', settlementDueDate: '2026-08-11T00:00:00.000Z', grossAmount: 250_000_000, feeAmount: 375_000, netPayable: 249_625_000, paidAt: '2026-08-11T07:50:00.000Z', failureReason: null },
  { id: g('6004'), requestId: g('2004'), status: 'PendingSettlement', tradeDate: '2026-08-13T00:00:00.000Z', settlementDueDate: '2026-08-14T00:00:00.000Z', grossAmount: 80_000_000, feeAmount: 120_000, netPayable: 79_880_000, paidAt: null, failureReason: null },
];

/* ── ledger ───────────────────────────────────────────────────────────────── */

export const MOCK_LEDGER: LedgerEntry[] = [
  { id: g('7001'), investorAccountId: g('1001'), sourceType: 'Request', sourceId: g('2015'), flowType: 'DepositIn', direction: 'Credit', amount: 250_000_000, balanceAfter: 250_000_000, valueDate: '2026-08-10T06:03:00.000Z', description: 'واریز وجه — SPM-1405-0015' },
  { id: g('7002'), investorAccountId: g('1001'), sourceType: 'Order', sourceId: g('4015'), flowType: 'UnitsPurchased', direction: 'Debit', amount: 249_995_350, balanceAfter: 4_650, valueDate: '2026-08-10T06:22:00.000Z', description: 'خرید 23,923 واحد سپاس' },
  { id: g('7003'), investorAccountId: g('1001'), sourceType: 'Request', sourceId: g('2001'), flowType: 'DepositIn', direction: 'Credit', amount: 100_000_000, balanceAfter: 100_004_650, valueDate: '2026-08-11T06:24:00.000Z', description: 'واریز وجه — SPM-1405-0001' },
  { id: g('7004'), investorAccountId: g('1001'), sourceType: 'Order', sourceId: g('4001'), flowType: 'UnitsPurchased', direction: 'Debit', amount: 99_996_050, balanceAfter: 8_600, valueDate: '2026-08-11T06:41:00.000Z', description: 'خرید 9,569 واحد سپاس' },
  { id: g('7005'), investorAccountId: g('1001'), sourceType: 'Settlement', sourceId: g('6001'), flowType: 'Fee', direction: 'Debit', amount: 150_000, balanceAfter: -141_400, valueDate: '2026-08-12T07:30:00.000Z', description: 'کارمزد تسویه' },
  { id: g('7006'), investorAccountId: g('1001'), sourceType: 'Order', sourceId: g('4003'), flowType: 'UnitsSold', direction: 'Credit', amount: 49_992_800, balanceAfter: 49_851_400, valueDate: '2026-08-12T08:52:00.000Z', description: 'فروش 4,784 واحد سپاس' },
  { id: g('7007'), investorAccountId: g('1001'), sourceType: 'Request', sourceId: g('2003'), flowType: 'WithdrawalOut', direction: 'Debit', amount: 49_925_000, balanceAfter: -73_600, valueDate: '2026-08-13T09:05:00.000Z', description: 'برداشت وجه — SPM-1405-0003' },
  { id: g('7008'), investorAccountId: g('1001'), sourceType: 'Adjustment', sourceId: g('9001'), flowType: 'Adjustment', direction: 'Credit', amount: 73_600, balanceAfter: 0, valueDate: '2026-08-14T10:00:00.000Z', description: 'اصلاح دستی — گرد کردن کارمزد' },
  { id: g('7010'), investorAccountId: g('1002'), sourceType: 'Request', sourceId: g('2002'), flowType: 'DepositIn', direction: 'Credit', amount: 500_000_000, balanceAfter: 500_000_000, valueDate: '2026-08-11T07:09:00.000Z', description: 'واریز وجه — SPM-1405-0002' },
  { id: g('7011'), investorAccountId: g('1002'), sourceType: 'Order', sourceId: g('4002'), flowType: 'UnitsPurchased', direction: 'Debit', amount: 499_989_000, balanceAfter: 11_000, valueDate: '2026-08-11T07:28:00.000Z', description: 'خرید 41,050 واحد سپینا' },
  { id: g('7012'), investorAccountId: g('1002'), sourceType: 'Request', sourceId: g('2005'), flowType: 'DepositIn', direction: 'Credit', amount: 300_000_000, balanceAfter: 300_011_000, valueDate: '2026-08-17T06:14:00.000Z', description: 'واریز وجه — SPM-1405-0005' },
  { id: g('7013'), investorAccountId: g('1002'), sourceType: 'Order', sourceId: g('4005'), flowType: 'UnitsPurchased', direction: 'Debit', amount: 180_264_000, balanceAfter: 119_747_000, valueDate: '2026-08-18T09:40:00.000Z', description: 'خرید جزئی 14,800 واحد سپینا' },
  { id: g('7020'), investorAccountId: g('1004'), sourceType: 'Request', sourceId: g('2004'), flowType: 'DepositIn', direction: 'Credit', amount: 80_000_000, balanceAfter: 80_000_000, valueDate: '2026-08-13T05:59:00.000Z', description: 'واریز وجه — SPM-1405-0004' },
  { id: g('7021'), investorAccountId: g('1004'), sourceType: 'Order', sourceId: g('4004'), flowType: 'UnitsPurchased', direction: 'Debit', amount: 79_994_750, balanceAfter: 5_250, valueDate: '2026-08-13T06:20:00.000Z', description: 'خرید 7,655 واحد سپاس' },
];

/* ── reconciliation ───────────────────────────────────────────────────────── */

export const MOCK_RECON_RUNS: ReconciliationRun[] = [
  { id: g('8001'), runDate: '2026-08-21T00:00:00.000Z', startedAt: '2026-08-21T02:00:00.000Z', completedAt: '2026-08-21T02:04:00.000Z', internalCount: 16, omsCount: 15, bankCount: 14, matchedCount: 12, discrepancyCount: 4, status: 'Completed' },
  { id: g('8002'), runDate: '2026-08-20T00:00:00.000Z', startedAt: '2026-08-20T02:00:00.000Z', completedAt: '2026-08-20T02:03:00.000Z', internalCount: 14, omsCount: 14, bankCount: 14, matchedCount: 14, discrepancyCount: 0, status: 'Completed' },
  { id: g('8003'), runDate: '2026-08-19T00:00:00.000Z', startedAt: '2026-08-19T02:00:00.000Z', completedAt: '2026-08-19T02:05:00.000Z', internalCount: 13, omsCount: 12, bankCount: 13, matchedCount: 12, discrepancyCount: 1, status: 'Completed' },
];

export const MOCK_DISCREPANCIES: Discrepancy[] = [
  { id: g('8101'), reconciliationRunId: g('8001'), discrepancyType: 'MissingInOms', status: 'Investigating', requestId: g('2011'), orderId: g('4011'), internalAmount: 15_000_000, externalAmount: null, externalRef: null, assignedTo: 'a.moradi', detectedAt: '2026-08-21T02:04:00.000Z', resolvedAt: null },
  { id: g('8102'), reconciliationRunId: g('8001'), discrepancyType: 'AmountMismatch', status: 'Open', requestId: g('2005'), orderId: g('4005'), internalAmount: 300_000_000, externalAmount: 180_264_000, externalRef: 'OMS-5524871', assignedTo: 'a.moradi', detectedAt: '2026-08-21T02:04:00.000Z', resolvedAt: null },
  { id: g('8103'), reconciliationRunId: g('8001'), discrepancyType: 'MissingInBank', status: 'Open', requestId: g('2014'), orderId: g('4014'), internalAmount: 39_940_000, externalAmount: null, externalRef: null, assignedTo: null, detectedAt: '2026-08-21T02:04:00.000Z', resolvedAt: null },
  { id: g('8104'), reconciliationRunId: g('8001'), discrepancyType: 'StatusMismatch', status: 'Open', requestId: g('2006'), orderId: g('4006'), internalAmount: 120_000_000, externalAmount: 120_000_000, externalRef: 'OMS-5531002', assignedTo: null, detectedAt: '2026-08-21T02:04:00.000Z', resolvedAt: null },
  { id: g('8105'), reconciliationRunId: g('8003'), discrepancyType: 'AmountMismatch', status: 'Resolved', requestId: g('2001'), orderId: g('4001'), internalAmount: 100_000_000, externalAmount: 99_926_400, externalRef: 'OMS-5512001', assignedTo: 'm.kazemi', detectedAt: '2026-08-19T02:05:00.000Z', resolvedAt: '2026-08-19T11:30:00.000Z' },
];

export const MOCK_ADJUSTMENTS: ManualAdjustment[] = [
  { id: g('9001'), discrepancyId: g('8105'), amount: 73_600, reason: 'گرد کردن کارمزد تسویه — اختلاف ریالی', requestedBy: 'm.kazemi', requestedAt: '2026-08-19T10:40:00.000Z', firstApprover: 'h.rahimi', firstApprovedAt: '2026-08-19T11:10:00.000Z', secondApprover: 'f.sadeghi', secondApprovedAt: '2026-08-19T11:30:00.000Z', status: 'Approved' },
  { id: g('9002'), discrepancyId: g('8102'), amount: 119_736_000, reason: 'برگشت مانده پرنشده سفارش جزئی به حساب سرمایه‌گذار', requestedBy: 'a.moradi', requestedAt: '2026-08-21T06:00:00.000Z', firstApprover: 'h.rahimi', firstApprovedAt: '2026-08-21T06:45:00.000Z', secondApprover: null, secondApprovedAt: null, status: 'PendingSecond' },
  { id: g('9003'), discrepancyId: g('8101'), amount: 15_000_000, reason: 'برگشت وجه برداشت ناموفق', requestedBy: 'a.moradi', requestedAt: '2026-08-21T07:20:00.000Z', firstApprover: null, firstApprovedAt: null, secondApprover: null, secondApprovedAt: null, status: 'PendingFirst' },
];

/* ── resolution cases ─────────────────────────────────────────────────────── */

export const MOCK_CASES: ResolutionCase[] = [
  {
    id: g('a101'), caseNumber: 'SPM-C-0003', status: 'Assigned', sourceType: 'Order', sourceId: g('4011'),
    title: 'سفارش فروش رد شده — موجودی واحد ناکافی نزد کارگزار',
    assignedTo: 'a.moradi', openedAt: '2026-08-18T10:35:00.000Z', dueAt: '2026-08-18T12:35:00.000Z', resolvedAt: null,
    notes: [
      { id: g('b101'), actor: 'system', text: 'Case opened automatically from OMS rejection.', occurredAt: '2026-08-18T10:35:00.000Z' },
      { id: g('b102'), actor: 'a.moradi', text: 'با کارگزار تماس گرفته شد؛ واحدها در وضعیت بلوکه است. در انتظار رفع.', occurredAt: '2026-08-18T13:10:00.000Z' },
    ],
  },
  {
    id: g('a102'), caseNumber: 'SPM-C-0004', status: 'Open', sourceType: 'Discrepancy', sourceId: g('8103'),
    title: 'واریز بانکی یافت نشد — تسویه معوق SPM-1405-0014',
    assignedTo: null, openedAt: '2026-08-21T02:10:00.000Z', dueAt: '2026-08-21T04:10:00.000Z', resolvedAt: null,
    notes: [{ id: g('b103'), actor: 'system', text: 'Opened from reconciliation run 2026-08-21.', occurredAt: '2026-08-21T02:10:00.000Z' }],
  },
  {
    id: g('a103'), caseNumber: 'SPM-C-0002', status: 'Resolved', sourceType: 'Discrepancy', sourceId: g('8105'),
    title: 'اختلاف مبلغ با OMS — SPM-1405-0001',
    assignedTo: 'm.kazemi', openedAt: '2026-08-19T02:10:00.000Z', dueAt: '2026-08-19T04:10:00.000Z', resolvedAt: '2026-08-19T11:30:00.000Z',
    notes: [
      { id: g('b104'), actor: 'm.kazemi', text: 'اختلاف ناشی از گرد کردن کارمزد بود.', occurredAt: '2026-08-19T10:30:00.000Z' },
      { id: g('b105'), actor: 'f.sadeghi', text: 'اصلاح دستی تایید و اعمال شد.', occurredAt: '2026-08-19T11:30:00.000Z' },
    ],
  },
  {
    id: g('a104'), caseNumber: 'SPM-C-0005', status: 'Waiting', sourceType: 'Request', sourceId: g('2014'),
    title: 'سفارش فروش جزئی — مانده پرنشده پس از مهلت',
    assignedTo: 'h.rahimi', openedAt: '2026-08-20T11:05:00.000Z', dueAt: '2026-08-20T13:05:00.000Z', resolvedAt: null,
    notes: [{ id: g('b106'), actor: 'h.rahimi', text: 'در انتظار پاسخ کارگزار درباره مانده سفارش.', occurredAt: '2026-08-20T12:00:00.000Z' }],
  },
];

/* ── audit ────────────────────────────────────────────────────────────────── */

export const MOCK_AUDIT: AuditEntry[] = [
  { id: g('c101'), entityName: 'InvestmentRequest', entityId: g('2011'), action: 'StatusChanged', actor: 'system', occurredAt: '2026-08-18T10:26:00.000Z', before: { status: 'OrderPlaced' }, after: { status: 'Failed' } },
  { id: g('c102'), entityName: 'ManualAdjustment', entityId: g('9001'), action: 'Approved', actor: 'f.sadeghi', occurredAt: '2026-08-19T11:30:00.000Z', before: { status: 'PendingSecond', secondApprover: null }, after: { status: 'Approved', secondApprover: 'f.sadeghi' } },
  { id: g('c103'), entityName: 'Instrument', entityId: g('0003'), action: 'Updated', actor: 'h.rahimi', occurredAt: '2026-07-31T09:00:00.000Z', before: { isActive: true, effectiveTo: null }, after: { isActive: false, effectiveTo: '2026-07-31T00:00:00.000Z' } },
  { id: g('c104'), entityName: 'InvestorAccount', entityId: g('1005'), action: 'Updated', actor: 'm.kazemi', occurredAt: '2026-08-15T08:20:00.000Z', before: { isActive: true, iban: 'IR900120000000111222333044' }, after: { isActive: false, iban: null } },
  { id: g('c105'), entityName: 'InvestmentRequest', entityId: g('2012'), action: 'Rejected', actor: 'h.rahimi', occurredAt: '2026-08-16T11:20:00.000Z', before: { status: 'Submitted' }, after: { status: 'Rejected', reason: 'مبلغ کمتر از حداقل ابزار' } },
  { id: g('c106'), entityName: 'InstrumentRule', entityId: g('0002'), action: 'Updated', actor: 'h.rahimi', occurredAt: '2026-08-05T07:45:00.000Z', before: { minAmount: 1_000_000, settlementDays: 1 }, after: { minAmount: 5_000_000, settlementDays: 2 } },
  { id: g('c107'), entityName: 'ResolutionCase', entityId: g('a101'), action: 'Created', actor: 'system', occurredAt: '2026-08-18T10:35:00.000Z', before: null, after: { caseNumber: 'SPM-C-0003', status: 'Open' } },
];

/* ── external service health ──────────────────────────────────────────────── */

export const MOCK_HEALTH: ExternalServiceHealth[] = [
  { service: 'Oms', state: 'Manual', lastCheckedAt: '2026-08-21T05:00:00.000Z', latencyMs: null, successRate24h: null, note: 'No OMS adapter configured — orders are recorded by an operator.' },
  { service: 'PaymentGateway', state: 'Manual', lastCheckedAt: '2026-08-21T05:00:00.000Z', latencyMs: null, successRate24h: null, note: 'No PSP selected yet (client prerequisite) — payments entered manually.' },
  { service: 'Bank', state: 'Manual', lastCheckedAt: '2026-08-21T05:00:00.000Z', latencyMs: null, successRate24h: null, note: 'Settlement transfers confirmed from an uploaded bank statement.' },
  { service: 'Sms', state: 'Manual', lastCheckedAt: '2026-08-21T05:00:00.000Z', latencyMs: null, successRate24h: null, note: 'No notification service exists in the platform yet.' },
  { service: 'Email', state: 'Manual', lastCheckedAt: '2026-08-21T05:00:00.000Z', latencyMs: null, successRate24h: null, note: 'No notification service exists in the platform yet.' },
];

/* ── holdings — the per-fund breakdown behind an account's portfolio total ─── */

/**
 * Kept consistent with `MOCK_ACCOUNTS.totalUnits` and `.balance`: the rows for
 * one account sum to that account's totals, so the portal and the console can
 * never disagree about what an investor owns.
 */
export const MOCK_HOLDINGS: Holding[] = [
  // علی رضایی — 24,500 units / 256,025,000 rials
  { investorAccountId: g('1001'), instrumentId: g('0001'), units: 14_500, value: 151_525_000, navIssue: 10_512, navRedeem: 10_450, asOf: MOCK_TODAY },
  { investorAccountId: g('1001'), instrumentId: g('0004'), units: 3_000, value: 85_920_000, navIssue: 28_812, navRedeem: 28_640, asOf: MOCK_TODAY },
  { investorAccountId: g('1001'), instrumentId: g('0005'), units: 7_000, value: 18_580_000, navIssue: 41_568, navRedeem: 41_320, asOf: MOCK_TODAY },

  // مریم کاظمی — 61,200 units / 745,416,000 rials
  { investorAccountId: g('1002'), instrumentId: g('0002'), units: 41_050, value: 499_989_000, navIssue: 12_253, navRedeem: 12_180, asOf: MOCK_TODAY },
  { investorAccountId: g('1002'), instrumentId: g('0001'), units: 12_150, value: 126_967_500, navIssue: 10_512, navRedeem: 10_450, asOf: MOCK_TODAY },
  { investorAccountId: g('1002'), instrumentId: g('0005'), units: 8_000, value: 118_459_500, navIssue: 41_568, navRedeem: 41_320, asOf: MOCK_TODAY },

  // زهرا احمدی — 8,000 units / 83,600,000 rials
  { investorAccountId: g('1004'), instrumentId: g('0001'), units: 8_000, value: 83_600_000, navIssue: 10_512, navRedeem: 10_450, asOf: MOCK_TODAY },

  // رضا نوری — 1,500 units / 15,675,000 rials
  { investorAccountId: g('1005'), instrumentId: g('0001'), units: 1_500, value: 15_675_000, navIssue: 10_512, navRedeem: 10_450, asOf: MOCK_TODAY },

  // حسین مرادی holds nothing — the empty-portfolio case must be renderable.
];

/* ── profit distributions — تقسیم سود ─────────────────────────────────────── */

export const MOCK_PROFIT_DISTRIBUTIONS: ProfitDistribution[] = [
  { id: g('d001'), investorAccountId: g('1001'), instrumentId: g('0001'), amount: 1_812_500, distributedAt: '2026-07-31T00:00:00.000Z' },
  { id: g('d002'), investorAccountId: g('1001'), instrumentId: g('0001'), amount: 1_740_000, distributedAt: '2026-06-30T00:00:00.000Z' },
  { id: g('d003'), investorAccountId: g('1002'), instrumentId: g('0002'), amount: 6_157_500, distributedAt: '2026-07-31T00:00:00.000Z' },
  { id: g('d004'), investorAccountId: g('1002'), instrumentId: g('0001'), amount: 1_518_750, distributedAt: '2026-07-31T00:00:00.000Z' },
  { id: g('d005'), investorAccountId: g('1004'), instrumentId: g('0001'), amount: 1_000_000, distributedAt: '2026-07-31T00:00:00.000Z' },
];
