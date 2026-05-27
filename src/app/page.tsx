"use client";

import {
  type FormEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import {
  searchLearningContent,
  type LearningContentResult,
} from "@/src/data/courseIndex";

type ConversationStep =
  | "topic"
  | "name"
  | "email"
  | "time"
  | "logged"
  | "complete";

type PanelMode =
  | "initial"
  | "guided"
  | "topic"
  | "name"
  | "email"
  | "logged"
  | "complete";

type UserEnergy = "normal" | "low";

type TutorDecisionMode = "quick" | "light" | "normal";

type JourneyStepState = "inactive" | "active" | "complete";

type ExpectedInput = "topic" | "name" | "email" | "time" | "format" | "free_chat";

type LoggedAction = "continue" | "review" | "ask" | "today";

type PendingAction =
  | "continue_lesson"
  | "open_next_lesson"
  | "review_5min"
  | "answer_questions"
  | "build_today_plan";

type UserIntent =
  | "confirmation"
  | "new_topic_request"
  | "format_request"
  | "time_change"
  | "energy_change"
  | "question"
  | "open_next_lesson"
  | "open_current_lesson"
  | "play_video"
  | "change_topic"
  | "update_time"
  | "summarize_current_lesson";

type StudyFormat = "video" | "summary" | "exercise" | "audio";

type UserIntentDecision = {
  intent: UserIntent;
  topic?: string;
  format?: StudyFormat;
  shouldSearchCourses: boolean;
  shouldUpdatePlan: boolean;
  reply: string;
};

type ClassifiedIntentType =
  | "NEW_TOPIC"
  | "NEXT_LESSON"
  | "REVIEW"
  | "FREE_CHAT"
  | "SEARCH_VIDEO";

type ClassifiedIntent = {
  intent: ClassifiedIntentType;
  topic?: string;
  format?: StudyFormat;
};

type CtaVariant = "visitor" | "logged-free" | "premium";

type Message = {
  role: "user" | "tutor";
  text: string;
};

type StreamSource = {
  quality?: string;
  type?: string;
  link_secure?: string;
  height?: number;
};

type Course = {
  id: number | string;
  title: string;
  url?: string | null;
  link?: string | null;
  public_url?: string | null;
  permalink?: string | null;
  subtitle?: string | null;
  summary?: string | null;
  banner?: string | null;
  teacher?: {
    name?: string;
  } | null;
  duration?: number | string | null;
  lessonCount?: number | null;
  trailer?: {
    streamSources?: StreamSource[];
  } | null;
  semanticLessons?: Lesson[];
  source?: "api" | "mock";
};

type Lesson = {
  id: number | string;
  title: string;
  position?: number | null;
  duration?: number | null;
  stream_sources?: StreamSource[];
  streamSources?: StreamSource[];
  preview_url?: string | null;
  source?: "api" | "mock";
};

type TutorDecision = {
  mode: TutorDecisionMode;
  tutorMessage: string;
  recommendedCourseId: string;
  recommendedLessonId: string;
  planSteps: string[];
};

type TutorDecisionContext = {
  topic: string;
  availableTime: string;
  userEnergy: UserEnergy;
  selectedCourse: Course | null;
  selectedLesson: Lesson | null;
  adaptationText?: string;
};

type OnboardingState = {
  tema: string;
  nome: string;
  email: string;
  ritmo: string;
  cursoSelecionado: string;
  objetivo: string;
  aulaAtual?: string;
  progressoAtual?: string;
  planoAtivo?: string;
  ultimaRecomendacao?: string;
  ultimoFormato?: string;
};

type ChatApiResponse = {
  reply?: string;
  source?: "openai" | "fallback";
  missingApiKey?: boolean;
  apiError?: string;
};

type CefisUser = {
  id?: number | string | null;
  name?: string | null;
  email?: string | null;
  is_premium?: boolean | number | string | null;
  premium_plan_active?: boolean | number | string | null;
  is_demo_subscriber?: boolean | number | string | null;
};

type LoginApiResponse = {
  ok?: boolean;
  apiKey?: string;
  user?: CefisUser | null;
  error?: string;
};

type MeApiResponse = {
  user?: CefisUser | null;
  error?: string;
};

type JourneyStep = {
  label: string;
  state: JourneyStepState;
};

type LoggedStudentProgress = {
  name: string;
  courseTitle: string;
  lessonTitle: string;
  progressPercent: number;
  lastAccess: string;
  reviewHint: string;
  chosenTime: string;
  activePlan: string;
  lastRecommendation: string;
  lastFormat: string;
};

type LoggedLearningMemory = {
  currentLessonTitle: string;
  chosenTime: string;
  activePlan: string;
  lastRecommendation: string;
  lastFormat: string;
};

type TutorMemory = {
  name: string;
  email: string;
  cefisUserId?: string;
  preferredStudyTime: string;
  energyProfile: UserEnergy;
  mainGoal: string;
  lastTopic: string;
  lastCourseId: string;
  lastLessonId: string;
  chatSummary: string;
  lastTutorPlan: string;
  updatedAt: string;
};

const PURCHASE_URL = "https://cefis.com.br";
const PLANS_URL = "https://cefis.com.br";
const TUTOR_MEMORY_KEY_PREFIX = "cefis-tutor-ia:memory:";

const guidedTopicOptions = [
  {
    label: "Fiscal",
    topic: "Rotinas Fiscais",
    description: "Impostos, obrigações e rotina fiscal do dia a dia.",
  },
  {
    label: "Contábil",
    topic: "Contabilidade para Gestão",
    description: "Demonstrações, análise e visão contábil aplicada.",
  },
  {
    label: "Departamento Pessoal",
    topic: "Departamento Pessoal",
    description: "Folha, rotinas trabalhistas e gestão de pessoas.",
  },
  {
    label: "Tributário",
    topic: "Planejamento Tributário",
    description: "Regimes fiscais, estratégia e gestão tributária.",
  },
] as const;

const loggedStudentProgress: LoggedStudentProgress = {
  name: "Evandro",
  courseTitle: "Rotinas Fiscais Essenciais",
  lessonTitle: "Apuração e revisão guiada",
  progressPercent: 64,
  lastAccess: "ontem às 18:40",
  reviewHint: "Tenho uma revisão rápida para hoje.",
  chosenTime: "20 minutos",
  activePlan: "Continuidade em Rotinas Fiscais Essenciais",
  lastRecommendation: "revisar os pontos críticos da apuração fiscal",
  lastFormat: "resumo em 3 passos",
};

const initialLoggedMemory: LoggedLearningMemory = {
  currentLessonTitle: loggedStudentProgress.lessonTitle,
  chosenTime: loggedStudentProgress.chosenTime,
  activePlan: loggedStudentProgress.activePlan,
  lastRecommendation: loggedStudentProgress.lastRecommendation,
  lastFormat: loggedStudentProgress.lastFormat,
};

const loggedProgressCourse: Course = {
  id: "logged-current-course",
  title: loggedStudentProgress.courseTitle,
  subtitle: "Continue de onde parou",
  summary: "Plano baseado no progresso mockado do aluno logado.",
  duration: 1260,
  lessonCount: 8,
  teacher: { name: "CEFIS" },
  source: "mock",
};

const fallbackCourses: Course[] = [
  {
    id: "mock-icms-intro",
    title: "Introdução ao ICMS",
    subtitle: "Base fiscal para começar",
    summary: "Conceitos essenciais para entender incidência e apuração.",
    duration: 720,
    lessonCount: 3,
    teacher: { name: "CEFIS" },
    source: "mock",
  },
  {
    id: "mock-icms-pratica",
    title: "ICMS na Prática",
    subtitle: "Aplicação guiada",
    summary: "Casos rápidos para aplicar regras no dia a dia fiscal.",
    duration: 1080,
    lessonCount: 4,
    teacher: { name: "CEFIS" },
    source: "mock",
  },
  {
    id: "mock-rotinas",
    title: "Rotinas Fiscais Essenciais",
    subtitle: "Primeiros passos",
    summary: "Obrigações, prazos e visão prática da rotina fiscal.",
    duration: 1320,
    lessonCount: 5,
    teacher: { name: "CEFIS" },
    source: "mock",
  },
];

const fallbackLessons: Lesson[] = [
  {
    id: "mock-lesson-1",
    title: "Aula curta recomendada",
    position: 1,
    duration: 420,
    stream_sources: [],
    source: "mock",
  },
];

const initialTutorMessage = "O que você quer aprender agora?";

const initialMessages: Message[] = [
  {
    role: "tutor",
    text: initialTutorMessage,
  },
];

const initialOnboarding: OnboardingState = {
  tema: "",
  nome: "",
  email: "",
  ritmo: "",
  cursoSelecionado: "",
  objetivo: "",
};

function sleep(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getMemoryKey(email: string) {
  return `${TUTOR_MEMORY_KEY_PREFIX}${encodeURIComponent(
    email.trim().toLowerCase(),
  )}`;
}

function canUseTutorMemoryStorage() {
  try {
    return typeof window !== "undefined" && "localStorage" in window;
  } catch {
    return false;
  }
}

function readTutorMemoryByEmail(email: string) {
  if (!email.trim() || !canUseTutorMemoryStorage()) {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(getMemoryKey(email));
    return stored ? (JSON.parse(stored) as TutorMemory) : null;
  } catch {
    return null;
  }
}

function writeTutorMemory(memory: TutorMemory) {
  if (!memory.email.trim() || !canUseTutorMemoryStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(
      getMemoryKey(memory.email),
      JSON.stringify(memory),
    );
  } catch {
    // Storage may be unavailable in private/restricted browser contexts.
  }
}

function createTutorMemory(
  memory: Partial<TutorMemory> & Pick<TutorMemory, "email">,
): TutorMemory {
  return {
    name: memory.name ?? "",
    email: memory.email,
    cefisUserId: memory.cefisUserId,
    preferredStudyTime: memory.preferredStudyTime ?? "20 minutos",
    energyProfile: memory.energyProfile ?? "normal",
    mainGoal: memory.mainGoal ?? "",
    lastTopic: memory.lastTopic ?? "",
    lastCourseId: memory.lastCourseId ?? "",
    lastLessonId: memory.lastLessonId ?? "",
    chatSummary: memory.chatSummary ?? "Memória inicial criada pelo Tutor IA.",
    lastTutorPlan: memory.lastTutorPlan ?? "resumos diretos",
    updatedAt: memory.updatedAt ?? new Date().toISOString(),
  };
}

function loadOrCreateTutorMemory(
  memory: Partial<TutorMemory> & Pick<TutorMemory, "email">,
) {
  const existingMemory = readTutorMemoryByEmail(memory.email);
  const nextMemory: TutorMemory = existingMemory
    ? {
        ...existingMemory,
        name: memory.name || existingMemory.name,
        cefisUserId: memory.cefisUserId || existingMemory.cefisUserId,
        updatedAt: new Date().toISOString(),
      }
    : createTutorMemory(memory);

  writeTutorMemory(nextMemory);
  return nextMemory;
}

function detectPreferredStudyTime(value: string) {
  const normalized = normalizeText(value);

  if (normalized.includes("meia hora")) {
    return "30 minutos";
  }

  const explicitHours = normalized.match(/(\d{1,2})\s*(h|hora|horas)/);

  if (explicitHours?.[1]) {
    return `${Number(explicitHours[1]) * 60} minutos`;
  }

  const explicitMinutes = normalized.match(
    /(\d{1,3})\s*(min|mins|minuto|minutos)/,
  );

  if (explicitMinutes?.[1]) {
    return `${explicitMinutes[1]} minutos`;
  }

  const dailyMinutes = normalized.match(/\b(10|15|20|30|45|60)\b/);

  return dailyMinutes?.[1] ? `${dailyMinutes[1]} minutos` : undefined;
}

function detectStudyFormatPreference(value: string) {
  const normalized = normalizeText(value);

  if (normalized.includes("resumo")) {
    return "resumos diretos";
  }

  if (normalized.includes("video") || normalized.includes("vídeo")) {
    return "vídeos curtos";
  }

  if (normalized.includes("audio") || normalized.includes("ouvir")) {
    return "áudios e explicações leves";
  }

  if (normalized.includes("pratic")) {
    return "exemplos práticos";
  }

  if (normalized.includes("exercicio") || normalized.includes("questao")) {
    return "exercícios guiados";
  }

  return undefined;
}

function getMemoryFormatLabel(memory: TutorMemory | null) {
  const plan = normalizeText(memory?.lastTutorPlan ?? "");

  if (plan.includes("video")) {
    return "vídeos curtos";
  }

  if (plan.includes("audio") || plan.includes("ouvir")) {
    return "áudios e explicações leves";
  }

  if (plan.includes("pratic")) {
    return "exemplos práticos";
  }

  if (plan.includes("resumo") || plan.includes("revis")) {
    return "resumos diretos";
  }

  return "orientação guiada";
}

function getStudyFormat(value: string): StudyFormat | undefined {
  const normalized = normalizeText(value);

  if (normalized.includes("video") || normalized.includes("vídeo")) {
    return "video";
  }

  if (normalized.includes("audio") || normalized.includes("ouvir")) {
    return "audio";
  }

  if (
    normalized.includes("exercicio") ||
    normalized.includes("questao") ||
    normalized.includes("questões")
  ) {
    return "exercise";
  }

  if (
    normalized.includes("resumo") ||
    normalized.includes("exemplo pratico") ||
    normalized.includes("pratic")
  ) {
    return normalized.includes("resumo") ? "summary" : "exercise";
  }

  return undefined;
}

function buildMemoryBasedLoggedPrompt(name: string, memory: TutorMemory) {
  return `${name}, você costuma estudar por ${memory.preferredStudyTime} e prefere ${getMemoryFormatLabel(
    memory,
  )}. Quer continuar nesse formato hoje?`;
}

function stripTopicNoise(value: string) {
  return value
    .replace(
      /^(quero|queria|gostaria de|me mostra|mostra|preciso|pode me mostrar|vamos)\s+/i,
      "",
    )
    .replace(/^(um|uma|algum|algo)\s+/i, "")
    .replace(/^(vídeo|video|resumo|áudio|audio|exercício|exercicio|exemplo prático|exemplo pratico)\s+/i, "")
    .replace(/^(sobre|de|do|da|para|pra)\s+/i, "")
    .trim();
}

function extractRequestedTopic(value: string) {
  const normalized = normalizeText(value);
  const original = value.trim();
  const patterns = [
    /(?:sobre|de|do|da)\s+(.+)$/i,
    /(?:quero aprender|quero estudar|estudar|aprender)\s+(.+)$/i,
    /(?:me mostra algo sobre|mostra algo sobre)\s+(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = original.match(pattern);

    if (match?.[1]) {
      return stripTopicNoise(match[1]).replace(/[?.!]+$/g, "");
    }
  }

  if (
    normalized.includes("quero") ||
    normalized.includes("mostra") ||
    normalized.includes("estudar") ||
    normalized.includes("aprender")
  ) {
    const cleaned = stripTopicNoise(original).replace(/[?.!]+$/g, "");
    return cleaned || undefined;
  }

  return undefined;
}

function classifyIntent(message: string): ClassifiedIntent {
  const normalized = normalizeText(message)
    .replace(/[?.!,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const format = getStudyFormat(message);
  const topic = extractRequestedTopic(message);
  const words = normalized.split(/\s+/).filter(Boolean);
  const nextLessonSignals = [
    "ja assisti",
    "ja vi",
    "terminei",
    "conclui",
    "qual o proximo",
    "qual e o proximo",
    "proxima aula",
    "proximo conteudo",
    "continuar",
    "avance",
    "avancar",
    "abrir proxima",
    "abra a proxima",
    "seguir trilha",
  ];
  const reviewSignals = [
    "revisar",
    "revisao",
    "resumo",
    "resumir",
    "explicar",
    "explique",
    "nao entendi",
  ];
  const explicitTopicSignals = [
    "quero estudar",
    "quero aprender",
    "me mostra",
    "mostra",
    "preciso estudar",
    "gostaria de estudar",
  ];
  const plainTopicSignals = [
    "planejamento tributario",
    "regimes tributarios",
    "gestao tributaria",
    "lucro real",
    "lucro presumido",
    "simples nacional",
    "holdings",
    "contabilidade",
    "icms",
    "rotinas fiscais",
  ];
  const hasNextLessonIntent = nextLessonSignals.some((signal) =>
    normalized.includes(signal),
  );

  if (hasNextLessonIntent) {
    return { intent: "NEXT_LESSON" };
  }

  if (
    (normalized.includes("video") || normalized.includes("vídeo")) &&
    (topic || normalized.includes("sobre") || normalized.includes(" de "))
  ) {
    return {
      intent: "SEARCH_VIDEO",
      topic: topic ?? stripTopicNoise(message).replace(/[?.!]+$/g, ""),
      format: "video",
    };
  }

  if (reviewSignals.some((signal) => normalized.includes(signal))) {
    return {
      intent: "REVIEW",
      format: "summary",
    };
  }

  if (
    topic &&
    explicitTopicSignals.some((signal) => normalized.includes(signal))
  ) {
    return {
      intent: "NEW_TOPIC",
      topic,
      format,
    };
  }

  if (
    words.length <= 4 &&
    plainTopicSignals.some((signal) => normalized.includes(signal))
  ) {
    return {
      intent: "NEW_TOPIC",
      topic: stripTopicNoise(message).replace(/[?.!]+$/g, ""),
      format,
    };
  }

  return { intent: "FREE_CHAT", format };
}

function detectUserIntent(message: string): UserIntentDecision {
  const classifiedIntent = classifyIntent(message);
  const normalized = normalizeText(message);
  const format = getStudyFormat(message);
  const extractedTopic = extractRequestedTopic(message);
  const possiblePlainTopic = stripTopicNoise(message).replace(/[?.!]+$/g, "");
  const topic =
    extractedTopic ??
    (possiblePlainTopic &&
    possiblePlainTopic.length > 2 &&
    !isAffirmativeResponse(possiblePlainTopic)
      ? possiblePlainTopic
      : undefined);
  const hasTimeChange = Boolean(detectPreferredStudyTime(message));
  const hasEnergyChange = detectEnergy(message) === "low";
  const hasOpenNextLessonSignal =
    normalized.includes("abra a proxima aula") ||
    normalized.includes("abrir proxima aula") ||
    normalized.includes("proxima aula") ||
    normalized.includes("pode abrir") ||
    normalized.includes("entao abra") ||
    normalized.includes("vamos para a proxima") ||
    normalized.includes("essa eu ja terminei") ||
    normalized.includes("ja terminei essa");
  const hasOpenCurrentLessonSignal =
    normalized.includes("abra a aula atual") ||
    normalized.includes("abrir aula atual") ||
    normalized.includes("voltar para aula atual");
  const hasPlayVideoSignal =
    normalized.includes("dar play") ||
    normalized.includes("tocar video") ||
    normalized.includes("rodar video") ||
    normalized.includes("reproduzir video");
  const hasSummarySignal =
    normalized.includes("resuma essa aula") ||
    normalized.includes("resumir aula") ||
    normalized.includes("resumo da aula");
  const hasNewTopicSignal =
    Boolean(topic) &&
    (normalized.includes("quero aprender") ||
      normalized.includes("quero estudar") ||
      normalized.includes("me mostra") ||
      normalized.includes("mostra algo") ||
      normalized.includes("sobre"));
  const hasQuestionSignal =
    /^(o que e|o que é|como funciona|como faco|como faço|nao entendi|não entendi|por que|qual )/.test(
      normalized,
    ) || normalized.endsWith("?");

  if (classifiedIntent.intent === "NEXT_LESSON") {
    return {
      intent: "open_next_lesson",
      shouldSearchCourses: false,
      shouldUpdatePlan: true,
      reply: "Vou abrir a proxima aula recomendada.",
    };
  }

  if (classifiedIntent.intent === "SEARCH_VIDEO" && classifiedIntent.topic) {
    return {
      intent: "format_request",
      topic: classifiedIntent.topic,
      format: "video",
      shouldSearchCourses: true,
      shouldUpdatePlan: true,
      reply: `Vou procurar um video relacionado a ${classifiedIntent.topic}.`,
    };
  }

  if (classifiedIntent.intent === "NEW_TOPIC" && classifiedIntent.topic) {
    return {
      intent: "new_topic_request",
      topic: classifiedIntent.topic,
      format: classifiedIntent.format,
      shouldSearchCourses: true,
      shouldUpdatePlan: true,
      reply: `Encontrei um novo foco: ${classifiedIntent.topic}. Vou procurar conteudos relacionados.`,
    };
  }

  if (classifiedIntent.intent === "REVIEW") {
    return {
      intent: "summarize_current_lesson",
      format: "summary",
      shouldSearchCourses: false,
      shouldUpdatePlan: true,
      reply: "Vou gerar uma revisao contextual da aula atual.",
    };
  }

  if (hasOpenNextLessonSignal) {
    return {
      intent: "open_next_lesson",
      shouldSearchCourses: false,
      shouldUpdatePlan: true,
      reply: "Vou abrir a próxima aula.",
    };
  }

  if (hasOpenCurrentLessonSignal) {
    return {
      intent: "open_current_lesson",
      shouldSearchCourses: false,
      shouldUpdatePlan: true,
      reply: "Vou manter a aula atual em foco.",
    };
  }

  if (hasPlayVideoSignal) {
    return {
      intent: "play_video",
      format: "video",
      shouldSearchCourses: false,
      shouldUpdatePlan: true,
      reply: "Vou priorizar o vídeo da aula em foco.",
    };
  }

  if (hasSummarySignal) {
    return {
      intent: "summarize_current_lesson",
      format: "summary",
      shouldSearchCourses: false,
      shouldUpdatePlan: true,
      reply: "Vou resumir a aula atual.",
    };
  }

  if (hasNewTopicSignal && topic) {
    return {
      intent: format ? "format_request" : "new_topic_request",
      topic,
      format,
      shouldSearchCourses: true,
      shouldUpdatePlan: true,
      reply: `Encontrei um novo foco: ${topic}. Vou procurar conteúdos relacionados.`,
    };
  }

  if (format) {
    return {
      intent: "format_request",
      format,
      shouldSearchCourses: false,
      shouldUpdatePlan: true,
      reply: "Vou adaptar o formato do plano para o que você pediu.",
    };
  }

  if (hasTimeChange) {
    return {
      intent: "update_time",
      shouldSearchCourses: false,
      shouldUpdatePlan: true,
      reply: "Atualizei seu tempo de estudo e vou recalibrar o plano.",
    };
  }

  if (hasEnergyChange) {
    return {
      intent: "energy_change",
      shouldSearchCourses: false,
      shouldUpdatePlan: true,
      reply: "Entendi. Vou deixar o plano mais leve para este momento.",
    };
  }

  if (
    topic &&
    !hasQuestionSignal &&
    normalized.split(/\s+/).filter(Boolean).length <= 6
  ) {
    return {
      intent: "change_topic",
      topic,
      format,
      shouldSearchCourses: true,
      shouldUpdatePlan: true,
      reply: `Vou trocar o foco para ${topic}.`,
    };
  }

  if (hasQuestionSignal) {
    return {
      intent: "question",
      shouldSearchCourses: false,
      shouldUpdatePlan: false,
      reply: "Vou responder usando o contexto da aula atual.",
    };
  }

  return {
    intent: isAffirmativeResponse(message) ? "confirmation" : "question",
    shouldSearchCourses: false,
    shouldUpdatePlan: false,
    reply: "Vou usar o contexto atual para continuar.",
  };
}

function detectEnergy(value: string): UserEnergy {
  const normalized = normalizeText(value);
  const lowEnergySignals = [
    "cansad",
    "exaust",
    "sem energia",
    "hoje nao quero ler",
    "nao quero ler",
    "quero so ouvir",
    "so ouvir",
    "algo leve",
    "sem leitura",
  ];

  return lowEnergySignals.some((signal) => normalized.includes(signal))
    ? "low"
    : "normal";
}

function detectValidStudyTime(value: string) {
  const normalized = normalizeText(value);

  if (normalized.includes("meia hora")) {
    return "30 minutos";
  }

  if (
    normalized.includes("pouco tempo") ||
    normalized.includes("sem tempo") ||
    normalized.includes("corrid")
  ) {
    return "10 minutos";
  }

  const explicitHours = normalized.match(/(\d{1,2})\s*(h|hora|horas)/);

  if (explicitHours?.[1]) {
    return `${Number(explicitHours[1]) * 60} minutos`;
  }

  const explicitMinutes = normalized.match(
    /(\d{1,3})\s*(min|mins|minuto|minutos)/,
  );

  if (explicitMinutes?.[1]) {
    return `${explicitMinutes[1]} minutos`;
  }

  const commonMinutes = normalized.match(/\b(5|10|15|20|30|45|60)\b/);

  if (commonMinutes?.[1]) {
    return `${commonMinutes[1]} minutos`;
  }

  return undefined;
}

function detectTime(value: string) {
  const validTime = detectValidStudyTime(value);

  if (validTime) {
    return validTime;
  }

  return value.trim();
}

function isUnknownInput(value: string) {
  const normalized = normalizeText(value);

  return (
    normalized === "nao sei" ||
    normalized.includes("nao sei") ||
    normalized.includes("nao tenho certeza") ||
    normalized.includes("estou perdido") ||
    normalized.includes("estou perdida")
  );
}

function looksLikeName(value: string) {
  const normalized = normalizeText(value)
    .replace(/[?.!,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const invalidNameSignals = [
    "nao sei",
    "quero estudar",
    "preciso estudar",
    "me ajuda",
    "nao sei o que pesquisar",
    "so quero estudar",
    "qualquer coisa",
    "sugira",
    "pesquisar",
  ];
  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (
    invalidNameSignals.some((signal) => normalized.includes(signal)) ||
    value.includes("@") ||
    /\d/.test(value) ||
    words.length < 1 ||
    words.length > 3
  ) {
    return false;
  }

  return words.every((word) => /^[A-Za-zÀ-ÖØ-öø-ÿ'-]{2,}$/.test(word));
}

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function wantsLessTime(value: string) {
  const normalized = normalizeText(value);

  return (
    normalized.includes("menos tempo") ||
    normalized.includes("mais rapido") ||
    normalized.includes("rapido demais")
  );
}

function isGenericSuggestionRequest(value: string) {
  const normalized = normalizeText(value)
    .replace(/[?.!,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const exactGenericRequests = [
    "quero estudar",
    "so quero estudar",
    "só quero estudar",
    "quero aprender",
  ];
  const genericRequests = [
    "sugira alguma coisa",
    "me sugira algo",
    "nao sei",
    "estou perdido",
    "estou perdida",
    "quero uma sugestao",
    "pode sugerir",
    "me ajuda a escolher",
    "nao tenho certeza",
    "qualquer coisa",
    "o que voce recomenda",
  ];

  return (
    exactGenericRequests.includes(normalized) ||
    genericRequests.some(
      (request) => normalized === request || normalized.includes(request),
    )
  );
}

function isAffirmativeResponse(value: string) {
  const normalized = normalizeText(value).trim();

  if (!normalized || /^(nao|nem|nunca)\b/.test(normalized)) {
    return false;
  }

  const affirmativeSignals = [
    "sim",
    "pode",
    "pode sim",
    "claro",
    "vamos",
    "seguir",
    "continuar",
    "ok",
    "quero",
  ];

  return affirmativeSignals.some((signal) =>
    new RegExp(`(^|\\b)${signal}(\\b|$)`).test(normalized),
  );
}

function getPendingActionForLoggedAction(action: LoggedAction): PendingAction {
  const actions: Record<LoggedAction, PendingAction> = {
    continue: "open_next_lesson",
    review: "review_5min",
    ask: "answer_questions",
    today: "build_today_plan",
  };

  return actions[action];
}

function getTheme(topic: string) {
  const cleanTopic = topic.trim();
  const normalized = normalizeText(cleanTopic);

  if (normalized.includes("icms")) {
    return "ICMS";
  }

  if (normalized.includes("sped")) {
    return "SPED Fiscal";
  }

  if (
    normalized.includes("departamento pessoal") ||
    normalized.includes("folha") ||
    normalized.includes("dp")
  ) {
    return "Departamento Pessoal";
  }

  return cleanTopic.replace(/^quero aprender\s+/i, "") || "seu tema";
}

function getStudyMinutes(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Math.max(1, Math.round(value / 60));
  }

  const normalized = normalizeText(String(value ?? ""));

  if (normalized.includes("meia hora")) {
    return 30;
  }

  const minutes = normalized.match(/\d+/)?.[0];
  return minutes ? Number(minutes) : 15;
}

function formatDuration(value: Course["duration"] | Lesson["duration"]) {
  if (typeof value === "number") {
    const minutes = Math.max(1, Math.round(value / 60));
    return `${minutes} min`;
  }

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return "duração aberta";
}

function getCourseDescription(course: Course) {
  return (
    course.summary ||
    course.subtitle ||
    "Conteúdo CEFIS selecionado para esse momento de estudo."
  );
}

function getStreamSources(lesson?: Lesson | null) {
  return lesson?.stream_sources ?? lesson?.streamSources ?? [];
}

function getVideoSource(lesson?: Lesson | null) {
  return [...getStreamSources(lesson)]
    .sort((a, b) => (a.height ?? 9999) - (b.height ?? 9999))
    .find((source) => source.link_secure)?.link_secure;
}

function createLessonFromLearningContent(result: LearningContentResult): Lesson {
  return {
    id: `semantic-lesson-${result.id}`,
    title: result.lessonTitle,
    duration: Number.parseInt(result.duration, 10) * 60 || null,
    position: 1,
    stream_sources: result.videoUrl
      ? [
          {
            quality: "preview",
            type: "video/mp4",
            link_secure: result.videoUrl,
          },
        ]
      : [],
    source: "mock",
  };
}

function createCourseFromLearningContent(result: LearningContentResult): Course {
  const semanticLesson = createLessonFromLearningContent(result);

  return {
    id: `semantic-course-${result.id}`,
    title: result.courseTitle,
    subtitle: result.title,
    summary: result.description,
    duration: result.duration,
    lessonCount: 1,
    teacher: { name: "CEFIS Tutor IA" },
    semanticLessons: [semanticLesson],
    source: "mock",
  };
}

function createCoursesFromLearningResults(results: LearningContentResult[]) {
  const seenCourses = new Set<string>();

  return results
    .filter((result) => {
      const key = normalizeText(result.courseTitle);

      if (seenCourses.has(key)) {
        return false;
      }

      seenCourses.add(key);
      return true;
    })
    .map(createCourseFromLearningContent);
}

function pickFocusedLesson(
  nextLessons: Lesson[],
  preferredFormat?: StudyFormat,
) {
  if (preferredFormat === "video") {
    return nextLessons.find((lesson) => getVideoSource(lesson)) ?? nextLessons[0];
  }

  return nextLessons[0];
}

function getCourseContinueUrl(course?: Course | null) {
  const directUrl = [
    course?.url,
    course?.link,
    course?.public_url,
    course?.permalink,
  ].find((value) => typeof value === "string" && value.startsWith("http"));

  return directUrl ?? PURCHASE_URL;
}

function flagIsActive(value: CefisUser[keyof CefisUser]) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function isPremiumUser(user: CefisUser | null) {
  if (!user) {
    return false;
  }

  return (
    flagIsActive(user.is_premium) ||
    flagIsActive(user.premium_plan_active) ||
    flagIsActive(user.is_demo_subscriber)
  );
}

function getUserName(user: CefisUser | null) {
  return user?.name?.trim() || "aluno CEFIS";
}

function getUserEmail(user: CefisUser | null) {
  return user?.email?.trim() || "aluno@cefis.com.br";
}

function buildLoggedMentorMessage({
  name,
  courseTitle,
  lessonTitle,
  progressPercent,
  time,
  recommendation,
  format,
}: {
  name: string;
  courseTitle: string;
  lessonTitle: string;
  progressPercent: number;
  time: string;
  recommendation: string;
  format: string;
}) {
  const firstLine = name
    ? `${name}, você já concluiu ${progressPercent}% da trilha.`
    : `Você já concluiu ${progressPercent}% da trilha.`;

  return [
    firstLine,
    `Você parou em ${lessonTitle}, dentro de ${courseTitle}.`,
    `Para ${time}, recomendo ${recommendation}. Posso conduzir agora em ${format}.`,
  ].join("\n");
}

function getRecommendedCourse(
  selectedCourse: Course | null,
  courseList: Course[],
) {
  return selectedCourse ?? courseList[0] ?? fallbackCourses[0];
}

function getRelatedCourses(courseList: Course[]) {
  return (courseList.length ? courseList : fallbackCourses).slice(0, 3);
}

function getTrail(topic: string) {
  const theme = getTheme(topic).toLowerCase();

  if (theme.includes("departamento")) {
    return "Primeiros Passos em Departamento Pessoal";
  }

  if (theme.includes("sped")) {
    return "Fiscal Digital Essencial";
  }

  return "Começando do Zero em Fiscal";
}

function getPlaceholder(step: ConversationStep) {
  const placeholders: Record<ConversationStep, string> = {
    topic: "Ex.: Quero aprender ICMS",
    name: "Digite seu nome",
    email: "seu@email.com",
    time: "Ex.: 15 minutos",
    logged: "Ex.: Quero revisar agora",
    complete: "Peça uma adaptação ou faça uma pergunta",
  };

  return placeholders[step];
}

function getModeLabel(mode: TutorDecisionMode) {
  const labels: Record<TutorDecisionMode, string> = {
    quick: "Modo rápido",
    light: "Modo leve",
    normal: "Modo completo",
  };

  return labels[mode];
}

function buildTutorDecision(context: TutorDecisionContext): TutorDecision {
  const normalizedAdaptation = normalizeText(context.adaptationText ?? "");
  const minutes = getStudyMinutes(context.availableTime);
  const theme = getTheme(context.topic);
  const recommendedCourse = context.selectedCourse ?? fallbackCourses[0];
  const selectedLesson = context.selectedLesson;
  const prefersPractice = normalizedAdaptation.includes("pratic");
  const prefersListening =
    normalizedAdaptation.includes("ouvir") ||
    normalizedAdaptation.includes("audio");
  const mode: TutorDecisionMode =
    context.userEnergy === "low" || prefersListening
      ? "light"
      : minutes <= 15
        ? "quick"
        : "normal";

  if (mode === "light") {
    return {
      mode,
      tutorMessage:
        "Entendi. Vou deixar tudo mais leve para hoje. Você pode aprender sem esforço pesado.",
      recommendedCourseId: String(recommendedCourse.id),
      recommendedLessonId: String(selectedLesson?.id ?? ""),
      planSteps: [
        "Assistir uma aula curta",
        "Ouvir resumo leve",
        "Deixar exercícios pesados para depois",
      ],
    };
  }

  if (prefersPractice) {
    return {
      mode,
      tutorMessage: `Perfeito. Vou deixar ${theme} mais prático, com caso guiado e menos teoria solta.`,
      recommendedCourseId: String(recommendedCourse.id),
      recommendedLessonId: String(selectedLesson?.id ?? ""),
      planSteps: [
        "Assistir trecho aplicado",
        "Resolver um caso guiado",
        "Revisar a resposta com o tutor",
      ],
    };
  }

  if (mode === "quick") {
    return {
      mode,
      tutorMessage:
        "Entendi. Vou montar uma experiência rápida para você começar agora.",
      recommendedCourseId: String(recommendedCourse.id),
      recommendedLessonId: String(selectedLesson?.id ?? ""),
      planSteps: [
        "Assistir aula curta",
        "Ler resumo objetivo",
        "Responder 3 perguntas",
      ],
    };
  }

  return {
    mode,
    tutorMessage:
      "Perfeito. Vou montar um caminho completo para você avançar com segurança.",
    recommendedCourseId: String(recommendedCourse.id),
    recommendedLessonId: String(selectedLesson?.id ?? ""),
    planSteps: [
      "Assistir aula recomendada",
      "Ler resumo guiado",
      "Responder 3 perguntas",
    ],
  };
}

async function fetchCoursesByTopic(topic: string): Promise<Course[]> {
  const response = await fetch(
    `/api/cefis/courses?search=${encodeURIComponent(topic)}&count=6`,
  );

  if (!response.ok) {
    throw new Error("Falha ao buscar cursos.");
  }

  const payload = (await response.json()) as { data?: Course[] };
  const apiCourses = Array.isArray(payload.data) ? payload.data : [];
  const coursesWithTitle = apiCourses.filter(
    (course) => typeof course.title === "string" && course.title.trim(),
  );

  return coursesWithTitle.map((course) => ({ ...course, source: "api" }));
}

async function fetchLessonsByCourse(courseId: Course["id"]): Promise<Lesson[]> {
  const response = await fetch(
    `/api/cefis/lessons?courseId=${encodeURIComponent(String(courseId))}`,
  );

  if (!response.ok) {
    throw new Error("Falha ao buscar aulas.");
  }

  const payload = (await response.json()) as { data?: Lesson[] };
  const apiLessons = Array.isArray(payload.data) ? payload.data : [];
  const lessonsWithTitle = apiLessons.filter(
    (lesson) => typeof lesson.title === "string" && lesson.title.trim(),
  );

  return lessonsWithTitle.map((lesson) => ({ ...lesson, source: "api" }));
}

async function fetchTutorReply({
  message,
  currentStep,
  onboarding,
  fallbackMessage,
  isLoggedIn,
  userEnergy,
  hasSeenPlan,
  hasSeenPreview,
  hasInteractedAfterPlan,
}: {
  message: string;
  currentStep: ConversationStep;
  onboarding: OnboardingState;
  fallbackMessage: string;
  isLoggedIn: boolean;
  userEnergy: UserEnergy;
  hasSeenPlan: boolean;
  hasSeenPreview: boolean;
  hasInteractedAfterPlan: boolean;
}) {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mensagem: message,
        etapaAtual: currentStep,
        tema: onboarding.tema,
        nome: onboarding.nome,
        email: onboarding.email,
        ritmo: onboarding.ritmo,
        cursoSelecionado: onboarding.cursoSelecionado,
        objetivo: onboarding.objetivo,
        aulaAtual: onboarding.aulaAtual,
        progressoAtual: onboarding.progressoAtual,
        planoAtivo: onboarding.planoAtivo,
        ultimaRecomendacao: onboarding.ultimaRecomendacao,
        ultimoFormato: onboarding.ultimoFormato,
        isLoggedIn,
        userEnergy,
        hasSeenPlan,
        hasSeenPreview,
        hasInteractedAfterPlan,
      }),
    });

    const payload = (await response.json()) as ChatApiResponse;

    return payload.reply?.trim() || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

async function loginToCefis(
  email: string,
  password: string,
): Promise<{ apiKey: string; user: CefisUser | null }> {
  const response = await fetch("/api/cefis/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const payload = (await response.json()) as LoginApiResponse;

  if (!response.ok || !payload.apiKey) {
    throw new Error(payload.error || "Não foi possível entrar na CEFIS.");
  }

  return { apiKey: payload.apiKey, user: payload.user ?? null };
}

async function fetchCefisMe(apiKey: string) {
  const response = await fetch("/api/cefis/me", {
    headers: {
      Authorization: apiKey,
    },
  });
  const payload = (await response.json()) as MeApiResponse;

  if (!response.ok) {
    throw new Error(payload.error || "Não foi possível carregar seu usuário.");
  }

  return payload.user ?? null;
}

function CourseMiniCard({ course }: { course: Course }) {
  return (
    <article className="cefis-fade-in min-w-[190px] rounded-lg border border-white/10 bg-white/[0.06] p-4 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/45">
      <div className="flex items-center justify-between gap-3 text-xs text-neutral-400">
        <span>{course.teacher?.name ?? "CEFIS"}</span>
        <span>{formatDuration(course.duration)}</span>
      </div>
      <h3 className="mt-3 line-clamp-2 text-base font-bold text-white">
        {course.title}
      </h3>
      <p className="mt-2 line-clamp-2 text-sm leading-5 text-neutral-300">
        {getCourseDescription(course)}
      </p>
      <p className="mt-4 w-fit rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100">
        {course.lessonCount ? `${course.lessonCount} aulas` : "curso CEFIS"}
      </p>
    </article>
  );
}

function TutorAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClass = {
    sm: "h-7 w-7",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  }[size];

  return (
    <div
      className={`${sizeClass} cefis-avatar-glow relative shrink-0 rounded-full border border-cyan-300/25 bg-cyan-300/10 p-2 shadow-lg shadow-cyan-950/40`}
    >
      <Image
        alt="Tutor CEFIS"
        className="h-full w-full object-contain"
        height={64}
        src="/simbolo-solo-cefis.svg"
        width={64}
      />
    </div>
  );
}

function getJourneySteps({
  currentStep,
  panelMode,
  hasSeenPlan,
  isLoggedIn,
}: {
  currentStep: ConversationStep;
  panelMode: PanelMode;
  hasSeenPlan: boolean;
  isLoggedIn: boolean;
}): JourneyStep[] {
  if (isLoggedIn || hasSeenPlan) {
    return ["Tema", "Perfil", "Ritmo", "Plano"].map((label) => ({
      label,
      state: "complete",
    }));
  }

  if (panelMode === "complete") {
    return [
      { label: "Tema", state: "complete" },
      { label: "Perfil", state: "complete" },
      { label: "Ritmo", state: "complete" },
      { label: "Plano", state: "active" },
    ];
  }

  if (currentStep === "time" || panelMode === "email") {
    return [
      { label: "Tema", state: "complete" },
      { label: "Perfil", state: "complete" },
      { label: "Ritmo", state: "active" },
      { label: "Plano", state: "inactive" },
    ];
  }

  if (
    currentStep === "name" ||
    currentStep === "email" ||
    panelMode === "topic" ||
    panelMode === "name"
  ) {
    return [
      { label: "Tema", state: "complete" },
      { label: "Perfil", state: "active" },
      { label: "Ritmo", state: "inactive" },
      { label: "Plano", state: "inactive" },
    ];
  }

  return [
    { label: "Tema", state: "active" },
    { label: "Perfil", state: "inactive" },
    { label: "Ritmo", state: "inactive" },
    { label: "Plano", state: "inactive" },
  ];
}

function PanelProgress({ steps }: { steps: JourneyStep[] }) {
  const stateClass: Record<JourneyStepState, string> = {
    inactive:
      "border-white/10 bg-white/[0.03] text-neutral-500 opacity-70",
    active:
      "border-cyan-300/60 bg-cyan-300/15 text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.18)] animate-pulse",
    complete:
      "border-white/15 bg-white/[0.08] text-neutral-200 opacity-95",
  };

  return (
    <div className="absolute inset-x-3 top-3 z-20 flex justify-center sm:top-4">
      <div className="flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-white/10 bg-neutral-950/70 px-2 py-2 shadow-xl shadow-black/20 backdrop-blur">
        {steps.map((step) => (
          <span
            key={step.label}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] transition duration-500 sm:text-[11px] ${stateClass[step.state]}`}
          >
            {step.state === "complete" && (
              <span className="text-cyan-200">✓</span>
            )}
            {step.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function StudyPlanCard({
  availableTime,
  course,
  decision,
}: {
  availableTime: string;
  course: Course;
  decision: TutorDecision;
}) {
  const minutes = getStudyMinutes(availableTime);

  return (
    <div className="rounded-lg border border-white/10 bg-neutral-950/70 p-3 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-cyan-200">
            Plano de hoje
          </p>
          <h3 className="mt-1 text-base font-black text-white sm:text-lg">
            {minutes} minutos
          </h3>
        </div>
        <p className="line-clamp-1 max-w-full rounded-md bg-cyan-300 px-3 py-2 text-left text-xs font-black leading-5 text-neutral-950 sm:max-w-[52%] sm:text-sm">
          {course.title}
        </p>
      </div>

      <ol className="mt-3 grid gap-2 sm:grid-cols-3">
        {decision.planSteps.map((item, index) => (
          <li
            key={item}
            className="min-h-[74px] rounded-lg border border-white/10 bg-white/[0.04] p-3 transition duration-500"
          >
            <span className="text-lg font-black text-cyan-200">
              0{index + 1}
            </span>
            <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-neutral-200 sm:text-sm">
              {item}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function FinalCTA({
  variant,
  continueUrl,
  onAdjustPlan,
  onContinueInTutor,
  onOpenLogin,
}: {
  variant: CtaVariant;
  continueUrl: string;
  onAdjustPlan: () => void;
  onContinueInTutor: () => void;
  onOpenLogin: () => void;
}) {
  const copy: Record<CtaVariant, { title: string; tone: string }> = {
    visitor: {
      title:
        "Seu plano está pronto. Para salvar e continuar depois, entre ou crie uma conta.",
      tone: "border-cyan-300/20 bg-cyan-300/[0.07]",
    },
    "logged-free": {
      title:
        "Seu plano está salvo. Você pode continuar acompanhado pelo Tutor ou abrir o curso oficial na CEFIS.",
      tone: "border-cyan-300/20 bg-cyan-300/[0.07]",
    },
    premium: {
      title: "Seu plano está pronto para continuar dentro do Tutor IA.",
      tone: "border-emerald-300/25 bg-emerald-300/[0.07]",
    },
  };
  const current = copy[variant];

  return (
    <div
      className={`cefis-fade-in mt-4 rounded-lg border p-4 shadow-lg shadow-cyan-950/20 ${current.tone}`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-black text-cyan-100">{current.title}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {variant === "visitor" && (
            <>
              <button
                className="rounded-lg bg-cyan-300 px-4 py-2 text-center text-xs font-black text-neutral-950 transition hover:bg-cyan-200"
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={onOpenLogin}
              >
                Entrar
              </button>
              <a
                className="rounded-lg border border-white/10 px-4 py-2 text-center text-xs font-bold text-neutral-200 transition hover:border-cyan-300/50 hover:text-white"
                href={PURCHASE_URL}
                rel="noreferrer"
                target="_blank"
              >
                Criar conta grátis
              </a>
              <a
                className="rounded-lg border border-white/10 px-4 py-2 text-center text-xs font-bold text-neutral-200 transition hover:border-cyan-300/50 hover:text-white"
                href={PLANS_URL}
                rel="noreferrer"
                target="_blank"
              >
                Ver planos CEFIS
              </a>
            </>
          )}

          {variant === "logged-free" && (
            <>
              <button
                className="rounded-lg bg-cyan-300 px-4 py-2 text-center text-xs font-black text-neutral-950 transition hover:bg-cyan-200"
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={onContinueInTutor}
              >
                Continuar no Tutor
              </button>
              <a
                className="rounded-lg border border-white/10 px-4 py-2 text-center text-xs font-bold text-neutral-200 transition hover:border-cyan-300/50 hover:text-white"
                href={continueUrl}
                rel="noreferrer"
                target="_blank"
              >
                Abrir curso na CEFIS
              </a>
              <button
                className="rounded-lg px-4 py-2 text-xs font-bold text-neutral-400 transition hover:text-white"
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={onAdjustPlan}
              >
                Ajustar plano
              </button>
            </>
          )}

          {variant === "premium" && (
            <>
              <button
                className="rounded-lg bg-emerald-300 px-4 py-2 text-center text-xs font-black text-neutral-950 transition hover:bg-emerald-200"
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={onContinueInTutor}
              >
                Continuar no Tutor
              </button>
              <a
                className="rounded-lg border border-white/10 px-4 py-2 text-center text-xs font-bold text-neutral-200 transition hover:border-emerald-300/50 hover:text-white"
                href={continueUrl}
                rel="noreferrer"
                target="_blank"
              >
                Abrir curso na CEFIS
              </a>
              <button
                className="rounded-lg px-4 py-2 text-xs font-bold text-neutral-400 transition hover:text-white"
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={onAdjustPlan}
              >
                Ajustar plano
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LoginOffer({
  onContinueWithoutLogin,
  onOpenLogin,
}: {
  onContinueWithoutLogin: () => void;
  onOpenLogin: () => void;
}) {
  return (
    <div className="mt-3 rounded-lg border border-cyan-300/20 bg-cyan-300/[0.07] p-3">
      <p className="text-sm font-semibold leading-6 text-cyan-50">
        Se você já tem conta na CEFIS, pode entrar agora para conectar seu plano
        ao seu histórico.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          className="rounded-lg bg-cyan-300 px-4 py-2 text-xs font-black text-neutral-950 transition hover:bg-cyan-200"
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onOpenLogin}
        >
          Entrar com minha conta
        </button>
        <button
          className="rounded-lg border border-white/10 px-4 py-2 text-xs font-bold text-neutral-200 transition hover:border-cyan-300/50 hover:text-white"
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onContinueWithoutLogin}
        >
          Continuar sem login
        </button>
      </div>
    </div>
  );
}

function LoggedActionBar({
  onLoggedAction,
  compact = false,
}: {
  onLoggedAction: (action: LoggedAction) => void;
  compact?: boolean;
}) {
  const actions: [LoggedAction, string][] = [
    ["continue", "Continuar"],
    ["review", "Revisar 5min"],
    ["ask", "Dúvidas"],
    ["today", "Plano hoje"],
  ];

  return (
    <div
      className={
        compact
          ? "grid grid-cols-2 gap-2"
          : "mt-4 grid gap-2 sm:grid-cols-4"
      }
    >
      {actions.map(([action, label]) => (
        <button
          key={action}
          className={`border border-white/10 bg-white/[0.04] font-bold text-neutral-200 transition hover:-translate-y-0.5 hover:border-cyan-300/50 hover:bg-cyan-300/10 hover:text-white ${
            compact
              ? "rounded-full px-3 py-2 text-xs"
              : "rounded-lg px-4 py-3 text-sm"
          }`}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onLoggedAction(action as LoggedAction)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function ChatBubble({ message }: { message: Message }) {
  const isTutor = message.role === "tutor";

  return (
    <div className={`flex ${isTutor ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[86%] rounded-lg border px-3 py-2 text-sm leading-6 shadow-lg shadow-black/10 sm:max-w-[72%] ${
          isTutor
            ? "border-cyan-300/15 bg-white/[0.05] text-neutral-100"
            : "border-white/10 bg-cyan-300 text-neutral-950"
        }`}
      >
        {isTutor && (
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.1em] text-cyan-200">
            Tutor
          </p>
        )}
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
      </div>
    </div>
  );
}

function LoggedWorkspaceContext({
  loggedProgress,
  onLoggedAction,
}: {
  loggedProgress: LoggedStudentProgress;
  onLoggedAction: (action: LoggedAction) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <TutorAvatar size="sm" />
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-200">
            Mentor ativo
          </p>
          <p className="text-sm text-neutral-400">
            Acompanhamento contínuo
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
          Curso atual
        </p>
        <h2 className="text-2xl font-black leading-tight text-white">
          {loggedProgress.courseTitle}
        </h2>
        <p className="text-sm leading-6 text-neutral-400">
          Você parou em{" "}
          <span className="font-bold text-neutral-100">
            {loggedProgress.lessonTitle}
          </span>
          .
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.08em]">
          <span className="text-neutral-500">Progresso</span>
          <span className="text-cyan-100">
            {loggedProgress.progressPercent}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.45)] transition-all duration-700"
            style={{ width: `${loggedProgress.progressPercent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          Último acesso {loggedProgress.lastAccess}
        </p>
      </div>

      <div className="grid gap-3 border-y border-white/10 py-4 text-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-neutral-500">
            Plano ativo
          </p>
          <p className="mt-1 font-semibold text-neutral-100">
            {loggedProgress.activePlan}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-neutral-500">
            Tempo disponível
          </p>
          <p className="mt-1 font-semibold text-neutral-100">
            {loggedProgress.chosenTime}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-neutral-500">
            Última recomendação
          </p>
          <p className="mt-1 font-semibold leading-6 text-neutral-100">
            {loggedProgress.lastRecommendation}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-neutral-500">
            Formato
          </p>
          <p className="mt-1 font-semibold text-neutral-100">
            {loggedProgress.lastFormat}
          </p>
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-black uppercase tracking-[0.12em] text-neutral-500">
          Ações rápidas
        </p>
        <LoggedActionBar compact onLoggedAction={onLoggedAction} />
      </div>
    </div>
  );
}

function LoggedLearningSurface({
  course,
  lesson,
  decision,
  isLoadingLessons,
  loggedProgress,
}: {
  course: Course | null;
  lesson: Lesson | null;
  decision: TutorDecision;
  isLoadingLessons: boolean;
  loggedProgress: LoggedStudentProgress;
}) {
  const currentCourse = course ?? loggedProgressCourse;
  const currentLesson =
    lesson ??
    ({
      ...fallbackLessons[0],
      title: loggedProgress.lessonTitle,
    } satisfies Lesson);
  const videoSource = getVideoSource(currentLesson);

  return (
    <div className="shrink-0 border-b border-white/10 bg-white/[0.02] px-4 py-4 sm:px-6">
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="min-w-0 rounded-lg border border-white/10 bg-neutral-950/70 p-4">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-200">
            Aula em foco
          </p>
          <h2 className="mt-2 line-clamp-2 text-xl font-black leading-tight text-white">
            {currentLesson.title}
          </h2>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-400">
            {currentCourse.title}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-neutral-300">
              {formatDuration(currentLesson.duration)}
            </span>
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-cyan-100">
              {videoSource ? "vídeo disponível" : "modo guiado"}
            </span>
            {isLoadingLessons && (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-neutral-300 animate-pulse">
                buscando aula...
              </span>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-white/10 bg-black/40">
          {videoSource ? (
            <video
              className="aspect-video h-full w-full bg-black object-cover"
              controls
              src={videoSource}
            />
          ) : (
            <div className="flex aspect-video h-full min-h-[180px] flex-col justify-center p-5">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-neutral-500">
                Prévia guiada
              </p>
              <p className="mt-3 text-lg font-black leading-7 text-white">
                Quando houver vídeo público, ele aparece aqui. Por enquanto, o
                tutor conduz a aula com resumo e próximos passos.
              </p>
            </div>
          )}
        </div>
      </div>

      <ol className="mt-3 grid gap-2 sm:grid-cols-3">
        {decision.planSteps.map((step, index) => (
          <li
            key={`${step}-${index}`}
            className="rounded-lg border border-white/10 bg-white/[0.04] p-3"
          >
            <span className="text-sm font-black text-cyan-200">
              0{index + 1}
            </span>
            <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-neutral-200">
              {step}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function LoggedWorkspace({
  tutorMessage,
  messages,
  inputValue,
  inputRef,
  currentStep,
  isTutorTyping,
  isBusy,
  thinkingStep,
  loggedProgress,
  selectedCourse,
  selectedLesson,
  decision,
  isLoadingLessons,
  onLoggedAction,
  onInputChange,
  onSubmit,
}: {
  tutorMessage: string;
  messages: Message[];
  inputValue: string;
  inputRef: RefObject<HTMLInputElement | null>;
  currentStep: ConversationStep;
  isTutorTyping: boolean;
  isBusy: boolean;
  thinkingStep: string;
  loggedProgress: LoggedStudentProgress;
  selectedCourse: Course | null;
  selectedLesson: Lesson | null;
  decision: TutorDecision;
  isLoadingLessons: boolean;
  onLoggedAction: (action: LoggedAction) => void;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const visibleMessages = isTutorTyping
    ? [...messages, { role: "tutor" as const, text: tutorMessage }]
    : messages;

  useEffect(() => {
    const chatNode = chatScrollRef.current;

    if (!chatNode) {
      return;
    }

    chatNode.scrollTo({
      top: chatNode.scrollHeight,
      behavior: "smooth",
    });
  }, [isTutorTyping, messages, tutorMessage]);

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-4 lg:h-[calc(100vh-108px)] lg:grid-cols-[minmax(280px,0.35fr)_minmax(0,0.65fr)] lg:overflow-hidden">
      <details className="group rounded-lg border border-white/10 bg-neutral-950/90 p-4 shadow-2xl shadow-black/30 lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-black uppercase tracking-[0.1em] text-cyan-100">
          Contexto do plano
          <span className="text-neutral-500 transition group-open:rotate-45">
            +
          </span>
        </summary>
        <div className="mt-5">
          <LoggedWorkspaceContext
            loggedProgress={loggedProgress}
            onLoggedAction={onLoggedAction}
          />
        </div>
      </details>

      <aside className="hidden overflow-hidden rounded-lg border border-white/10 bg-neutral-950/90 p-5 shadow-2xl shadow-black/40 lg:sticky lg:top-4 lg:block lg:max-h-[calc(100vh-112px)] lg:overflow-y-auto">
        <LoggedWorkspaceContext
          loggedProgress={loggedProgress}
          onLoggedAction={onLoggedAction}
        />
      </aside>

      <section className="flex min-h-[72vh] flex-col overflow-hidden rounded-lg border border-white/10 bg-neutral-950 shadow-2xl shadow-black/50 lg:h-full lg:min-h-0">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-200">
              Tutor IA
            </p>
            <h1 className="mt-1 truncate text-xl font-black text-white sm:text-2xl">
              Workspace de aprendizagem
            </h1>
          </div>
          {(thinkingStep || isTutorTyping) && (
            <div className="shrink-0 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100 animate-pulse">
              {thinkingStep || "Escrevendo..."}
            </div>
          )}
        </div>

        <LoggedLearningSurface
          course={selectedCourse}
          decision={decision}
          isLoadingLessons={isLoadingLessons}
          lesson={selectedLesson}
          loggedProgress={loggedProgress}
        />

        <div
          ref={chatScrollRef}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6"
        >
          {visibleMessages.map((message, index) => (
            <ChatBubble
              key={`${message.role}-${index}-${message.text.slice(0, 14)}`}
              message={message}
            />
          ))}
          {isTutorTyping && (
            <span className="ml-2 inline-block h-4 w-1 animate-pulse rounded-full bg-cyan-200 align-middle" />
          )}
        </div>

        <form
          className="flex shrink-0 flex-col gap-3 border-t border-white/10 bg-neutral-950/95 p-4 backdrop-blur sm:flex-row sm:p-5"
          onSubmit={(event) => {
            onSubmit(event);
            window.setTimeout(() => inputRef.current?.focus(), 0);
          }}
        >
          <input
            ref={inputRef}
            className="min-h-12 flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-base text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/20 disabled:cursor-wait disabled:opacity-60"
            disabled={isBusy}
            value={inputValue}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder={getPlaceholder(currentStep)}
          />
          <button
            className="rounded-lg bg-cyan-300 px-6 py-3 text-sm font-black text-neutral-950 transition duration-300 hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-200 disabled:cursor-wait disabled:opacity-60"
            disabled={isBusy}
            type="submit"
            onMouseDown={(event) => event.preventDefault()}
          >
            {isBusy ? "Pensando..." : "Enviar"}
          </button>
        </form>
      </section>
    </section>
  );
}

function LoginModal({
  isOpen,
  email,
  password,
  error,
  isLoading,
  onClose,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: {
  isOpen: boolean;
  email: string;
  password: string;
  error: string;
  isLoading: boolean;
  onClose: () => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-neutral-950 p-5 shadow-2xl shadow-black/60">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-200">
              Entrar na CEFIS
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              Salvar meu plano
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-400">
              Use sua conta CEFIS para continuar sem repetir nome e e-mail.
            </p>
          </div>
          <button
            className="rounded-lg px-2 py-1 text-sm font-bold text-neutral-500 transition hover:text-white"
            type="button"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>

        <form className="mt-5 space-y-3" onSubmit={onSubmit}>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-neutral-500">
              E-mail
            </span>
            <input
              autoComplete="email"
              className="mt-2 min-h-12 w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 text-white outline-none transition placeholder:text-neutral-600 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/20"
              disabled={isLoading}
              inputMode="email"
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="seu@email.com"
              type="email"
              value={email}
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-neutral-500">
              Senha
            </span>
            <input
              autoComplete="current-password"
              className="mt-2 min-h-12 w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 text-white outline-none transition placeholder:text-neutral-600 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/20"
              disabled={isLoading}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="Sua senha"
              type="password"
              value={password}
            />
          </label>

          {error && (
            <p className="whitespace-pre-wrap break-words rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-sm leading-6 text-amber-100">
              {error}
            </p>
          )}

          <button
            className="min-h-12 w-full rounded-lg bg-cyan-300 px-5 text-sm font-black text-neutral-950 transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

function PanelVisual({
  mode,
  topic,
  name,
  email,
  availableTime,
  courses,
  selectedCourse,
  lessons,
  selectedLesson,
  isLoadingCourses,
  isLoadingLessons,
  apiError,
  visibleCourseCount,
  decision,
  loggedProgress,
  onGuidedTopicSelect,
}: {
  mode: PanelMode;
  topic: string;
  name: string;
  email: string;
  availableTime: string;
  courses: Course[];
  selectedCourse: Course | null;
  lessons: Lesson[];
  selectedLesson: Lesson | null;
  isLoadingCourses: boolean;
  isLoadingLessons: boolean;
  apiError: string;
  visibleCourseCount: number;
  decision: TutorDecision;
  loggedProgress: LoggedStudentProgress;
  onGuidedTopicSelect: (topic: string) => void;
}) {
  const theme = getTheme(topic);
  const relatedCourses = getRelatedCourses(courses);
  const visibleCourses = relatedCourses.slice(0, visibleCourseCount);
  const recommendedCourse = getRecommendedCourse(selectedCourse, courses);
  const trail = getTrail(topic);
  const videoSource = getVideoSource(selectedLesson);
  const isLightMode = decision.mode === "light";

  if (mode === "logged") {
    return (
      <div className="cefis-fade-in flex h-full flex-col justify-center">
        <p className="text-sm font-bold uppercase text-cyan-200">
          Aluno logado
        </p>
        <h2 className="mt-3 text-3xl font-black leading-tight text-white sm:text-5xl">
          {loggedProgress.name}, seu plano está conectado à sua conta CEFIS.
        </h2>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-neutral-300">
          Você parou em {loggedProgress.lessonTitle}. Hoje o tutor trabalha a
          partir do seu progresso, do tempo disponível e do plano ativo.
        </p>

        <div className="mt-7 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-lg border border-white/10 bg-white/[0.05] p-4">
            <p className="text-xs font-bold uppercase text-neutral-500">
              Curso atual
            </p>
            <h3 className="mt-2 text-xl font-black text-white">
              {loggedProgress.courseTitle}
            </h3>
            <p className="mt-2 text-sm text-neutral-300">
              Aula atual:{" "}
              <span className="text-white">{loggedProgress.lessonTitle}</span>
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.45)] transition-all duration-700"
                style={{ width: `${loggedProgress.progressPercent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              {loggedProgress.progressPercent}% concluído · último acesso{" "}
              {loggedProgress.lastAccess}
            </p>
          </div>

          <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-cyan-100">
              Mentor ativo
            </p>
            <p className="mt-3 text-lg font-bold leading-7 text-white">
              {loggedProgress.reviewHint}
            </p>
            <div className="mt-4 grid gap-2 text-sm text-cyan-50/85">
              <p>
                Plano ativo:{" "}
                <span className="font-bold text-white">
                  {loggedProgress.activePlan}
                </span>
              </p>
              <p>
                Tempo de hoje:{" "}
                <span className="font-bold text-white">
                  {loggedProgress.chosenTime}
                </span>
              </p>
              <p>
                Última recomendação:{" "}
                <span className="font-bold text-white">
                  {loggedProgress.lastRecommendation}
                </span>
              </p>
              <p>
                Formato usado:{" "}
                <span className="font-bold text-white">
                  {loggedProgress.lastFormat}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            "Continuar aula recomendada",
            "Revisar em 5 minutos",
            "Fazer perguntas sobre a aula",
            "Montar plano de hoje",
          ].map((option) => (
            <div
              key={option}
              className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm font-bold text-neutral-200"
            >
              {option}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (mode === "initial") {
    return (
      <div className="cefis-fade-in flex h-full flex-col items-center justify-center text-center">
        <TutorAvatar size="lg" />
        <h1 className="mt-7 max-w-2xl text-balance text-4xl font-semibold leading-tight text-white sm:text-6xl">
          O que você quer aprender agora?
        </h1>
        <p className="mt-5 max-w-xl text-pretty text-lg leading-8 text-neutral-300">
          Eu posso ensinar você, adaptar o ritmo e montar um plano ideal para o
          seu momento..
        </p>
      </div>
    );
  }

  if (mode === "guided") {
    return (
      <div className="cefis-fade-in flex h-full flex-col justify-center gap-7">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase text-cyan-200">
            Exploração guiada
          </p>
          <h2 className="mt-3 text-4xl font-black leading-tight text-white sm:text-6xl">
            Vamos escolher juntos.
          </h2>
          <p className="mt-4 text-lg leading-8 text-neutral-300">
            Sem problema não saber por onde começar. Escolha uma área e eu
            busco conteúdos reais da CEFIS para montar o primeiro caminho.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {guidedTopicOptions.map((option) => (
            <button
              key={option.label}
              className="min-h-[150px] rounded-lg border border-white/10 bg-white/[0.05] p-4 text-left transition duration-300 hover:-translate-y-1 hover:border-cyan-300/50 hover:bg-cyan-300/10"
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onGuidedTopicSelect(option.topic)}
            >
              <span className="text-xs font-black uppercase tracking-[0.1em] text-cyan-200">
                {option.label}
              </span>
              <p className="mt-3 text-sm font-semibold leading-6 text-neutral-200">
                {option.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (mode === "topic") {
    return (
      <div className="cefis-fade-in flex h-full flex-col justify-between gap-5">
        <div>
          <p className="text-sm font-bold uppercase text-cyan-200">
            Tema detectado
          </p>
          <h2 className="mt-2 text-4xl font-black text-white sm:text-6xl">
            {theme}
          </h2>
          <p className="mt-2 text-neutral-300">
            {isLoadingCourses
              ? "Buscando cursos na biblioteca CEFIS..."
              : "Encontrei caminhos possíveis na biblioteca CEFIS."}
          </p>
          {apiError && (
            <p className="mt-2 text-sm text-amber-200">{apiError}</p>
          )}
        </div>

        <div className="relative overflow-hidden">
          <div className="flex gap-3">
            {isLoadingCourses
              ? [1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-[170px] min-w-[190px] animate-pulse rounded-lg border border-white/10 bg-white/[0.06]"
                  />
                ))
              : visibleCourses.map((course) => (
                  <CourseMiniCard key={course.id} course={course} />
                ))}
            {!isLoadingCourses && !visibleCourses.length && (
              <div className="h-[170px] min-w-[240px] animate-pulse rounded-lg border border-white/10 bg-white/[0.04] p-5 text-sm text-neutral-300">
                Organizando recomendações...
              </div>
            )}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-neutral-950 to-transparent" />
        </div>
      </div>
    );
  }

  if (mode === "name") {
    return (
      <div className="cefis-fade-in flex h-full flex-col justify-center">
        <p className="text-sm font-bold uppercase text-cyan-200">
          Personalização iniciada
        </p>
        <h2 className="mt-3 text-4xl font-black text-white sm:text-6xl">
          Plano de {name}
        </h2>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-neutral-300">
          Tema escolhido: <span className="text-white">{theme}</span>.
          Primeiro curso recomendado:{" "}
          <span className="text-white">{recommendedCourse.title}</span>.
        </p>
      </div>
    );
  }

  if (mode === "email") {
    return (
      <div className="cefis-fade-in flex h-full flex-col justify-center">
        <p className="text-sm font-bold uppercase text-cyan-200">
          Plano salvo no rascunho
        </p>
        <h2 className="mt-3 text-3xl font-black text-white sm:text-5xl">
          Terei como salvar seu plano e enviar depois.
        </h2>
        <p className="mt-5 text-sm text-neutral-400">
          Enviar para: <span className="text-neutral-200">{email}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="cefis-fade-in flex h-full min-h-0 flex-col gap-3">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(320px,1.08fr)]">
        <section className="order-last min-w-0 rounded-lg border border-white/10 bg-white/[0.04] p-4 lg:order-none">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-cyan-200">
            {getModeLabel(decision.mode)}
          </p>
          <h2 className="mt-2 line-clamp-2 text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
            {recommendedCourse.title}
          </h2>

          <div className="mt-4 grid gap-2 text-sm leading-6 text-neutral-300">
            <p>
              Duração disponível:{" "}
              <span className="text-white">{availableTime}</span>
            </p>
            {!isLightMode && (
              <p className="line-clamp-1">
                Trilha sugerida: <span className="text-white">{trail}</span>
              </p>
            )}
            <p>
              Aula:{" "}
              <span className="text-white">
                {isLoadingLessons
                  ? "buscando aula real..."
                  : selectedLesson?.title ?? "aula curta sugerida"}
              </span>
            </p>
            {!isLightMode && (
              <p>
                Aulas encontradas:{" "}
                <span className="text-white">
                  {isLoadingLessons
                    ? "buscando..."
                    : lessons.length || "fallback"}
                </span>
              </p>
            )}
          </div>

          {isLightMode && (
            <p className="mt-4 rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm leading-6 text-cyan-50">
              Hoje eu reduzi a carga visual: aula curta, resumo leve e nada de
              exercícios pesados agora.
            </p>
          )}
          {apiError && (
            <p className="mt-3 text-sm text-amber-200">{apiError}</p>
          )}
        </section>

        <section className="order-first min-w-0 rounded-lg border border-white/10 bg-black/50 p-2 lg:order-none">
          {videoSource ? (
            <video
              className="aspect-video w-full rounded-md bg-black object-contain"
              controls
              src={videoSource}
            />
          ) : (
            <div className="flex aspect-video w-full flex-col justify-center rounded-md bg-neutral-950 p-6">
              <p className="text-sm font-bold uppercase tracking-[0.08em] text-cyan-200">
                Prévia do estudo
              </p>
              <h3 className="mt-3 line-clamp-2 text-2xl font-black text-white">
                {recommendedCourse.title}
              </h3>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-300">
                {getCourseDescription(recommendedCourse)}
              </p>
            </div>
          )}
        </section>
      </div>

      <StudyPlanCard
        availableTime={availableTime}
        course={recommendedCourse}
        decision={decision}
      />
    </div>
  );
}

function LivePanel({
  mode,
  topic,
  name,
  email,
  availableTime,
  tutorMessage,
  messages,
  inputValue,
  inputRef,
  currentStep,
  courses,
  selectedCourse,
  lessons,
  selectedLesson,
  isLoadingCourses,
  isLoadingLessons,
  isTutorTyping,
  isBusy,
  thinkingStep,
  apiError,
  visibleCourseCount,
  decision,
  journeySteps,
  loggedProgress,
  isLoggedIn,
  showFinalCTA,
  showLoginOffer,
  ctaVariant,
  continueUrl,
  onAdjustPlan,
  onContinueWithoutLogin,
  onContinueInTutor,
  onOpenLogin,
  onGuidedTopicSelect,
  onLoggedAction,
  onInputChange,
  onSubmit,
}: {
  mode: PanelMode;
  topic: string;
  name: string;
  email: string;
  availableTime: string;
  tutorMessage: string;
  messages: Message[];
  inputValue: string;
  inputRef: RefObject<HTMLInputElement | null>;
  currentStep: ConversationStep;
  courses: Course[];
  selectedCourse: Course | null;
  lessons: Lesson[];
  selectedLesson: Lesson | null;
  isLoadingCourses: boolean;
  isLoadingLessons: boolean;
  isTutorTyping: boolean;
  isBusy: boolean;
  thinkingStep: string;
  apiError: string;
  visibleCourseCount: number;
  decision: TutorDecision;
  journeySteps: JourneyStep[];
  loggedProgress: LoggedStudentProgress;
  isLoggedIn: boolean;
  showFinalCTA: boolean;
  showLoginOffer: boolean;
  ctaVariant: CtaVariant;
  continueUrl: string;
  onAdjustPlan: () => void;
  onContinueWithoutLogin: () => void;
  onContinueInTutor: () => void;
  onOpenLogin: () => void;
  onGuidedTopicSelect: (topic: string) => void;
  onLoggedAction: (action: LoggedAction) => void;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const visualPanelClass =
    mode === "complete"
      ? "h-[900px] sm:h-[780px] lg:h-[660px]"
      : "h-[420px] sm:h-[500px] lg:h-[520px]";
  const chatPanelClass =
    showFinalCTA
      ? "h-[410px] sm:h-[380px]"
      : "h-[300px] sm:h-[320px]";
  const visibleMessages = isTutorTyping
    ? [...messages, { role: "tutor" as const, text: tutorMessage }]
    : messages;

  useEffect(() => {
    const chatNode = chatScrollRef.current;

    if (!chatNode) {
      return;
    }

    chatNode.scrollTo({
      top: chatNode.scrollHeight,
      behavior: "smooth",
    });
  }, [isTutorTyping, messages, showFinalCTA, tutorMessage]);

  return (
    <section className="mx-auto w-full max-w-6xl overflow-hidden rounded-lg border border-white/10 bg-neutral-950 shadow-2xl shadow-black/50 transition duration-500">
      <div className="relative flex h-full flex-col gap-4 overflow-hidden p-4 sm:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_15%_80%,rgba(255,255,255,0.07),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.05),transparent_48%)]" />
        <div className="absolute inset-x-10 top-[4.5rem] h-px bg-cyan-200/30" />
        <PanelProgress steps={journeySteps} />
        {(thinkingStep || isTutorTyping) && (
          <div className="absolute right-4 top-[4.85rem] z-20 rounded-full border border-cyan-300/20 bg-neutral-950/80 px-3 py-1 text-xs font-bold text-cyan-100 shadow-lg shadow-black/20 backdrop-blur animate-pulse">
            {thinkingStep || "Escrevendo resposta..."}
          </div>
        )}

        <div
          className={`relative z-10 shrink-0 overflow-hidden rounded-lg pt-16 ${visualPanelClass}`}
        >
          <div className="h-full overflow-hidden">
            <PanelVisual
              mode={mode}
              topic={topic}
              name={name}
              email={email}
              availableTime={availableTime}
              courses={courses}
              selectedCourse={selectedCourse}
              lessons={lessons}
              selectedLesson={selectedLesson}
              isLoadingCourses={isLoadingCourses}
              isLoadingLessons={isLoadingLessons}
              apiError={apiError}
              visibleCourseCount={visibleCourseCount}
              decision={decision}
              loggedProgress={loggedProgress}
              onGuidedTopicSelect={onGuidedTopicSelect}
            />
          </div>
        </div>

        <div
          className={`relative z-10 flex shrink-0 flex-col rounded-lg border border-white/10 bg-neutral-950/90 p-3 shadow-2xl shadow-black/30 sm:p-4 ${chatPanelClass}`}
        >
          <div className="mb-3 flex items-center gap-3">
            <TutorAvatar size="sm" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.1em] text-cyan-200">
                Tutor IA
              </p>
              <p className="text-xs text-neutral-500">
                Converse sem perder o plano acima
              </p>
            </div>
          </div>

          <div
            ref={chatScrollRef}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1"
          >
            {visibleMessages.map((message, index) => (
              <ChatBubble
                key={`${message.role}-${index}-${message.text.slice(0, 14)}`}
                message={message}
              />
            ))}
            {isTutorTyping && (
              <span className="ml-2 inline-block h-4 w-1 animate-pulse rounded-full bg-cyan-200 align-middle" />
            )}
          </div>

          {showFinalCTA && (
            <div className="shrink-0">
              <FinalCTA
                continueUrl={continueUrl}
                onAdjustPlan={onAdjustPlan}
                onContinueInTutor={onContinueInTutor}
                onOpenLogin={onOpenLogin}
                variant={ctaVariant}
              />
            </div>
          )}

          {showLoginOffer && !showFinalCTA && (
            <div className="shrink-0">
              <LoginOffer
                onContinueWithoutLogin={onContinueWithoutLogin}
                onOpenLogin={onOpenLogin}
              />
            </div>
          )}

          {isLoggedIn && !showFinalCTA && (
            <div className="shrink-0">
              <LoggedActionBar onLoggedAction={onLoggedAction} />
            </div>
          )}

          <form
            className="mt-3 flex shrink-0 flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              onSubmit(event);
              window.setTimeout(() => inputRef.current?.focus(), 0);
            }}
          >
            <input
              ref={inputRef}
              className="min-h-12 flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-base text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/20 disabled:cursor-wait disabled:opacity-60"
              disabled={isBusy}
              value={inputValue}
              onChange={(event) => onInputChange(event.target.value)}
              placeholder={getPlaceholder(currentStep)}
            />
            <button
              className="rounded-lg bg-cyan-300 px-6 py-3 text-sm font-black text-neutral-950 transition duration-300 hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-200 disabled:cursor-wait disabled:opacity-60"
              disabled={isBusy}
              type="submit"
              onMouseDown={(event) => event.preventDefault()}
            >
              {isBusy ? "Pensando..." : "Enviar"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [currentStep, setCurrentStep] = useState<ConversationStep>("topic");
  const [currentExpectedInput, setCurrentExpectedInput] =
    useState<ExpectedInput>("topic");
  const [topic, setTopic] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [availableTime, setAvailableTime] = useState("");
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [panelMode, setPanelMode] = useState<PanelMode>("initial");
  const [inputValue, setInputValue] = useState("");
  const [courses, setCourses] = useState<Course[]>(fallbackCourses);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);
  const [isTutorTyping, setIsTutorTyping] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingStep, setThinkingStep] = useState("");
  const [visibleCourseCount, setVisibleCourseCount] = useState(0);
  const [userEnergy, setUserEnergy] = useState<UserEnergy>("normal");
  const [apiError, setApiError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedStudentMode, setLoggedStudentMode] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [loggedProgressPercent, setLoggedProgressPercent] = useState(
    loggedStudentProgress.progressPercent,
  );
  const [tutorMemory, setTutorMemory] = useState<TutorMemory | null>(null);
  const [loggedMemory, setLoggedMemory] =
    useState<LoggedLearningMemory>(initialLoggedMemory);
  const [authApiKey, setAuthApiKey] = useState("");
  const [authUser, setAuthUser] = useState<CefisUser | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showLoginOffer, setShowLoginOffer] = useState(false);
  const [pendingSuggestedTime, setPendingSuggestedTime] = useState<
    string | null
  >(null);
  const [planReady, setPlanReady] = useState(false);
  const [hasInteractedAfterPlan, setHasInteractedAfterPlan] = useState(false);
  const [hasSeenPreview, setHasSeenPreview] = useState(false);
  const [onboarding, setOnboarding] =
    useState<OnboardingState>(initialOnboarding);
  const [displayedTutorMessage, setDisplayedTutorMessage] =
    useState(initialTutorMessage);
  const inputRef = useRef<HTMLInputElement>(null);
  const [tutorDecision, setTutorDecision] = useState<TutorDecision>(() =>
    buildTutorDecision({
      topic: "",
      availableTime: "15 minutos",
      userEnergy: "normal",
      selectedCourse: fallbackCourses[0],
      selectedLesson: null,
    }),
  );

  const isBusy =
    isLoadingCourses || isLoadingLessons || isTutorTyping || isThinking;
  const journeySteps = getJourneySteps({
    currentStep,
    panelMode,
    hasSeenPlan: planReady,
    isLoggedIn,
  });
  const isPremium = isPremiumUser(authUser);
  const ctaVariant: CtaVariant = !isLoggedIn
    ? "visitor"
    : isPremium
      ? "premium"
      : "logged-free";
  const showFinalCTA =
    planReady && hasInteractedAfterPlan && !loggedStudentMode;
  const continueUrl = getCourseContinueUrl(selectedCourse);
  const hasCefisSession = Boolean(authApiKey);
  const loggedModeCourse = getRecommendedCourse(selectedCourse, courses);
  const activeLoggedProgress = {
    ...loggedStudentProgress,
    name: isLoggedIn
      ? name || getUserName(authUser)
      : loggedStudentProgress.name,
    courseTitle:
      loggedStudentMode && loggedModeCourse
        ? loggedModeCourse.title
        : loggedStudentProgress.courseTitle,
    lessonTitle:
      loggedStudentMode && selectedLesson
        ? selectedLesson.title
        : loggedMemory.currentLessonTitle,
    progressPercent: loggedProgressPercent,
    chosenTime: loggedMemory.chosenTime,
    activePlan: loggedMemory.activePlan,
    lastRecommendation: loggedMemory.lastRecommendation,
    lastFormat: loggedMemory.lastFormat,
  };

  const focusTutorInput = useCallback(() => {
    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }, []);

  useEffect(() => {
    if (!isBusy) {
      focusTutorInput();
    }
  }, [currentStep, focusTutorInput, isBusy, panelMode]);

  function addUserMessage(userText: string) {
    setMessages((current) => [...current, { role: "user", text: userText }]);
  }

  function updateOnboarding(nextState: Partial<OnboardingState>) {
    setOnboarding((current) => ({ ...current, ...nextState }));
  }

  function updateLoggedMemory(nextState: Partial<LoggedLearningMemory>) {
    setLoggedMemory((current) => ({ ...current, ...nextState }));
  }

  function saveTutorMemory(nextState: Partial<TutorMemory>) {
    const cleanedNextState = Object.fromEntries(
      Object.entries(nextState).filter(([, value]) => value !== undefined),
    ) as Partial<TutorMemory>;
    const memoryEmail =
      cleanedNextState.email ||
      email ||
      onboarding.email ||
      authUser?.email?.trim() ||
      tutorMemory?.email ||
      "";

    if (!memoryEmail.trim()) {
      return null;
    }

    const existingMemory =
      tutorMemory ?? readTutorMemoryByEmail(memoryEmail) ?? null;
    const nextMemory: TutorMemory = {
      ...createTutorMemory({
        email: memoryEmail,
        name: name || getUserName(authUser),
        preferredStudyTime: availableTime || loggedMemory.chosenTime,
        energyProfile: userEnergy,
        mainGoal: onboarding.objetivo || topic,
        lastTopic: topic || onboarding.tema,
        lastCourseId: selectedCourse ? String(selectedCourse.id) : "",
        lastLessonId: selectedLesson ? String(selectedLesson.id) : "",
        chatSummary: "Memória criada a partir da conversa com o Tutor IA.",
        lastTutorPlan: loggedMemory.lastFormat,
      }),
      ...existingMemory,
      ...cleanedNextState,
      email: memoryEmail,
      updatedAt: new Date().toISOString(),
    };

    writeTutorMemory(nextMemory);
    setTutorMemory(nextMemory);
    return nextMemory;
  }

  function updateTutorMemoryFromMessage(
    value: string,
    nextState: Partial<TutorMemory> = {},
  ) {
    const preferredStudyTime = detectPreferredStudyTime(value);
    const preferredFormat = detectStudyFormatPreference(value);
    const nextEnergy = detectEnergy(value);

    return saveTutorMemory({
      ...nextState,
      preferredStudyTime:
        preferredStudyTime ?? nextState.preferredStudyTime ?? undefined,
      energyProfile:
        nextEnergy === "low"
          ? "low"
          : nextState.energyProfile ?? tutorMemory?.energyProfile ?? userEnergy,
      lastTutorPlan:
        preferredFormat ?? nextState.lastTutorPlan ?? tutorMemory?.lastTutorPlan,
      chatSummary:
        nextState.chatSummary ?? `Última preferência informada: "${value}".`,
    });
  }

  async function askTutorAi({
    message,
    step,
    context,
    fallbackMessage,
    userEnergyOverride,
    hasSeenPlanOverride,
    hasSeenPreviewOverride,
    hasInteractedAfterPlanOverride,
    isLoggedInOverride,
  }: {
    message: string;
    step: ConversationStep;
    context?: Partial<OnboardingState>;
    fallbackMessage: string;
    userEnergyOverride?: UserEnergy;
    hasSeenPlanOverride?: boolean;
    hasSeenPreviewOverride?: boolean;
    hasInteractedAfterPlanOverride?: boolean;
    isLoggedInOverride?: boolean;
  }) {
    setIsThinking(true);
    setThinkingStep("Consultando tutor IA...");

    try {
      return await fetchTutorReply({
        message,
        currentStep: step,
        onboarding: { ...onboarding, ...context },
        fallbackMessage,
        isLoggedIn: isLoggedInOverride ?? isLoggedIn,
        userEnergy: userEnergyOverride ?? userEnergy,
        hasSeenPlan: hasSeenPlanOverride ?? planReady,
        hasSeenPreview: hasSeenPreviewOverride ?? hasSeenPreview,
        hasInteractedAfterPlan:
          hasInteractedAfterPlanOverride ?? hasInteractedAfterPlan,
      });
    } finally {
      setThinkingStep("");
      setIsThinking(false);
    }
  }

  async function typeTutorMessage(text: string) {
    setIsTutorTyping(true);
    setDisplayedTutorMessage("");

    const parts = text.split(/(\s+)/);
    let nextText = "";

    for (const part of parts) {
      nextText += part;
      setDisplayedTutorMessage(nextText);
      await sleep(part.trim() ? 42 : 12);
    }

    setDisplayedTutorMessage(text);
    setMessages((current) => [...current, { role: "tutor", text }]);
    setIsTutorTyping(false);
    focusTutorInput();
  }

  async function showThinkingSteps(steps: string[], delay = 520) {
    setIsThinking(true);

    for (const step of steps) {
      setThinkingStep(step);
      await sleep(delay);
    }

    setThinkingStep("");
    setIsThinking(false);
  }

  async function revealCourseCards(total: number) {
    setVisibleCourseCount(0);

    for (let count = 1; count <= Math.min(3, total); count += 1) {
      await sleep(190);
      setVisibleCourseCount(count);
    }
  }

  async function loadCourses(value: string) {
    setIsLoadingCourses(true);
    setVisibleCourseCount(0);
    setCourses([]);
    setSelectedCourse(null);
    setLessons([]);
    setSelectedLesson(null);
    setApiError("");
    const semanticCourses = createCoursesFromLearningResults(
      searchLearningContent(value),
    );
    const fallbackCourseSet = semanticCourses.length
      ? semanticCourses
      : fallbackCourses;

    try {
      const realCourses = await fetchCoursesByTopic(value);
      const nextCourses = realCourses.length ? realCourses : fallbackCourseSet;
      setCourses(nextCourses);
      setSelectedCourse(nextCourses[0]);

      if (!realCourses.length) {
        setApiError(
          semanticCourses.length
            ? "Não encontrei curso público exato. Usei busca semântica local."
            : "Não encontrei cursos públicos agora. Usando fallback.",
        );
      }

      return nextCourses;
    } catch {
      setCourses(fallbackCourseSet);
      setSelectedCourse(fallbackCourseSet[0]);
      setApiError(
        semanticCourses.length
          ? "API indisponível. Usei a busca semântica local."
          : "API indisponível. Mantive um fallback para a demo.",
      );
      return fallbackCourseSet;
    } finally {
      setIsLoadingCourses(false);
    }
  }

  async function loadLessons(course: Course) {
    if (course.semanticLessons?.length) {
      const focusedLesson = pickFocusedLesson(course.semanticLessons);
      setLessons(course.semanticLessons);
      setSelectedLesson(focusedLesson);
      return {
        lessons: course.semanticLessons,
        selectedLesson: focusedLesson,
      };
    }

    if (course.source === "mock") {
      setLessons(fallbackLessons);
      setSelectedLesson(fallbackLessons[0]);
      return {
        lessons: fallbackLessons,
        selectedLesson: fallbackLessons[0],
      };
    }

    setIsLoadingLessons(true);
    setLessons([]);
    setSelectedLesson(null);
    setApiError("");

    try {
      const realLessons = await fetchLessonsByCourse(course.id);
      const nextLessons = realLessons.length ? realLessons : fallbackLessons;
      const lessonWithVideo =
        nextLessons.find((lesson) => getVideoSource(lesson)) ?? nextLessons[0];
      setLessons(nextLessons);
      setSelectedLesson(lessonWithVideo);

      if (!realLessons.length) {
        setApiError("Não encontrei aulas públicas agora. Usando fallback.");
      }

      return {
        lessons: nextLessons,
        selectedLesson: lessonWithVideo,
      };
    } catch {
      setLessons(fallbackLessons);
      setSelectedLesson(fallbackLessons[0]);
      setApiError("Não consegui buscar aulas reais. Mantive o plano visual.");
      return {
        lessons: fallbackLessons,
        selectedLesson: fallbackLessons[0],
      };
    } finally {
      setIsLoadingLessons(false);
    }
  }

  function resetVisitorExperience() {
    setCurrentStep("topic");
    setCurrentExpectedInput("topic");
    setTopic("");
    setName("");
    setEmail("");
    setAvailableTime("");
    setPanelMode("initial");
    setInputValue("");
    setCourses(fallbackCourses);
    setSelectedCourse(null);
    setLessons([]);
    setSelectedLesson(null);
    setVisibleCourseCount(0);
    setUserEnergy("normal");
    setLoggedProgressPercent(loggedStudentProgress.progressPercent);
    setApiError("");
    setPlanReady(false);
    setHasInteractedAfterPlan(false);
    setHasSeenPreview(false);
    setPendingAction(null);
    setPendingSuggestedTime(null);
    setShowLoginOffer(false);
    setTutorMemory(null);
    setOnboarding(initialOnboarding);
    setLoggedMemory(initialLoggedMemory);
    setMessages(initialMessages);
    setTutorDecision(
      buildTutorDecision({
        topic: "",
        availableTime: "15 minutos",
        userEnergy: "normal",
        selectedCourse: fallbackCourses[0],
        selectedLesson: null,
      }),
    );
    setDisplayedTutorMessage(initialTutorMessage);
  }

  function openLoginModal() {
    if (isBusy || isLoggingIn) {
      return;
    }

    setLoginError("");
    setLoginEmail(email || onboarding.email || loginEmail);
    setLoginPassword("");
    setShowLoginOffer(false);
    setIsLoginModalOpen(true);
  }

  function handleLogout() {
    if (isBusy) {
      return;
    }

    setIsLoggedIn(false);
    setLoggedStudentMode(false);
    setAuthApiKey("");
    setAuthUser(null);
    setIsLoginModalOpen(false);
    setLoginPassword("");
    setShowLoginOffer(false);
    resetVisitorExperience();
  }

  async function applyAuthenticatedContext(user: CefisUser | null) {
    const userName = getUserName(user);
    const userEmail = user?.email?.trim() || loginEmail.trim() || getUserEmail(user);
    const loadedMemory = loadOrCreateTutorMemory({
      email: userEmail,
      name: userName,
      cefisUserId: user?.id != null ? String(user.id) : undefined,
      preferredStudyTime: availableTime || loggedMemory.chosenTime,
      energyProfile: userEnergy,
      mainGoal: onboarding.objetivo || topic || "continuar estudos na CEFIS",
      lastTopic: topic || onboarding.tema || loggedStudentProgress.courseTitle,
      lastCourseId: selectedCourse
        ? String(selectedCourse.id)
        : String(loggedProgressCourse.id),
      lastLessonId: selectedLesson ? String(selectedLesson.id) : "",
      chatSummary: "Memória carregada após login CEFIS.",
      lastTutorPlan: loggedMemory.lastFormat,
    });
    const memoryTime = loadedMemory.preferredStudyTime || "20 minutos";
    const memoryEnergy = loadedMemory.energyProfile || "normal";

    setIsLoggedIn(true);
    setLoggedStudentMode(false);
    setCurrentExpectedInput("free_chat");
    setName(userName);
    setEmail(userEmail);
    setTutorMemory(loadedMemory);
    setUserEnergy(memoryEnergy);
    updateOnboarding({ nome: userName, email: userEmail });

    if (planReady) {
      const currentCourse = getRecommendedCourse(selectedCourse, courses);
      const currentLessonTitle =
        selectedLesson?.title ?? loggedMemory.currentLessonTitle;

      updateLoggedMemory({
        currentLessonTitle,
        chosenTime: availableTime || memoryTime,
        activePlan: currentCourse.title,
        lastRecommendation: "continuar o plano recém-montado",
        lastFormat: "acompanhamento no Tutor",
      });
      updateOnboarding({
        tema: topic || currentCourse.title,
        ritmo: availableTime || loggedMemory.chosenTime,
        cursoSelecionado: currentCourse.title,
        aulaAtual: currentLessonTitle,
        progressoAtual: `${loggedStudentProgress.progressPercent}% concluído`,
        planoAtivo: currentCourse.title,
        ultimaRecomendacao: "continuar o plano recém-montado",
        ultimoFormato: "acompanhamento no Tutor",
      });
      saveTutorMemory({
        email: userEmail,
        name: userName,
        cefisUserId: user?.id != null ? String(user.id) : undefined,
        preferredStudyTime: availableTime || memoryTime,
        energyProfile: memoryEnergy,
        mainGoal: onboarding.objetivo || topic,
        lastTopic: topic || currentCourse.title,
        lastCourseId: String(currentCourse.id),
        lastLessonId: selectedLesson ? String(selectedLesson.id) : "",
        chatSummary: "Plano conectado à conta CEFIS.",
        lastTutorPlan: "acompanhamento no Tutor",
      });
      await typeTutorMessage(
        `Pronto, ${userName}. Seu plano agora está conectado à sua conta CEFIS. Posso continuar por aqui com acompanhamento, revisão e adaptação do próximo passo.`,
      );
      return;
    }

    if (topic || currentStep === "name" || currentStep === "email") {
      const currentCourse = getRecommendedCourse(selectedCourse, courses);
      const currentLessonTitle =
        selectedLesson?.title ?? loggedMemory.currentLessonTitle;
      const loggedTime = availableTime || memoryTime;

      setAvailableTime(loggedTime);
      setPanelMode("logged");
      setCurrentStep("logged");
      setCurrentExpectedInput("free_chat");
      setLoggedStudentMode(true);
      setPlanReady(true);
      updateLoggedMemory({
        currentLessonTitle,
        chosenTime: loggedTime,
        activePlan: currentCourse.title,
        lastRecommendation: "continuar a trilha com base no progresso",
        lastFormat: "resumo em 3 passos",
      });
      updateOnboarding({
        tema: topic || currentCourse.title,
        ritmo: loggedTime,
        cursoSelecionado: currentCourse.title,
        objetivo: "acompanhar progresso do aluno logado",
        aulaAtual: currentLessonTitle,
        progressoAtual: `${loggedStudentProgress.progressPercent}% concluído`,
        planoAtivo: currentCourse.title,
        ultimaRecomendacao: "continuar a trilha com base no progresso",
        ultimoFormato: "resumo em 3 passos",
      });
      setPendingAction("continue_lesson");
      saveTutorMemory({
        email: userEmail,
        name: userName,
        cefisUserId: user?.id != null ? String(user.id) : undefined,
        preferredStudyTime: loggedTime,
        energyProfile: memoryEnergy,
        mainGoal: topic || onboarding.objetivo,
        lastTopic: topic || currentCourse.title,
        lastCourseId: String(currentCourse.id),
        lastLessonId: selectedLesson ? String(selectedLesson.id) : "",
        chatSummary: "Aluno logado continuou a partir do contexto parcial.",
        lastTutorPlan: "resumo em 3 passos",
      });
      await typeTutorMessage(
        buildLoggedMentorMessage({
          name: userName,
          courseTitle: currentCourse.title,
          lessonTitle: currentLessonTitle,
          progressPercent: loggedStudentProgress.progressPercent,
          time: loggedTime,
          recommendation: "continuar a trilha com base no progresso",
          format: "resumo em 3 passos",
        }),
      );
      return;
    }

    const memoryTopic = loadedMemory.lastTopic || loggedStudentProgress.courseTitle;
    const memoryCourseTitle = loadedMemory.lastTopic || loggedProgressCourse.title;
    const memoryLastFormat = getMemoryFormatLabel(loadedMemory);

    setTopic(memoryTopic);
    setAvailableTime(memoryTime);
    setPanelMode("logged");
    setCurrentStep("logged");
    setCurrentExpectedInput("free_chat");
    setLoggedStudentMode(true);
    setInputValue("");
    setUserEnergy(memoryEnergy);
    setCourses([loggedProgressCourse, ...fallbackCourses]);
    setSelectedCourse(loggedProgressCourse);
    setLessons([]);
    setSelectedLesson(null);
    setPlanReady(true);
    setHasInteractedAfterPlan(false);
    setHasSeenPreview(false);
    setLoggedMemory({
      currentLessonTitle: loggedStudentProgress.lessonTitle,
      chosenTime: memoryTime,
      activePlan: memoryCourseTitle,
      lastRecommendation: "revisar os pontos críticos da apuração fiscal",
      lastFormat: memoryLastFormat,
    });
    setOnboarding({
      tema: memoryTopic,
      nome: userName,
      email: userEmail,
      ritmo: memoryTime,
      cursoSelecionado: loggedProgressCourse.title,
      objetivo: loadedMemory.mainGoal || "continuar progresso real na CEFIS",
      aulaAtual: loggedStudentProgress.lessonTitle,
      progressoAtual: `${loggedStudentProgress.progressPercent}% concluído`,
      planoAtivo: memoryCourseTitle,
      ultimaRecomendacao: "revisar os pontos críticos da apuração fiscal",
      ultimoFormato: memoryLastFormat,
    });
    setTutorDecision(
      buildTutorDecision({
        topic: memoryTopic,
        availableTime: memoryTime,
        userEnergy: memoryEnergy,
        selectedCourse: loggedProgressCourse,
        selectedLesson: null,
      }),
    );
    await showThinkingSteps([
      "Carregando seu progresso...",
      "Lendo seu histórico de estudos...",
    ]);
    const fallbackReply = buildLoggedMentorMessage({
      name: userName,
      courseTitle: loggedProgressCourse.title,
      lessonTitle: loggedStudentProgress.lessonTitle,
      progressPercent: loggedStudentProgress.progressPercent,
      time: memoryTime,
      recommendation: "revisar os pontos críticos da apuração fiscal",
      format: memoryLastFormat,
    });
    saveTutorMemory({
      email: userEmail,
      name: userName,
      cefisUserId: user?.id != null ? String(user.id) : undefined,
      preferredStudyTime: memoryTime,
      energyProfile: memoryEnergy,
      mainGoal: loadedMemory.mainGoal || "continuar progresso real na CEFIS",
      lastTopic: memoryTopic,
      lastCourseId: String(loggedProgressCourse.id),
      lastLessonId: loadedMemory.lastLessonId,
      chatSummary: "Memória usada para personalizar entrada no modo logado.",
      lastTutorPlan: memoryLastFormat,
    });
    setPendingAction(
      memoryLastFormat.includes("resumo") ? "review_5min" : "continue_lesson",
    );
    await typeTutorMessage(
      loadedMemory.updatedAt
        ? buildMemoryBasedLoggedPrompt(userName, loadedMemory)
        : fallbackReply,
    );
  }

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoggingIn || !loginEmail.trim() || !loginPassword) {
      return;
    }

    setIsLoggingIn(true);
    setLoginError("");

    try {
      const loginResult = await loginToCefis(
        loginEmail.trim(),
        loginPassword,
      );
      const profileUser = await fetchCefisMe(loginResult.apiKey).catch(
        () => null,
      );
      const nextUser = {
        ...(loginResult.user ?? {}),
        ...(profileUser ?? {}),
      };

      setAuthApiKey(loginResult.apiKey);
      setAuthUser(nextUser);
      setIsLoginModalOpen(false);
      setLoginPassword("");
      await applyAuthenticatedContext(nextUser);
    } catch (error) {
      setLoginError(
        error instanceof Error
          ? error.message
          : "Não foi possível entrar agora.",
      );
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleContinueInTutor() {
    if (isBusy) {
      return;
    }

    const recommendedCourse = getRecommendedCourse(selectedCourse, courses);
    const tutorCourse =
      recommendedCourse.source === "mock"
        ? loggedProgressCourse
        : recommendedCourse;
    const currentLessonTitle =
      selectedLesson?.title ?? loggedMemory.currentLessonTitle;
    const loggedTime = availableTime || loggedMemory.chosenTime;

    setLoggedStudentMode(true);
    setIsLoggedIn(true);
    setPanelMode("logged");
    setCurrentStep("logged");
    setCurrentExpectedInput("free_chat");
    setPlanReady(true);
    setHasInteractedAfterPlan(false);
    setSelectedCourse(tutorCourse);
    setCourses([
      tutorCourse,
      ...courses.filter((course) => course.id !== tutorCourse.id),
    ]);
    updateLoggedMemory({
      currentLessonTitle,
      chosenTime: loggedTime,
      activePlan: tutorCourse.title,
      lastRecommendation: "continuar o plano conectado à conta",
      lastFormat: "acompanhamento no Tutor",
    });
    updateOnboarding({
      nome: name || getUserName(authUser),
      email: email || getUserEmail(authUser),
      tema: topic || tutorCourse.title,
      ritmo: loggedTime,
      cursoSelecionado: tutorCourse.title,
      objetivo: "continuar acompanhamento no Tutor IA",
      aulaAtual: currentLessonTitle,
      progressoAtual: `${loggedStudentProgress.progressPercent}% concluído`,
      planoAtivo: tutorCourse.title,
      ultimaRecomendacao: "continuar o plano conectado à conta",
      ultimoFormato: "acompanhamento no Tutor",
    });
    saveTutorMemory({
      name: name || getUserName(authUser),
      email: email || getUserEmail(authUser),
      preferredStudyTime: loggedTime,
      energyProfile: userEnergy,
      mainGoal: "continuar acompanhamento no Tutor IA",
      lastTopic: topic || tutorCourse.title,
      lastCourseId: String(tutorCourse.id),
      lastLessonId: selectedLesson ? String(selectedLesson.id) : "",
      chatSummary: "Aluno escolheu continuar no Tutor IA após o CTA.",
      lastTutorPlan: "acompanhamento no Tutor",
    });
    setPendingAction("continue_lesson");
    await typeTutorMessage(
      "Agora posso acompanhar sua jornada por aqui. Posso continuar pela aula recomendada?",
    );
  }

  async function openNextLesson() {
    if (isBusy) {
      return;
    }

    const currentLoggedCourse = getRecommendedCourse(selectedCourse, courses);
    let availableLessons = lessons;

    await showThinkingSteps([
      "Verificando aula atual...",
      "Abrindo próxima aula...",
    ]);

    if (!availableLessons.length) {
      const lessonResult = await loadLessons(currentLoggedCourse);
      availableLessons = lessonResult.lessons;
    }

    if (!availableLessons.length) {
      setPendingAction(null);
      await typeTutorMessage(
        "Não encontrei uma próxima aula disponível agora. Mantive a aula atual em foco.",
      );
      return;
    }

    const currentLessonIndex = selectedLesson
      ? availableLessons.findIndex(
          (lesson) => String(lesson.id) === String(selectedLesson.id),
        )
      : -1;
    const nextLessonIndex = currentLessonIndex >= 0 ? currentLessonIndex + 1 : 0;

    if (nextLessonIndex >= availableLessons.length) {
      setPendingAction(null);
      await typeTutorMessage(
        "Você chegou ao fim das aulas disponíveis deste curso. Posso montar uma revisão ou buscar uma trilha próxima.",
      );
      return;
    }

    const nextLesson = availableLessons[nextLessonIndex];
    const currentTime = availableTime || loggedMemory.chosenTime || "20 minutos";
    const nextProgressPercent = Math.min(100, loggedProgressPercent + 8);
    const nextDecision: TutorDecision = {
      ...buildTutorDecision({
        topic: currentLoggedCourse.title,
        availableTime: currentTime,
        userEnergy,
        selectedCourse: currentLoggedCourse,
        selectedLesson: nextLesson,
        adaptationText: "abrir próxima aula",
      }),
      tutorMessage: `A próxima aula recomendada é ${nextLesson.title}.`,
      recommendedCourseId: String(currentLoggedCourse.id),
      recommendedLessonId: String(nextLesson.id),
      planSteps: [
        "Assistir aula em foco",
        "Anotar pontos centrais",
        "Perguntar ao tutor",
      ],
    };

    setAvailableTime(currentTime);
    setLessons(availableLessons);
    setSelectedLesson(nextLesson);
    setSelectedCourse(currentLoggedCourse);
    setPanelMode("logged");
    setCurrentStep("logged");
    setCurrentExpectedInput("free_chat");
    setLoggedStudentMode(true);
    setPlanReady(true);
    setHasInteractedAfterPlan(false);
    setPendingAction(null);
    setTutorDecision(nextDecision);
    setLoggedProgressPercent(nextProgressPercent);
    updateLoggedMemory({
      currentLessonTitle: nextLesson.title,
      chosenTime: currentTime,
      activePlan: currentLoggedCourse.title,
      lastRecommendation: "continuar pela próxima aula",
      lastFormat: getVideoSource(nextLesson) ? "vídeo guiado" : "aula guiada",
    });
    updateOnboarding({
      tema: currentLoggedCourse.title,
      ritmo: currentTime,
      cursoSelecionado: currentLoggedCourse.title,
      objetivo: "abrir próxima aula",
      aulaAtual: nextLesson.title,
      progressoAtual: `${nextProgressPercent}% concluído`,
      planoAtivo: currentLoggedCourse.title,
      ultimaRecomendacao: "continuar pela próxima aula",
      ultimoFormato: getVideoSource(nextLesson) ? "vídeo guiado" : "aula guiada",
    });
    saveTutorMemory({
      preferredStudyTime: currentTime,
      energyProfile: userEnergy,
      mainGoal: onboarding.objetivo || "continuar pela próxima aula",
      lastTopic: currentLoggedCourse.title,
      lastCourseId: String(currentLoggedCourse.id),
      lastLessonId: String(nextLesson.id),
      chatSummary: `Aula em foco alterada para: ${nextLesson.title}.`,
      lastTutorPlan: nextDecision.planSteps.join(" · "),
    });
    await typeTutorMessage(
      `A próxima aula recomendada é ${nextLesson.title}.`,
    );
  }

  async function executePendingAction(action: PendingAction) {
    if (isBusy) {
      return;
    }

    if (action === "continue_lesson" || action === "open_next_lesson") {
      await openNextLesson();
      return;
    }

    const currentLoggedCourse = getRecommendedCourse(selectedCourse, courses);
    let availableLessons = lessons;
    const currentLesson = selectedLesson;

    if (!availableLessons.length) {
      availableLessons = fallbackLessons;
    }

    const nextLesson =
      currentLesson ?? availableLessons[0] ?? fallbackLessons[0];
    const nextLessonTitle =
      nextLesson?.title ?? loggedMemory.currentLessonTitle;
    const actionCopy: Record<
      PendingAction,
      {
        time: string;
        recommendation: string;
        format: string;
        message: string;
        planSteps: string[];
      }
    > = {
      continue_lesson: {
        time: availableTime || loggedMemory.chosenTime || "20 minutos",
        recommendation: "continuar pela próxima aula recomendada",
        format: getVideoSource(nextLesson) ? "vídeo guiado" : "aula guiada",
        message: "Perfeito. Vou continuar pela próxima aula recomendada.",
        planSteps: [
          "Abrir aula recomendada",
          "Marcar pontos centrais",
          "Trazer dúvida para o tutor",
        ],
      },
      open_next_lesson: {
        time: availableTime || loggedMemory.chosenTime || "20 minutos",
        recommendation: "abrir a próxima aula",
        format: getVideoSource(nextLesson) ? "vídeo guiado" : "aula guiada",
        message: `Pronto, abri a próxima aula: ${nextLessonTitle}.`,
        planSteps: [
          "Assistir aula em foco",
          "Anotar pontos centrais",
          "Perguntar ao tutor",
        ],
      },
      review_5min: {
        time: "5 minutos",
        recommendation: "fazer uma revisão rápida dos conceitos centrais",
        format: "revisão de 5 minutos",
        message:
          "Perfeito. Transformei o plano em uma revisão rápida de 5 minutos.",
        planSteps: [
          "Revisar conceitos centrais",
          "Ver exemplo prático",
          "Responder 1 pergunta",
        ],
      },
      answer_questions: {
        time: loggedMemory.chosenTime || "15 minutos",
        recommendation: "destravar dúvidas da aula atual",
        format: "perguntas objetivas",
        message:
          "Perfeito. Vou manter o foco na aula atual. Me mande a dúvida que você quer destravar.",
        planSteps: [
          "Ler sua dúvida",
          "Explicar no contexto da aula",
          "Sugerir próximo passo",
        ],
      },
      build_today_plan: {
        time: "30 minutos",
        recommendation: "montar o plano de hoje a partir do progresso atual",
        format: "roteiro de estudo",
        message:
          "Perfeito. Montei um plano do dia usando seu progresso e a aula em que você parou.",
        planSteps: [
          "Retomar aula atual",
          "Revisar pontos críticos",
          "Fechar com uma pergunta",
        ],
      },
    };
    const selectedAction = actionCopy[action];
    const nextDecision: TutorDecision = {
      ...buildTutorDecision({
        topic: currentLoggedCourse.title,
        availableTime: selectedAction.time,
        userEnergy,
        selectedCourse: currentLoggedCourse,
        selectedLesson: nextLesson,
        adaptationText: selectedAction.recommendation,
      }),
      tutorMessage: selectedAction.message,
      recommendedCourseId: String(currentLoggedCourse.id),
      recommendedLessonId: String(nextLesson?.id ?? ""),
      planSteps: selectedAction.planSteps,
    };
    const mentorMessage = buildLoggedMentorMessage({
      name: name || getUserName(authUser),
      courseTitle: currentLoggedCourse.title,
      lessonTitle: nextLessonTitle,
      progressPercent: loggedStudentProgress.progressPercent,
      time: selectedAction.time,
      recommendation: selectedAction.recommendation,
      format: selectedAction.format,
    });

    setAvailableTime(selectedAction.time);
    setTopic(currentLoggedCourse.title);
    setLessons(availableLessons);
    setCourses([
      currentLoggedCourse,
      ...courses.filter((course) => course.id !== currentLoggedCourse.id),
    ]);
    setSelectedCourse(currentLoggedCourse);
    setSelectedLesson(nextLesson);
    setPanelMode("logged");
    setCurrentStep("logged");
    setCurrentExpectedInput("free_chat");
    setLoggedStudentMode(true);
    setPlanReady(true);
    setHasInteractedAfterPlan(false);
    setPendingAction(null);
    setTutorDecision(nextDecision);
    updateLoggedMemory({
      currentLessonTitle: nextLessonTitle,
      chosenTime: selectedAction.time,
      activePlan: currentLoggedCourse.title,
      lastRecommendation: selectedAction.recommendation,
      lastFormat: selectedAction.format,
    });
    updateOnboarding({
      tema: currentLoggedCourse.title,
      ritmo: selectedAction.time,
      cursoSelecionado: currentLoggedCourse.title,
      objetivo: selectedAction.recommendation,
      aulaAtual: nextLessonTitle,
      progressoAtual: `${loggedStudentProgress.progressPercent}% concluído`,
      planoAtivo: currentLoggedCourse.title,
      ultimaRecomendacao: selectedAction.recommendation,
      ultimoFormato: selectedAction.format,
    });
    saveTutorMemory({
      preferredStudyTime: selectedAction.time,
      energyProfile: userEnergy,
      mainGoal: onboarding.objetivo || selectedAction.recommendation,
      lastTopic: currentLoggedCourse.title,
      lastCourseId: String(currentLoggedCourse.id),
      lastLessonId: nextLesson ? String(nextLesson.id) : "",
      chatSummary: `Ação executada no workspace: ${selectedAction.recommendation}.`,
      lastTutorPlan: selectedAction.format,
    });
    await showThinkingSteps(["Atualizando workspace...", "Aplicando ação..."]);
    await typeTutorMessage(`${selectedAction.message}\n${mentorMessage}`);
  }

  async function handleLoggedAction(action: LoggedAction) {
    await executePendingAction(getPendingActionForLoggedAction(action));
  }

  async function handleAdjustPlanCTA() {
    if (isBusy) {
      return;
    }

    setHasInteractedAfterPlan(false);
    if (isLoggedIn || loggedStudentMode) {
      setCurrentStep("logged");
      setCurrentExpectedInput("free_chat");
      setPanelMode("logged");
      await typeTutorMessage(
        "Certo. Vou ajustar o plano ativo sem perder a aula atual, seu progresso e o tempo de hoje. Me diga qual adaptação faz sentido agora.",
      );
      return;
    }

    await typeTutorMessage(
      "Claro. Me diga o que você quer ajustar: ritmo, cansaço, prática ou começar do zero.",
    );
  }

  async function handleContinueWithoutLogin() {
    if (isBusy) {
      return;
    }

    setShowLoginOffer(false);
    setCurrentExpectedInput("time");
    await typeTutorMessage(
      "Tudo bem. Quanto tempo você tem disponível agora para estudar?",
    );
  }

  function getPlanStepsForIntent(intentDecision: UserIntentDecision) {
    if (intentDecision.format === "video") {
      return ["Assistir vídeo recomendado", "Anotar pontos centrais", "Tirar dúvida no tutor"];
    }

    if (intentDecision.format === "audio") {
      return ["Ouvir resumo leve", "Marcar ideia principal", "Retomar quando tiver energia"];
    }

    if (intentDecision.format === "exercise") {
      return ["Ver exemplo prático", "Resolver 1 exercício", "Revisar resposta com tutor"];
    }

    return ["Ler resumo direto", "Ver exemplo aplicado", "Responder 1 pergunta"];
  }

  function getFormatLabelFromDecision(intentDecision: UserIntentDecision) {
    const labels: Record<StudyFormat, string> = {
      video: "vídeo curto",
      summary: "resumo direto",
      exercise: "exercício guiado",
      audio: "áudio leve",
    };

    return intentDecision.format ? labels[intentDecision.format] : "plano guiado";
  }

  async function handleLoggedTopicIntent(
    value: string,
    intentDecision: UserIntentDecision,
    nextEnergy: UserEnergy,
  ) {
    const requestedTopic = intentDecision.topic?.trim() || getTheme(value);
    const previousCourses = courses;
    const previousCourse = selectedCourse;
    const previousLessons = lessons;
    const previousLesson = selectedLesson;
    const previousTopic = topic;
    const currentTime = availableTime || loggedMemory.chosenTime || "20 minutos";
    const semanticResults = searchLearningContent(requestedTopic, {
      preferVideo: intentDecision.format === "video",
    });
    const semanticCourses = createCoursesFromLearningResults(semanticResults);
    const bestSemanticResult = semanticResults[0];
    const semanticLesson = bestSemanticResult
      ? createLessonFromLearningContent(bestSemanticResult)
      : null;

    setPendingAction(null);
    await showThinkingSteps([
      "Entendendo novo pedido...",
      "Buscando conteúdos relacionados...",
      "Atualizando aula em foco...",
    ]);

    let realCourses: Course[] = [];
    const searchTerms = Array.from(
      new Set(
        [
          requestedTopic,
          bestSemanticResult?.courseTitle,
          bestSemanticResult?.category,
        ].filter(Boolean) as string[],
      ),
    );

    for (const searchTerm of searchTerms) {
      try {
        realCourses = await fetchCoursesByTopic(searchTerm);
      } catch {
        realCourses = [];
      }

      if (realCourses.length) {
        break;
      }
    }

    const nextCourses = realCourses.length ? realCourses : semanticCourses;

    if (!nextCourses.length) {
      setCourses(previousCourses);
      setSelectedCourse(previousCourse);
      setLessons(previousLessons);
      setSelectedLesson(previousLesson);
      setTopic(previousTopic);
      updateTutorMemoryFromMessage(value, {
        lastTopic: requestedTopic,
        chatSummary: `Pedido sem conteúdo relacionado encontrado: ${requestedTopic}.`,
      });
      await typeTutorMessage(
        `Não encontrei um conteúdo direto sobre ${requestedTopic} agora. Posso procurar por áreas próximas, como gestão tributária, regimes fiscais, contabilidade ou rotinas fiscais.`,
      );
      return;
    }

    const nextCourse = getRecommendedCourse(nextCourses[0], nextCourses);
    const lessonResult = await loadLessons(nextCourse);
    const semanticLessons = semanticLesson ? [semanticLesson] : [];
    const apiLessons = lessonResult.lessons.filter(
      (lesson) => lesson.source === "api",
    );
    const nextLessons = apiLessons.length
      ? lessonResult.lessons
      : semanticLessons.length
        ? semanticLessons
        : lessonResult.lessons;
    const focusedLesson =
      pickFocusedLesson(nextLessons, intentDecision.format) ??
      lessonResult.selectedLesson;
    const focusedLessonTitle =
      focusedLesson?.title ?? loggedMemory.currentLessonTitle;
    const nextPlanSteps = getPlanStepsForIntent(intentDecision);
    const formatLabel = getFormatLabelFromDecision(intentDecision);
    const foundTitle = bestSemanticResult?.title ?? focusedLessonTitle;
    const videoRequestedWithoutVideo =
      intentDecision.format === "video" && !getVideoSource(focusedLesson);
    const tutorReply = videoRequestedWithoutVideo
      ? `Encontrei conteúdos relacionados a ${requestedTopic}. Ainda não achei um vídeo público direto, então troquei o foco para ${foundTitle} e deixei um plano guiado para começar agora.`
      : `Encontrei conteúdos relacionados a ${requestedTopic}. Vou trocar o foco para ${foundTitle}.`;
    const nextDecision: TutorDecision = {
      ...buildTutorDecision({
        topic: requestedTopic,
        availableTime: currentTime,
        userEnergy: nextEnergy,
        selectedCourse: nextCourse,
        selectedLesson: focusedLesson,
        adaptationText: value,
      }),
      tutorMessage: tutorReply,
      recommendedCourseId: String(nextCourse.id),
      recommendedLessonId: String(focusedLesson?.id ?? ""),
      planSteps: nextPlanSteps,
    };

    setTopic(requestedTopic);
    setAvailableTime(currentTime);
    setCourses(nextCourses);
    setSelectedCourse(nextCourse);
    setLessons(nextLessons);
    setSelectedLesson(focusedLesson);
    setTutorDecision(nextDecision);
    setPanelMode("logged");
    setCurrentStep("logged");
    setCurrentExpectedInput("free_chat");
    setLoggedStudentMode(true);
    setApiError(
      realCourses.length
        ? ""
        : "Usei a busca semântica local para encontrar conteúdos próximos.",
    );
    updateLoggedMemory({
      currentLessonTitle: focusedLessonTitle,
      chosenTime: currentTime,
      activePlan: nextCourse.title,
      lastRecommendation: `estudar ${requestedTopic}`,
      lastFormat: formatLabel,
    });
    updateOnboarding({
      tema: requestedTopic,
      ritmo: currentTime,
      cursoSelecionado: nextCourse.title,
      objetivo: value,
      aulaAtual: focusedLessonTitle,
      planoAtivo: nextCourse.title,
      ultimaRecomendacao: `estudar ${requestedTopic}`,
      ultimoFormato: formatLabel,
    });
    updateTutorMemoryFromMessage(value, {
      preferredStudyTime: currentTime,
      energyProfile: nextEnergy,
      mainGoal: value,
      lastTopic: requestedTopic,
      lastCourseId: String(nextCourse.id),
      lastLessonId: focusedLesson ? String(focusedLesson.id) : "",
      chatSummary: `Novo foco solicitado: ${requestedTopic}; foco visual atualizado para ${foundTitle}.`,
      lastTutorPlan: nextPlanSteps.join(" · "),
    });
    await typeTutorMessage(tutorReply);
  }

  async function handleLoggedFormatIntent(
    value: string,
    intentDecision: UserIntentDecision,
    nextEnergy: UserEnergy,
  ) {
    const currentLoggedCourse = getRecommendedCourse(selectedCourse, courses);
    const currentTime = availableTime || loggedMemory.chosenTime || "20 minutos";
    let nextLessons = lessons;
    let nextLesson = selectedLesson;

    setPendingAction(null);

    if (intentDecision.format === "video" && !nextLessons.some(getVideoSource)) {
      const lessonResult = await loadLessons(currentLoggedCourse);
      nextLessons = lessonResult.lessons;
      nextLesson = lessonResult.selectedLesson;
    }

    if (intentDecision.format === "video") {
      nextLesson =
        nextLessons.find((lesson) => getVideoSource(lesson)) ??
        nextLesson ??
        fallbackLessons[0];
    }

    const nextPlanSteps = getPlanStepsForIntent(intentDecision);
    const formatLabel = getFormatLabelFromDecision(intentDecision);
    const nextDecision: TutorDecision = {
      ...buildTutorDecision({
        topic: topic || currentLoggedCourse.title,
        availableTime: currentTime,
        userEnergy: nextEnergy,
        selectedCourse: currentLoggedCourse,
        selectedLesson: nextLesson,
        adaptationText: value,
      }),
      tutorMessage: intentDecision.reply,
      recommendedCourseId: String(currentLoggedCourse.id),
      recommendedLessonId: String(nextLesson?.id ?? ""),
      planSteps: nextPlanSteps,
    };

    setLessons(nextLessons);
    setSelectedLesson(nextLesson);
    setTutorDecision(nextDecision);
    updateLoggedMemory({
      currentLessonTitle: nextLesson?.title ?? loggedMemory.currentLessonTitle,
      chosenTime: currentTime,
      activePlan: currentLoggedCourse.title,
      lastRecommendation: `adaptar para ${formatLabel}`,
      lastFormat: formatLabel,
    });
    updateTutorMemoryFromMessage(value, {
      preferredStudyTime: currentTime,
      energyProfile: nextEnergy,
      lastTopic: topic || currentLoggedCourse.title,
      lastCourseId: String(currentLoggedCourse.id),
      lastLessonId: nextLesson ? String(nextLesson.id) : "",
      chatSummary: `Formato solicitado: ${formatLabel}.`,
      lastTutorPlan: nextPlanSteps.join(" · "),
    });
    await typeTutorMessage(
      `Boa. Adaptei o plano atual para ${formatLabel} sem trocar o tema da aula.`,
    );
  }

  async function handleLoggedTimeIntent(value: string, nextEnergy: UserEnergy) {
    const loggedTime = detectTime(value);
    const currentLoggedCourse = getRecommendedCourse(selectedCourse, courses);
    const nextDecision = buildTutorDecision({
      topic: topic || currentLoggedCourse.title,
      availableTime: loggedTime,
      userEnergy: nextEnergy,
      selectedCourse: currentLoggedCourse,
      selectedLesson,
      adaptationText: value,
    });

    setPendingAction(null);
    setAvailableTime(loggedTime);
    setTutorDecision(nextDecision);
    updateLoggedMemory({
      chosenTime: loggedTime,
      activePlan: currentLoggedCourse.title,
      lastRecommendation: "recalibrar o plano pelo novo tempo",
      lastFormat: loggedMemory.lastFormat,
    });
    updateTutorMemoryFromMessage(value, {
      preferredStudyTime: loggedTime,
      energyProfile: nextEnergy,
      lastTopic: topic || currentLoggedCourse.title,
      lastCourseId: String(currentLoggedCourse.id),
      lastLessonId: selectedLesson ? String(selectedLesson.id) : "",
      chatSummary: `Tempo atualizado para ${loggedTime}.`,
      lastTutorPlan: nextDecision.planSteps.join(" · "),
    });
    await typeTutorMessage(
      `Perfeito. Atualizei seu tempo para ${loggedTime} e ajustei o plano sem trocar a aula em foco.`,
    );
  }

  async function handleLoggedEnergyIntent(value: string) {
    const currentLoggedCourse = getRecommendedCourse(selectedCourse, courses);
    const currentTime = availableTime || loggedMemory.chosenTime || "20 minutos";
    const nextDecision = buildTutorDecision({
      topic: topic || currentLoggedCourse.title,
      availableTime: currentTime,
      userEnergy: "low",
      selectedCourse: currentLoggedCourse,
      selectedLesson,
      adaptationText: value,
    });

    setPendingAction(null);
    setUserEnergy("low");
    setTutorDecision(nextDecision);
    updateLoggedMemory({
      chosenTime: currentTime,
      activePlan: currentLoggedCourse.title,
      lastRecommendation: "seguir em modo leve",
      lastFormat: "resumo leve",
    });
    updateTutorMemoryFromMessage(value, {
      preferredStudyTime: currentTime,
      energyProfile: "low",
      lastTopic: topic || currentLoggedCourse.title,
      lastCourseId: String(currentLoggedCourse.id),
      lastLessonId: selectedLesson ? String(selectedLesson.id) : "",
      chatSummary: "Aluno indicou baixa energia; plano ajustado para modo leve.",
      lastTutorPlan: nextDecision.planSteps.join(" · "),
    });
    await typeTutorMessage(
      "Entendi. Vou deixar o plano mais leve agora: resumo curto, sem leitura pesada e sem exercício longo.",
    );
  }

  async function handleLoggedQuestionIntent(value: string, nextEnergy: UserEnergy) {
    const currentLoggedCourse = getRecommendedCourse(selectedCourse, courses);
    const currentLessonTitle =
      selectedLesson?.title ?? loggedMemory.currentLessonTitle;
    const fallbackReply = `Pelo contexto da aula ${currentLessonTitle}, eu explicaria assim: vamos separar o ponto principal, ver um exemplo simples e só depois avançar.`;

    setPendingAction(null);
    updateTutorMemoryFromMessage(value, {
      lastTopic: topic || currentLoggedCourse.title,
      lastCourseId: String(currentLoggedCourse.id),
      lastLessonId: selectedLesson ? String(selectedLesson.id) : "",
      chatSummary: `Pergunta feita sobre a aula atual: "${value}".`,
    });
    const tutorReply = await askTutorAi({
      message: value,
      step: "logged",
      context: {
        tema: topic || currentLoggedCourse.title,
        ritmo: availableTime || loggedMemory.chosenTime,
        cursoSelecionado: currentLoggedCourse.title,
        objetivo: value,
        aulaAtual: currentLessonTitle,
        planoAtivo: currentLoggedCourse.title,
        ultimaRecomendacao: loggedMemory.lastRecommendation,
        ultimoFormato: loggedMemory.lastFormat,
      },
      fallbackMessage: fallbackReply,
      isLoggedInOverride: true,
      userEnergyOverride: nextEnergy,
      hasSeenPlanOverride: true,
    });
    await typeTutorMessage(tutorReply);
  }

  async function startTopicFlow(
    value: string,
    nextEnergy: UserEnergy,
    displayedUserMessage = value,
  ) {
    const theme = getTheme(value);

    setTopic(value);
    setPanelMode("topic");
    setCurrentStep(isLoggedIn ? "time" : "name");
    setCurrentExpectedInput(isLoggedIn ? "time" : "name");
    setPendingSuggestedTime(null);
    updateOnboarding({
      tema: theme,
      objetivo: value,
    });
    updateTutorMemoryFromMessage(value, {
      mainGoal: value,
      lastTopic: theme,
      chatSummary: `Tema principal informado: ${theme}.`,
    });
    addUserMessage(displayedUserMessage);
    setInputValue("");

    const coursesPromise = loadCourses(theme);
    await showThinkingSteps([
      "Analisando seu objetivo...",
      "Buscando cursos na biblioteca CEFIS...",
    ]);
    const nextCourses = await coursesPromise;
    const recommendedCourse = getRecommendedCourse(nextCourses[0], nextCourses);
    updateOnboarding({
      cursoSelecionado: recommendedCourse.title,
    });
    saveTutorMemory({
      lastTopic: theme,
      lastCourseId: String(recommendedCourse.id),
      mainGoal: value,
      chatSummary: `Curso recomendado para ${theme}: ${recommendedCourse.title}.`,
    });
    await revealCourseCards(nextCourses.length || fallbackCourses.length);
    const fallbackReply =
      isLoggedIn
        ? `Legal, encontrei caminhos para ${theme}. Quanto tempo você tem para estudar agora?`
        : nextEnergy === "low"
          ? `Legal, consigo te ajudar com ${theme} em um ritmo mais leve. Qual é seu nome?`
          : `Legal, consigo te ajudar com ${theme}. Qual é seu nome?`;
    const tutorReply = await askTutorAi({
      message: value,
      step: "topic",
      context: {
        tema: theme,
        objetivo: value,
        cursoSelecionado: recommendedCourse.title,
      },
      fallbackMessage: fallbackReply,
      userEnergyOverride: nextEnergy,
    });
    await typeTutorMessage(tutorReply);
  }

  async function handleGuidedTopicSelect(selectedTopic: string) {
    if (isBusy) {
      return;
    }

    setHasInteractedAfterPlan(false);
    await startTopicFlow(
      selectedTopic,
      userEnergy,
      `Quero explorar ${selectedTopic}`,
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = inputValue.trim();
    if (!value || isBusy) {
      return;
    }

    setHasInteractedAfterPlan(false);

    const detectedEnergy = detectEnergy(value);
    const nextEnergy = detectedEnergy === "low" ? "low" : userEnergy;

    if (detectedEnergy === "low") {
      setUserEnergy("low");
    }

    if (currentStep === "logged") {
      const intentDecision = detectUserIntent(value);

      addUserMessage(value);
      setInputValue("");

      if (intentDecision.intent === "confirmation" && pendingAction) {
        await executePendingAction(pendingAction);
        return;
      }

      if (intentDecision.intent === "open_next_lesson") {
        await openNextLesson();
        return;
      }

      if (intentDecision.intent === "open_current_lesson") {
        setPendingAction(null);
        await typeTutorMessage(
          `Pronto, mantive a aula atual em foco: ${
            selectedLesson?.title ?? loggedMemory.currentLessonTitle
          }.`,
        );
        return;
      }

      if (intentDecision.intent === "play_video") {
        await handleLoggedFormatIntent(
          value,
          { ...intentDecision, format: "video" },
          nextEnergy,
        );
        return;
      }

      if (intentDecision.intent === "summarize_current_lesson") {
        await handleLoggedFormatIntent(
          value,
          { ...intentDecision, format: "summary" },
          nextEnergy,
        );
        return;
      }

      if (
        intentDecision.intent === "new_topic_request" ||
        intentDecision.intent === "change_topic" ||
        (intentDecision.intent === "format_request" && intentDecision.topic)
      ) {
        await handleLoggedTopicIntent(value, intentDecision, nextEnergy);
        return;
      }

      if (intentDecision.intent === "format_request") {
        await handleLoggedFormatIntent(value, intentDecision, nextEnergy);
        return;
      }

      if (
        intentDecision.intent === "time_change" ||
        intentDecision.intent === "update_time"
      ) {
        await handleLoggedTimeIntent(value, nextEnergy);
        return;
      }

      if (intentDecision.intent === "energy_change") {
        await handleLoggedEnergyIntent(value);
        return;
      }

      await handleLoggedQuestionIntent(value, nextEnergy);
      return;
    }

    if (currentStep === "topic") {
      if (isGenericSuggestionRequest(value)) {
        setTopic("");
        setCourses(fallbackCourses);
        setSelectedCourse(null);
        setLessons([]);
        setSelectedLesson(null);
        setVisibleCourseCount(0);
        setPanelMode("guided");
        setCurrentStep("topic");
        setCurrentExpectedInput("topic");
        setPendingSuggestedTime(null);
        updateOnboarding({
          tema: "",
          objetivo: value,
          cursoSelecionado: "",
        });
        addUserMessage(value);
        setInputValue("");
        await showThinkingSteps(["Entendendo seu momento..."], 360);
        await typeTutorMessage(
          "Claro. Posso te sugerir um caminho inicial. Você prefere algo mais fiscal, contábil, trabalhista ou tributário?",
        );
        return;
      }

      await startTopicFlow(value, nextEnergy);
      return;
    }

    if (currentStep === "name") {
      if (currentExpectedInput === "name" && !looksLikeName(value)) {
        addUserMessage(value);
        setInputValue("");
        await typeTutorMessage(
          "Tudo bem. Antes de montar seu plano, só preciso do seu nome para personalizar a experiência. Como posso te chamar?",
        );
        return;
      }

      setName(value);
      setPanelMode("name");
      setCurrentStep("email");
      setCurrentExpectedInput("email");
      updateOnboarding({ nome: value });
      addUserMessage(value);
      setInputValue("");
      await showThinkingSteps([
        "Guardando seu contexto...",
        "Personalizando o plano...",
      ]);
      const fallbackReply =
        `Prazer, ${value}. Para salvar seu plano de estudos, me informe seu e-mail.`;
      const tutorReply = await askTutorAi({
        message: value,
        step: "name",
        context: { nome: value },
        fallbackMessage: fallbackReply,
      });
      await typeTutorMessage(tutorReply);
      return;
    }

    if (currentStep === "email") {
      if (currentExpectedInput === "email" && !looksLikeEmail(value)) {
        addUserMessage(value);
        setInputValue("");
        await typeTutorMessage(
          "Esse e-mail não parece válido. Me envie seu melhor e-mail para salvar seu plano.",
        );
        return;
      }

      setEmail(value);
      setPanelMode("email");
      setCurrentStep("time");
      setCurrentExpectedInput("time");
      setPendingSuggestedTime(null);
      updateOnboarding({ email: value });
      saveTutorMemory({
        email: value,
        name: name || onboarding.nome,
        energyProfile: userEnergy,
        mainGoal: onboarding.objetivo || topic,
        lastTopic: topic || onboarding.tema,
        lastCourseId: selectedCourse ? String(selectedCourse.id) : "",
        lastLessonId: selectedLesson ? String(selectedLesson.id) : "",
        chatSummary: "Memória inicial criada após o aluno informar e-mail.",
        lastTutorPlan: loggedMemory.lastFormat,
      });
      addUserMessage(value);
      setInputValue("");
      await showThinkingSteps(["Preparando o rascunho do plano..."], 480);
      setShowLoginOffer(true);
      await typeTutorMessage(
        "Se você já tem conta na CEFIS, pode entrar agora para conectar seu plano ao seu histórico.",
      );
      return;
    }

    if (currentStep === "time") {
      setShowLoginOffer(false);
      const detectedTime = detectValidStudyTime(value);
      const normalizedTime =
        pendingSuggestedTime && isAffirmativeResponse(value)
          ? pendingSuggestedTime
          : detectedTime;

      if (currentExpectedInput === "time" && !normalizedTime) {
        addUserMessage(value);
        setInputValue("");

        if (isUnknownInput(value)) {
          setPendingSuggestedTime("10 minutos");
          await typeTutorMessage(
            "Sem problema. Posso sugerir um formato rápido de 10 minutos para começar. Pode ser?",
          );
          return;
        }

        await typeTutorMessage(
          "Para adaptar bem seu plano, me diga quanto tempo você tem agora. Pode ser 5 minutos, 15 minutos, meia hora ou 1 hora.",
        );
        return;
      }

      const studyTime = normalizedTime ?? "10 minutos";
      const recommendedCourse = getRecommendedCourse(selectedCourse, courses);
      setAvailableTime(studyTime);
      setSelectedCourse(recommendedCourse);
      setUserEnergy(nextEnergy);
      setPanelMode("complete");
      setCurrentStep("complete");
      setCurrentExpectedInput("format");
      setPendingSuggestedTime(null);
      setPlanReady(false);
      setHasInteractedAfterPlan(false);
      setHasSeenPreview(false);
      updateOnboarding({
        ritmo: studyTime,
        cursoSelecionado: recommendedCourse.title,
      });
      addUserMessage(value);
      setInputValue("");

      const lessonsPromise = loadLessons(recommendedCourse);
      await showThinkingSteps([
        nextEnergy === "low"
          ? "Percebi que hoje pede um ritmo mais leve..."
          : "Adaptando ao seu momento...",
        "Buscando aulas reais do curso...",
        "Montando seu próximo passo...",
      ]);
      const lessonResult = await lessonsPromise;
      const nextDecision = buildTutorDecision({
        topic,
        availableTime: studyTime,
        userEnergy: nextEnergy,
        selectedCourse: recommendedCourse,
        selectedLesson: lessonResult.selectedLesson,
      });
      const previewWasShown = Boolean(getVideoSource(lessonResult.selectedLesson));
      setTutorDecision(nextDecision);
      setHasSeenPreview(previewWasShown);
      setPlanReady(true);
      setHasInteractedAfterPlan(false);
      updateTutorMemoryFromMessage(value, {
        preferredStudyTime: studyTime,
        energyProfile: nextEnergy,
        mainGoal: onboarding.objetivo || topic,
        lastTopic: topic || onboarding.tema,
        lastCourseId: String(recommendedCourse.id),
        lastLessonId: lessonResult.selectedLesson
          ? String(lessonResult.selectedLesson.id)
          : "",
        chatSummary: `Plano inicial montado para ${studyTime}.`,
        lastTutorPlan: nextDecision.planSteps.join(" · "),
      });

      const studentName = name || onboarding.nome;
      const fallbackReply =
        isLoggedIn
          ? `${nextDecision.tutorMessage} Quer ajustar algo no plano?`
          : studentName
            ? `${studentName}, com ${studyTime}, posso preparar um resumo direto, um vídeo curto ou um início prático do plano. Qual prefere?`
            : `Com ${studyTime}, posso preparar um resumo direto, um vídeo curto ou um início prático do plano. Qual prefere?`;
      const tutorReply = await askTutorAi({
        message: value,
        step: "time",
        context: {
          ritmo: studyTime,
          cursoSelecionado: recommendedCourse.title,
        },
        fallbackMessage: fallbackReply,
        userEnergyOverride: nextEnergy,
        hasSeenPlanOverride: true,
        hasSeenPreviewOverride: previewWasShown,
        hasInteractedAfterPlanOverride: false,
      });
      await typeTutorMessage(tutorReply);
      return;
    }

    if (currentExpectedInput === "format" && isUnknownInput(value)) {
      const recommendedCourse = getRecommendedCourse(selectedCourse, courses);
      const nextDecision: TutorDecision = {
        ...buildTutorDecision({
          topic,
          availableTime,
          userEnergy: "low",
          selectedCourse: recommendedCourse,
          selectedLesson,
          adaptationText: "resumo direto com exemplo pratico",
        }),
        tutorMessage:
          "Vou começar pelo formato mais leve: um resumo direto com exemplo prático.",
        recommendedCourseId: String(recommendedCourse.id),
        recommendedLessonId: String(selectedLesson?.id ?? ""),
        planSteps: [
          "Ler resumo direto",
          "Ver exemplo prático",
          "Tirar uma dúvida rápida",
        ],
      };

      setUserEnergy("low");
      setTutorDecision(nextDecision);
      setPanelMode("complete");
      setCurrentExpectedInput("free_chat");
      setPlanReady(true);
      setHasInteractedAfterPlan(false);
      updateTutorMemoryFromMessage("resumo direto com exemplo prático", {
        preferredStudyTime: availableTime,
        energyProfile: "low",
        lastTopic: topic || onboarding.tema,
        lastCourseId: String(recommendedCourse.id),
        lastLessonId: selectedLesson ? String(selectedLesson.id) : "",
        chatSummary: "Aluno não escolheu formato; Tutor selecionou modo leve.",
        lastTutorPlan: nextDecision.planSteps.join(" · "),
      });
      addUserMessage(value);
      setInputValue("");
      await showThinkingSteps(["Escolhendo o formato mais leve..."], 420);
      await typeTutorMessage(
        "Vou começar pelo formato mais leve: um resumo direto com exemplo prático.",
      );
      setHasInteractedAfterPlan(true);
      return;
    }

    const adaptationEnergy = detectEnergy(value);
    const normalized = normalizeText(value);
    const nextAvailableTime =
      wantsLessTime(value) && !/\d/.test(normalized)
        ? "10 minutos"
        : detectTime(value) || availableTime;
    const shouldUpdateTime =
      wantsLessTime(value) ||
      nextAvailableTime !== value ||
      /\d/.test(normalized) ||
      normalized.includes("meia hora");
    const finalTime = shouldUpdateTime ? nextAvailableTime : availableTime;
    const finalEnergy =
      adaptationEnergy === "low" || normalized.includes("ouvir")
        ? "low"
        : userEnergy;
    const recommendedCourse = getRecommendedCourse(selectedCourse, courses);
    const nextDecision = buildTutorDecision({
      topic,
      availableTime: finalTime,
      userEnergy: finalEnergy,
      selectedCourse: recommendedCourse,
      selectedLesson,
      adaptationText: value,
    });

    setAvailableTime(finalTime);
    setUserEnergy(finalEnergy);
    setTutorDecision(nextDecision);
    setPanelMode("complete");
    setCurrentExpectedInput("free_chat");
    setPlanReady(true);
    setHasInteractedAfterPlan(false);
    updateOnboarding({
      ritmo: finalTime,
      cursoSelecionado: recommendedCourse.title,
      objetivo: value,
    });
    updateTutorMemoryFromMessage(value, {
      preferredStudyTime: finalTime,
      energyProfile: finalEnergy,
      mainGoal: value,
      lastTopic: topic || onboarding.tema,
      lastCourseId: String(recommendedCourse.id),
      lastLessonId: selectedLesson ? String(selectedLesson.id) : "",
      chatSummary: `Plano ajustado pelo aluno: "${value}".`,
      lastTutorPlan: nextDecision.planSteps.join(" · "),
    });
    addUserMessage(value);
    setInputValue("");
    await showThinkingSteps([
      "Recalculando o plano...",
      "Adaptando ao seu momento...",
    ]);
    const fallbackReply = `${nextDecision.tutorMessage} Atualizei o plano visual para esse novo momento.`;
    const tutorReply = await askTutorAi({
      message: value,
      step: "complete",
      context: {
        ritmo: finalTime,
        cursoSelecionado: recommendedCourse.title,
        objetivo: value,
      },
      fallbackMessage: fallbackReply,
      userEnergyOverride: finalEnergy,
      hasSeenPlanOverride: true,
      hasInteractedAfterPlanOverride: true,
    });
    await typeTutorMessage(tutorReply);
    setHasInteractedAfterPlan(true);
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-8">
        <header className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <Image
              alt="CEFIS"
              className="h-7 w-auto"
              height={28}
              src="/logo-cefis-w.svg"
              width={116}
            />
            <span className="hidden text-sm font-semibold text-neutral-400 sm:inline">
              Tutor IA
            </span>
          </div>
          <button
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-neutral-300 transition hover:border-cyan-300/50 hover:text-white disabled:cursor-wait disabled:opacity-60"
            disabled={isBusy || isLoggingIn}
            type="button"
            onClick={() => {
              if (isLoggedIn) {
                handleLogout();
                return;
              }

              openLoginModal();
            }}
          >
            {isLoggedIn && hasCefisSession ? "Sair" : "Entrar"}
          </button>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-4">
          {loggedStudentMode ? (
            <LoggedWorkspace
              currentStep={currentStep}
              inputRef={inputRef}
              inputValue={inputValue}
              isBusy={isBusy}
              isLoadingLessons={isLoadingLessons}
              isTutorTyping={isTutorTyping}
              decision={tutorDecision}
              loggedProgress={activeLoggedProgress}
              messages={messages}
              onInputChange={setInputValue}
              onLoggedAction={handleLoggedAction}
              onSubmit={handleSubmit}
              selectedCourse={selectedCourse}
              selectedLesson={selectedLesson}
              thinkingStep={thinkingStep}
              tutorMessage={displayedTutorMessage}
            />
          ) : (
            <>
              <LivePanel
                mode={panelMode}
                topic={topic}
                name={name}
                email={email}
                availableTime={availableTime}
                tutorMessage={displayedTutorMessage}
                messages={messages}
                inputValue={inputValue}
                inputRef={inputRef}
                currentStep={currentStep}
                courses={courses}
                selectedCourse={selectedCourse}
                lessons={lessons}
                selectedLesson={selectedLesson}
                isLoadingCourses={isLoadingCourses}
                isLoadingLessons={isLoadingLessons}
                isTutorTyping={isTutorTyping}
                isBusy={isBusy}
                thinkingStep={thinkingStep}
                apiError={apiError}
                visibleCourseCount={visibleCourseCount}
                decision={tutorDecision}
                journeySteps={journeySteps}
                loggedProgress={activeLoggedProgress}
                isLoggedIn={isLoggedIn}
                showFinalCTA={showFinalCTA}
                showLoginOffer={showLoginOffer}
                ctaVariant={ctaVariant}
                continueUrl={continueUrl}
                onAdjustPlan={handleAdjustPlanCTA}
                onContinueWithoutLogin={handleContinueWithoutLogin}
                onContinueInTutor={handleContinueInTutor}
                onGuidedTopicSelect={handleGuidedTopicSelect}
                onOpenLogin={openLoginModal}
                onLoggedAction={handleLoggedAction}
                onInputChange={setInputValue}
                onSubmit={handleSubmit}
              />

              <p className="max-w-2xl text-center text-sm leading-6 text-neutral-500">
                A interface nasce dentro do painel e usa cursos reais da CEFIS
                quando a API pública responde.
              </p>
            </>
          )}
        </div>
      </div>
      <LoginModal
        email={loginEmail}
        error={loginError}
        isLoading={isLoggingIn}
        isOpen={isLoginModalOpen}
        onClose={() => {
          if (!isLoggingIn) {
            setIsLoginModalOpen(false);
          }
        }}
        onEmailChange={setLoginEmail}
        onPasswordChange={setLoginPassword}
        onSubmit={handleLoginSubmit}
        password={loginPassword}
      />
    </main>
  );
}
