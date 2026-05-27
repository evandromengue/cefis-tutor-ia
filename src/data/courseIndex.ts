export type LearningContentItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  duration: string;
  courseTitle: string;
  lessonTitle: string;
  videoUrl?: string;
};

export type LearningContentResult = LearningContentItem & {
  score: number;
  matchedTerms: string[];
};

type SearchOptions = {
  preferVideo?: boolean;
};

export const courseIndex: LearningContentItem[] = [
  {
    id: "tributario-planejamento-essencial",
    title: "Planejamento Tributario Essencial",
    description:
      "Como organizar carga fiscal, escolher caminhos seguros e conectar estrategia tributaria com a rotina da empresa.",
    category: "Tributario",
    tags: [
      "planejamento tributario",
      "gestao tributaria",
      "elisao fiscal",
      "regimes tributarios",
      "lucro real",
      "lucro presumido",
      "holdings",
    ],
    duration: "18 min",
    courseTitle: "Gestao Tributaria para Empresas",
    lessonTitle: "Planejamento tributario: caminhos seguros",
  },
  {
    id: "tributario-regimes-comparativo",
    title: "Regimes Tributarios na Pratica",
    description:
      "Comparacao aplicada entre Simples Nacional, Lucro Presumido e Lucro Real para apoiar decisoes de enquadramento.",
    category: "Tributario",
    tags: [
      "regimes tributarios",
      "simples nacional",
      "lucro real",
      "lucro presumido",
      "gestao tributaria",
      "planejamento tributario",
    ],
    duration: "22 min",
    courseTitle: "Planejamento Tributario",
    lessonTitle: "Lucro Real, Presumido e Simples: quando usar cada um",
  },
  {
    id: "tributario-holdings",
    title: "Holdings e Estrutura Tributaria",
    description:
      "Visao introdutoria sobre holdings, sucessao patrimonial e organizacao tributaria com seguranca juridica.",
    category: "Tributario",
    tags: [
      "holdings",
      "planejamento tributario",
      "gestao tributaria",
      "elisao fiscal",
      "patrimonial",
    ],
    duration: "16 min",
    courseTitle: "Gestao Tributaria para Empresas",
    lessonTitle: "Holdings: fundamentos para decisao tributaria",
  },
  {
    id: "contabil-demonstracoes",
    title: "Demonstracoes Contabeis para Gestao",
    description:
      "Leitura objetiva de balanco, DRE e fluxo de caixa para transformar contabilidade em decisao.",
    category: "Contabil",
    tags: [
      "contabilidade",
      "demonstracoes contabeis",
      "balanco",
      "DRE",
      "fluxo de caixa",
      "gestao",
    ],
    duration: "20 min",
    courseTitle: "Contabilidade para Gestao",
    lessonTitle: "Balanco e DRE sem complicacao",
  },
  {
    id: "icms-apuracao",
    title: "ICMS e Apuracao Fiscal",
    description:
      "Fundamentos de ICMS, imposto estadual, creditos, debitos e pontos de atencao na apuracao.",
    category: "Fiscal",
    tags: [
      "ICMS",
      "imposto estadual",
      "apuracao",
      "substituicao tributaria",
      "rotinas fiscais",
    ],
    duration: "15 min",
    courseTitle: "Introducao ao ICMS",
    lessonTitle: "Apuracao de ICMS: base para comecar",
  },
  {
    id: "icms-substituicao",
    title: "Substituicao Tributaria no ICMS",
    description:
      "Quando a substituicao tributaria aparece na rotina fiscal e como interpretar o impacto na operacao.",
    category: "Fiscal",
    tags: [
      "ICMS",
      "substituicao tributaria",
      "imposto estadual",
      "rotinas fiscais",
      "SPED",
    ],
    duration: "17 min",
    courseTitle: "ICMS na Pratica",
    lessonTitle: "Substituicao tributaria: leitura pratica",
  },
  {
    id: "fiscal-rotinas-obrigacoes",
    title: "Rotinas Fiscais Essenciais",
    description:
      "Organizacao de prazos, documentos, obrigacoes acessorias e rotina fiscal para reduzir retrabalho.",
    category: "Fiscal",
    tags: ["rotinas fiscais", "obrigacoes acessorias", "SPED", "ICMS"],
    duration: "19 min",
    courseTitle: "Rotinas Fiscais Essenciais",
    lessonTitle: "Checklist da rotina fiscal",
  },
  {
    id: "sped-fiscal-base",
    title: "SPED Fiscal Rapido",
    description:
      "Visao essencial do SPED Fiscal, registros, validacao e conexao com apuracao de impostos.",
    category: "Fiscal",
    tags: ["SPED", "rotinas fiscais", "ICMS", "apuracao"],
    duration: "14 min",
    courseTitle: "SPED Fiscal Essencial",
    lessonTitle: "SPED Fiscal: estrutura e primeiros cuidados",
  },
];

const synonymGroups: Record<string, string[]> = {
  "planejamento tributario": [
    "regimes tributarios",
    "gestao tributaria",
    "elisao fiscal",
    "holdings",
    "lucro real",
    "lucro presumido",
  ],
  contabilidade: [
    "demonstracoes contabeis",
    "balanco",
    "DRE",
    "fluxo de caixa",
  ],
  icms: ["imposto estadual", "substituicao tributaria", "apuracao"],
};

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueTerms(terms: string[]) {
  return Array.from(new Set(terms.filter(Boolean)));
}

function expandQueryTerms(query: string) {
  const normalizedQuery = normalizeSearchText(query);
  const tokens = normalizedQuery
    .split(" ")
    .filter((token) => token.length > 2);
  const expanded = new Set([normalizedQuery, ...tokens]);

  for (const [baseTerm, synonyms] of Object.entries(synonymGroups)) {
    const normalizedBase = normalizeSearchText(baseTerm);
    const normalizedSynonyms = synonyms.map(normalizeSearchText);
    const queryMatchesGroup =
      normalizedQuery.includes(normalizedBase) ||
      normalizedSynonyms.some((term) => normalizedQuery.includes(term));

    if (queryMatchesGroup) {
      expanded.add(normalizedBase);
      normalizedSynonyms.forEach((term) => expanded.add(term));
    }
  }

  return uniqueTerms(Array.from(expanded));
}

function getItemScore(item: LearningContentItem, query: string) {
  const normalizedQuery = normalizeSearchText(query);
  const terms = expandQueryTerms(query);
  const title = normalizeSearchText(
    `${item.title} ${item.courseTitle} ${item.lessonTitle}`,
  );
  const description = normalizeSearchText(item.description);
  const category = normalizeSearchText(item.category);
  const tags = item.tags.map(normalizeSearchText);
  const allText = normalizeSearchText(
    `${title} ${description} ${category} ${tags.join(" ")}`,
  );
  const matchedTerms = new Set<string>();
  let score = 0;

  if (
    normalizedQuery &&
    (title.includes(normalizedQuery) || category.includes(normalizedQuery))
  ) {
    score += 5;
    matchedTerms.add(normalizedQuery);
  }

  for (const term of terms) {
    if (!term) {
      continue;
    }

    if (tags.some((tag) => tag.includes(term) || term.includes(tag))) {
      score += 4;
      matchedTerms.add(term);
    }

    if (description.includes(term)) {
      score += 2;
      matchedTerms.add(term);
    }

    if (term !== normalizedQuery && allText.includes(term)) {
      score += 3;
      matchedTerms.add(term);
    }
  }

  return {
    score,
    matchedTerms: Array.from(matchedTerms),
  };
}

export function searchLearningContent(
  query: string,
  options: SearchOptions = {},
): LearningContentResult[] {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return [];
  }

  return courseIndex
    .map((item) => {
      const { score, matchedTerms } = getItemScore(item, normalizedQuery);

      return {
        ...item,
        score: score + (options.preferVideo && item.videoUrl ? 2 : 0),
        matchedTerms,
      };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (options.preferVideo && Boolean(left.videoUrl) !== Boolean(right.videoUrl)) {
        return left.videoUrl ? -1 : 1;
      }

      return right.score - left.score;
    })
    .slice(0, 3);
}
