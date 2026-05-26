"use client";

import { type FormEvent, useState } from "react";
import Image from "next/image";

type ConversationStep =
  | "topic"
  | "name"
  | "email"
  | "time"
  | "logged"
  | "complete";

type PanelMode = "initial" | "topic" | "name" | "email" | "logged" | "complete";

type UserEnergy = "normal" | "low";

type TutorDecisionMode = "quick" | "light" | "normal";

type JourneyStepState = "inactive" | "active" | "complete";

type LoggedAction = "continue" | "review" | "today";

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
};

const PURCHASE_URL = "https://cefis.com.br";
const PLANS_URL = "https://cefis.com.br";

const loggedStudentProgress: LoggedStudentProgress = {
  name: "Evandro",
  courseTitle: "Rotinas Fiscais Essenciais",
  lessonTitle: "Apuração e revisão guiada",
  progressPercent: 64,
  lastAccess: "ontem às 18:40",
  reviewHint: "Tenho uma revisão rápida para hoje.",
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

const initialTutorMessage = "O que você precisa aprender hoje?";

const initialMessages: Message[] = [
  {
    role: "tutor",
    text: initialTutorMessage,
  },
];

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
  ];

  return lowEnergySignals.some((signal) => normalized.includes(signal))
    ? "low"
    : "normal";
}

function detectTime(value: string) {
  const normalized = normalizeText(value);

  if (normalized.includes("meia hora")) {
    return "30 minutos";
  }

  const explicitMinutes = normalized.match(
    /(\d{1,3})\s*(min|mins|minuto|minutos)/,
  );

  if (explicitMinutes?.[1]) {
    return `${explicitMinutes[1]} minutos`;
  }

  const commonMinutes = normalized.match(/\b(10|15|30)\b/);

  if (commonMinutes?.[1]) {
    return `${commonMinutes[1]} minutos`;
  }

  return value.trim();
}

function wantsLessTime(value: string) {
  const normalized = normalizeText(value);

  return (
    normalized.includes("menos tempo") ||
    normalized.includes("mais rapido") ||
    normalized.includes("rapido demais")
  );
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
    <div className="rounded-lg border border-white/10 bg-neutral-950/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-cyan-200">Plano de hoje</p>
          <h3 className="mt-1 text-lg font-black text-white">
            {minutes} minutos
          </h3>
        </div>
        <p className="rounded-lg bg-cyan-300 px-3 py-2 text-sm font-black text-neutral-950">
          {course.title}
        </p>
      </div>

      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        {decision.planSteps.map((item, index) => (
          <li
            key={item}
            className="rounded-lg border border-white/10 bg-white/[0.04] p-3 transition duration-500"
          >
            <span className="text-xl font-black text-cyan-200">
              0{index + 1}
            </span>
            <p className="mt-2 text-sm font-semibold text-neutral-200">
              {item}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function PurchaseCTA({
  hasSeenPreview,
  onAdjustPlan,
}: {
  hasSeenPreview: boolean;
  onAdjustPlan: () => void;
}) {
  return (
    <div className="cefis-fade-in mt-4 rounded-lg border border-cyan-300/25 bg-cyan-300/[0.08] p-4 shadow-lg shadow-cyan-950/20">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-black text-cyan-100">
            Continuar meu plano completo
          </p>
          <p className="mt-1 text-sm leading-6 text-neutral-300">
            Seu plano já está pronto. Crie sua conta ou escolha um plano para
            continuar estudando com a CEFIS.
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {hasSeenPreview
              ? "Incluí a melhor prévia/aula pública disponível para você sentir o caminho."
              : "Quando houver prévia pública, ela entra aqui automaticamente."}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            className="rounded-lg bg-cyan-300 px-4 py-2 text-center text-xs font-black text-neutral-950 transition hover:bg-cyan-200"
            href={PURCHASE_URL}
            rel="noreferrer"
            target="_blank"
          >
            Continuar meu plano completo
          </a>
          <a
            className="rounded-lg border border-white/10 px-4 py-2 text-center text-xs font-bold text-neutral-200 transition hover:border-cyan-300/50 hover:text-white"
            href={PLANS_URL}
            rel="noreferrer"
            target="_blank"
          >
            Ver opções da CEFIS
          </a>
          <button
            className="rounded-lg px-4 py-2 text-xs font-bold text-neutral-400 transition hover:text-white"
            type="button"
            onClick={onAdjustPlan}
          >
            Ainda quero ajustar meu plano
          </button>
        </div>
      </div>
    </div>
  );
}

function LoggedActionBar({
  onLoggedAction,
}: {
  onLoggedAction: (action: LoggedAction) => void;
}) {
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-3">
      {[
        ["continue", "Continuar de onde parei"],
        ["review", "Revisar conteúdo"],
        ["today", "Montar plano de hoje"],
      ].map(([action, label]) => (
        <button
          key={action}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-neutral-200 transition hover:-translate-y-0.5 hover:border-cyan-300/50 hover:bg-cyan-300/10 hover:text-white"
          type="button"
          onClick={() => onLoggedAction(action as LoggedAction)}
        >
          {label}
        </button>
      ))}
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
        <h2 className="mt-3 text-4xl font-black text-white sm:text-6xl">
          Bom te ver novamente, {loggedProgress.name}
        </h2>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-neutral-300">
          Você pode continuar de onde parou ou pedir uma revisão rápida para
          hoje.
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
            <p className="text-xs font-bold uppercase text-cyan-100">
              Revisão sugerida
            </p>
            <p className="mt-3 text-lg font-bold leading-7 text-white">
              {loggedProgress.reviewHint}
            </p>
            <p className="mt-3 text-sm leading-6 text-neutral-300">
              Aqui o tutor usaria histórico, progresso e desempenho real para
              montar o próximo estudo.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "initial") {
    return (
      <div className="cefis-fade-in flex h-full flex-col items-center justify-center text-center">
        <TutorAvatar size="lg" />
        <h1 className="mt-7 max-w-2xl text-balance text-4xl font-semibold leading-tight text-white sm:text-6xl">
          O que você precisa aprender hoje?
        </h1>
        <p className="mt-5 max-w-xl text-pretty text-lg leading-8 text-neutral-300">
          Eu posso ensinar você, adaptar o ritmo e montar um plano ideal para o
          seu momento..
        </p>
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
    <div className="cefis-fade-in flex h-full flex-col justify-between gap-4">
      <div className="grid min-h-0 gap-4 lg:grid-cols-[0.78fr_1.22fr]">
        <div>
          <p className="text-sm font-bold uppercase text-cyan-200">
            {getModeLabel(decision.mode)}
          </p>
          <h2 className="mt-2 line-clamp-2 text-3xl font-black text-white sm:text-5xl">
            {recommendedCourse.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-neutral-300">
            Duração disponível:{" "}
            <span className="text-white">{availableTime}</span>
          </p>
          {!isLightMode && (
            <>
              <p className="mt-1 text-sm leading-6 text-neutral-300">
                Trilha sugerida: <span className="text-white">{trail}</span>
              </p>
              <p className="mt-1 text-sm leading-6 text-neutral-300">
                Aulas encontradas:{" "}
                <span className="text-white">
                  {isLoadingLessons
                    ? "buscando..."
                    : lessons.length || "fallback"}
                </span>
              </p>
            </>
          )}
          <p className="mt-1 text-sm leading-6 text-neutral-300">
            Aula:{" "}
            <span className="text-white">
              {isLoadingLessons
                ? "buscando aula real..."
                : selectedLesson?.title ?? "aula curta sugerida"}
            </span>
          </p>
          {isLightMode && (
            <p className="mt-3 rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm leading-6 text-cyan-50">
              Hoje eu reduzi a carga visual: aula curta, resumo leve e nada de
              exercícios pesados agora.
            </p>
          )}
          {apiError && (
            <p className="mt-2 text-sm text-amber-200">{apiError}</p>
          )}
        </div>

        <div className="min-h-0">
          {videoSource ? (
            <div className="overflow-hidden rounded-lg border border-cyan-300/25 bg-black">
              <video
                className="aspect-video h-full max-h-[280px] w-full object-contain"
                controls
                src={videoSource}
              />
            </div>
          ) : (
            <StudyPlanCard
              availableTime={availableTime}
              course={recommendedCourse}
              decision={decision}
            />
          )}
        </div>
      </div>

      {videoSource && (
        <StudyPlanCard
          availableTime={availableTime}
          course={recommendedCourse}
          decision={decision}
        />
      )}
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
  inputValue,
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
  showPurchaseCTA,
  hasSeenPreview,
  onAdjustPlan,
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
  inputValue: string;
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
  showPurchaseCTA: boolean;
  hasSeenPreview: boolean;
  onAdjustPlan: () => void;
  onLoggedAction: (action: LoggedAction) => void;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="mx-auto h-[min(720px,calc(100svh-9.5rem))] min-h-[520px] w-full max-w-6xl overflow-hidden rounded-lg border border-white/10 bg-neutral-950 shadow-2xl shadow-black/50 transition duration-500">
      <div className="relative flex h-full flex-col overflow-hidden p-4 sm:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_15%_80%,rgba(255,255,255,0.07),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.05),transparent_48%)]" />
        <div className="absolute inset-x-10 top-[4.5rem] h-px bg-cyan-200/30" />
        <div className="absolute inset-x-16 bottom-32 h-px bg-white/10" />
        <PanelProgress steps={journeySteps} />
        {(thinkingStep || isTutorTyping) && (
          <div className="absolute right-4 top-[4.85rem] z-20 rounded-full border border-cyan-300/20 bg-neutral-950/80 px-3 py-1 text-xs font-bold text-cyan-100 shadow-lg shadow-black/20 backdrop-blur animate-pulse">
            {thinkingStep || "Escrevendo resposta..."}
          </div>
        )}

        <div className="relative z-10 min-h-0 flex-1 pb-4 pt-16">
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
          />
        </div>

        <div className="relative z-10 rounded-lg border border-white/10 bg-neutral-950/90 p-3 shadow-2xl shadow-black/30 sm:p-4">
          <div className="flex gap-3">
            <TutorAvatar size="sm" />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase text-cyan-200">Tutor</p>
              <p className="mt-1 text-base font-semibold leading-6 text-white">
                {tutorMessage}
                {isTutorTyping && (
                  <span className="ml-1 inline-block h-4 w-1 animate-pulse rounded-full bg-cyan-200 align-middle" />
                )}
              </p>
            </div>
          </div>

          <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={onSubmit}>
            <input
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
            >
              {isBusy ? "Pensando..." : "Enviar"}
            </button>
          </form>

          {showPurchaseCTA && !isLoggedIn && (
            <PurchaseCTA
              hasSeenPreview={hasSeenPreview}
              onAdjustPlan={onAdjustPlan}
            />
          )}

          {isLoggedIn && (
            <LoggedActionBar onLoggedAction={onLoggedAction} />
          )}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [currentStep, setCurrentStep] = useState<ConversationStep>("topic");
  const [topic, setTopic] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [availableTime, setAvailableTime] = useState("");
  const [, setMessages] = useState<Message[]>(initialMessages);
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
  const [hasSeenPlan, setHasSeenPlan] = useState(false);
  const [hasSeenPreview, setHasSeenPreview] = useState(false);
  const [showPurchaseCTA, setShowPurchaseCTA] = useState(false);
  const [displayedTutorMessage, setDisplayedTutorMessage] =
    useState(initialTutorMessage);
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
    hasSeenPlan,
    isLoggedIn,
  });

  function addUserMessage(userText: string) {
    setMessages((current) => [...current, { role: "user", text: userText }]);
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

    try {
      const realCourses = await fetchCoursesByTopic(value);
      const nextCourses = realCourses.length ? realCourses : fallbackCourses;
      setCourses(nextCourses);
      setSelectedCourse(nextCourses[0]);

      if (!realCourses.length) {
        setApiError("Não encontrei cursos públicos agora. Usando fallback.");
      }

      return nextCourses;
    } catch {
      setCourses(fallbackCourses);
      setSelectedCourse(fallbackCourses[0]);
      setApiError("API indisponível. Mantive um fallback para a demo.");
      return fallbackCourses;
    } finally {
      setIsLoadingCourses(false);
    }
  }

  async function loadLessons(course: Course) {
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
    setApiError("");
    setHasSeenPlan(false);
    setHasSeenPreview(false);
    setShowPurchaseCTA(false);
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

  async function toggleLoggedMode() {
    if (isBusy) {
      return;
    }

    if (isLoggedIn) {
      setIsLoggedIn(false);
      resetVisitorExperience();
      return;
    }

    setIsLoggedIn(true);
    setName(loggedStudentProgress.name);
    setEmail("aluno@cefis.com.br");
    setTopic(loggedStudentProgress.courseTitle);
    setAvailableTime("20 minutos");
    setPanelMode("logged");
    setCurrentStep("logged");
    setInputValue("");
    setUserEnergy("normal");
    setCourses([loggedProgressCourse, ...fallbackCourses]);
    setSelectedCourse(loggedProgressCourse);
    setLessons([]);
    setSelectedLesson(null);
    setHasSeenPlan(true);
    setHasSeenPreview(false);
    setShowPurchaseCTA(false);
    setTutorDecision(
      buildTutorDecision({
        topic: loggedStudentProgress.courseTitle,
        availableTime: "20 minutos",
        userEnergy: "normal",
        selectedCourse: loggedProgressCourse,
        selectedLesson: null,
      }),
    );
    await showThinkingSteps([
      "Carregando seu progresso...",
      "Lendo seu histórico de estudos...",
    ]);
    await typeTutorMessage(
      "Bom te ver novamente. Você pode continuar de onde parou, revisar conteúdo ou montar um plano de hoje.",
    );
  }

  async function handleLoggedAction(action: LoggedAction) {
    if (isBusy) {
      return;
    }

    const actionCopy: Record<
      LoggedAction,
      { time: string; message: string; adaptationText?: string }
    > = {
      continue: {
        time: "20 minutos",
        message:
          "Perfeito. Vou retomar sua aula atual e manter um próximo passo pequeno para você continuar sem perder contexto.",
      },
      review: {
        time: "10 minutos",
        message:
          "Separei uma revisão rápida com o conteúdo que mais combina com seu progresso atual.",
      },
      today: {
        time: "30 minutos",
        message:
          "Montei um plano de hoje usando seu histórico e a aula em que você parou.",
        adaptationText: "plano completo",
      },
    };
    const selectedAction = actionCopy[action];
    const nextDecision = buildTutorDecision({
      topic: loggedStudentProgress.courseTitle,
      availableTime: selectedAction.time,
      userEnergy,
      selectedCourse: loggedProgressCourse,
      selectedLesson: null,
      adaptationText: selectedAction.adaptationText,
    });

    setAvailableTime(selectedAction.time);
    setTopic(loggedStudentProgress.courseTitle);
    setCourses([loggedProgressCourse, ...fallbackCourses]);
    setSelectedCourse(loggedProgressCourse);
    setPanelMode("complete");
    setCurrentStep("complete");
    setShowPurchaseCTA(false);
    setHasSeenPlan(true);
    setTutorDecision(nextDecision);
    await showThinkingSteps([
      "Consultando seu progresso...",
      "Montando continuidade...",
    ]);
    await typeTutorMessage(selectedAction.message);
  }

  async function handleAdjustPlanCTA() {
    if (isBusy) {
      return;
    }

    setShowPurchaseCTA(false);
    await typeTutorMessage(
      "Claro. Me diga o que você quer ajustar: ritmo, cansaço, prática ou começar do zero.",
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = inputValue.trim();
    if (!value || isBusy) {
      return;
    }

    setShowPurchaseCTA(false);

    const detectedEnergy = detectEnergy(value);
    const nextEnergy = detectedEnergy === "low" ? "low" : userEnergy;

    if (detectedEnergy === "low") {
      setUserEnergy("low");
    }

    if (currentStep === "logged") {
      const normalized = normalizeText(value);
      const detectedTime = detectTime(value);
      const hasExplicitTime =
        /\d/.test(normalized) || normalized.includes("meia hora");
      const loggedTime = hasExplicitTime ? detectedTime : "20 minutos";
      const nextDecision = buildTutorDecision({
        topic: loggedStudentProgress.courseTitle,
        availableTime: loggedTime,
        userEnergy: nextEnergy,
        selectedCourse: loggedProgressCourse,
        selectedLesson: null,
        adaptationText: value,
      });

      setTopic(loggedStudentProgress.courseTitle);
      setAvailableTime(loggedTime);
      setCourses([loggedProgressCourse, ...fallbackCourses]);
      setSelectedCourse(loggedProgressCourse);
      setUserEnergy(nextEnergy);
      setTutorDecision(nextDecision);
      setPanelMode("complete");
      setCurrentStep("complete");
      setHasSeenPlan(true);
      addUserMessage(value);
      setInputValue("");
      await showThinkingSteps([
        "Lendo seu histórico mockado...",
        "Adaptando sua revisão...",
      ]);
      await typeTutorMessage(
        `${nextDecision.tutorMessage} Mantive isso conectado ao ponto em que você parou.`,
      );
      return;
    }

    if (currentStep === "topic") {
      const theme = getTheme(value);
      setTopic(value);
      setPanelMode("topic");
      setCurrentStep("name");
      addUserMessage(value);
      setInputValue("");

      const coursesPromise = loadCourses(theme);
      await showThinkingSteps([
        "Analisando seu objetivo...",
        "Buscando cursos na biblioteca CEFIS...",
      ]);
      const nextCourses = await coursesPromise;
      await revealCourseCards(nextCourses.length || fallbackCourses.length);
      await typeTutorMessage(
        nextEnergy === "low"
          ? `Legal, consigo te ajudar com ${theme} em um ritmo mais leve. Qual é seu nome?`
          : `Legal, consigo te ajudar com ${theme}. Qual é seu nome?`,
      );
      return;
    }

    if (currentStep === "name") {
      setName(value);
      setPanelMode("name");
      setCurrentStep("email");
      addUserMessage(value);
      setInputValue("");
      await showThinkingSteps([
        "Guardando seu contexto...",
        "Personalizando o plano...",
      ]);
      await typeTutorMessage(
        "Me mande seu e-mail para que eu possa salvar seu plano de estudos.",
      );
      return;
    }

    if (currentStep === "email") {
      setEmail(value);
      setPanelMode("email");
      setCurrentStep("time");
      addUserMessage(value);
      setInputValue("");
      await showThinkingSteps(["Preparando o rascunho do plano..."], 480);
      await typeTutorMessage("Quanto tempo você tem para estudar agora?");
      return;
    }

    if (currentStep === "time") {
      const normalizedTime = detectTime(value);
      const recommendedCourse = getRecommendedCourse(selectedCourse, courses);
      setAvailableTime(normalizedTime);
      setSelectedCourse(recommendedCourse);
      setUserEnergy(nextEnergy);
      setPanelMode("complete");
      setCurrentStep("complete");
      setHasSeenPlan(false);
      setHasSeenPreview(false);
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
        availableTime: normalizedTime,
        userEnergy: nextEnergy,
        selectedCourse: recommendedCourse,
        selectedLesson: lessonResult.selectedLesson,
      });
      const previewWasShown = Boolean(getVideoSource(lessonResult.selectedLesson));
      setTutorDecision(nextDecision);
      setHasSeenPreview(previewWasShown);
      setHasSeenPlan(true);

      if (!isLoggedIn) {
        setShowPurchaseCTA(true);
      }

      await typeTutorMessage(
        isLoggedIn
          ? `${nextDecision.tutorMessage} Quer ajustar algo no plano?`
          : "Eu montei um caminho inicial para você. Para continuar essa trilha completa, salvar seu progresso e acessar todas as aulas, você pode seguir com a CEFIS.",
      );
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
    setHasSeenPlan(true);
    addUserMessage(value);
    setInputValue("");
    await showThinkingSteps([
      "Recalculando o plano...",
      "Adaptando ao seu momento...",
    ]);
    if (!isLoggedIn) {
      setShowPurchaseCTA(true);
    }
    await typeTutorMessage(
      `${nextDecision.tutorMessage} Atualizei o plano visual para esse novo momento.`,
    );
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
            disabled={isBusy}
            type="button"
            onClick={() => {
              void toggleLoggedMode();
            }}
          >
            {isLoggedIn ? "Sair" : "Entrar"}
          </button>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-4">
          <LivePanel
            mode={panelMode}
            topic={topic}
            name={name}
            email={email}
            availableTime={availableTime}
            tutorMessage={displayedTutorMessage}
            inputValue={inputValue}
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
            loggedProgress={loggedStudentProgress}
            isLoggedIn={isLoggedIn}
            showPurchaseCTA={showPurchaseCTA}
            hasSeenPreview={hasSeenPreview}
            onAdjustPlan={handleAdjustPlanCTA}
            onLoggedAction={handleLoggedAction}
            onInputChange={setInputValue}
            onSubmit={handleSubmit}
          />

          <p className="max-w-2xl text-center text-sm leading-6 text-neutral-500">
            A interface nasce dentro do painel e usa cursos reais da CEFIS
            quando a API pública responde.
          </p>
        </div>
      </div>
    </main>
  );
}
