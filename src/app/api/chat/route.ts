import OpenAI from "openai";

export const runtime = "nodejs";

type ChatPayload = {
  mensagem?: string;
  message?: string;
  etapaAtual?: string;
  currentStep?: string;
  tema?: string;
  nome?: string;
  email?: string;
  ritmo?: string;
  cursoSelecionado?: string;
  objetivo?: string;
  aulaAtual?: string;
  progressoAtual?: string;
  planoAtivo?: string;
  ultimaRecomendacao?: string;
  ultimoFormato?: string;
  isLoggedIn?: boolean;
  userEnergy?: string;
  hasSeenPlan?: boolean;
  hasSeenPreview?: boolean;
  hasInteractedAfterPlan?: boolean;
};

function buildFallbackReply(payload: ChatPayload) {
  const step = payload.etapaAtual ?? payload.currentStep ?? "complete";
  const theme = payload.tema || payload.objetivo || "esse tema";
  const knownName = payload.nome?.trim();
  const name = knownName || "você";
  const rhythm = payload.ritmo || "seu tempo disponível";
  const course = payload.cursoSelecionado || "o curso recomendado";
  const isLowEnergy = payload.userEnergy === "low";

  if (payload.isLoggedIn) {
    const progress = payload.progressoAtual || "Seu progresso está ativo";
    const lesson = payload.aulaAtual || "a aula atual";
    const recommendation =
      payload.ultimaRecomendacao || "revisar os pontos centrais";
    const format = payload.ultimoFormato || "3 passos";

    return `${progress}; você parou em ${lesson}, dentro de ${course}. Para ${rhythm}, recomendo ${recommendation}. Posso conduzir agora em ${format}.`;
  }

  if (step === "topic") {
    return `Legal, consigo te ajudar com ${theme}. Qual é seu nome?`;
  }

  if (step === "name") {
    return `Prazer, ${name}. Para salvar seu plano de estudos, me informe seu e-mail.`;
  }

  if (step === "email") {
    return knownName
      ? `Então, ${name}, quanto tempo você tem disponível agora para estudar?`
      : "Certo. Quanto tempo você tem disponível agora para estudar?";
  }

  if (step === "time") {
    const previewOption = payload.hasSeenPreview
      ? "um vídeo curto"
      : "um plano em texto";

    if (isLowEnergy) {
      return `Com ${rhythm}, posso deixar leve: um resumo direto, ${previewOption} ou um começo sem exercício pesado. Qual prefere?`;
    }

    return `${name}, com ${rhythm}, posso preparar um resumo direto, ${previewOption} ou um início prático do plano. Qual prefere?`;
  }

  if (isLowEnergy) {
    return "Entendi. Vou deixar o plano mais leve: aula curta, resumo simples e nada de exercício pesado agora.";
  }

  return `Boa. Vou adaptar seu plano de ${theme} mantendo o próximo passo simples e prático.`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitizeTutorReply(payload: ChatPayload, reply: string) {
  const step = payload.etapaAtual ?? payload.currentStep ?? "complete";
  const knownName = payload.nome?.trim();
  let nextReply = reply.trim();

  if (step !== "topic") {
    const namePattern = knownName
      ? `(?:${escapeRegExp(knownName)}[,!\\s]*)?`
      : "";
    nextReply = nextReply.replace(
      new RegExp(`^(olá|oi)[,!\\s]*${namePattern}`, "i"),
      "",
    );
  }

  if (step === "complete" && knownName) {
    nextReply = nextReply.replace(
      new RegExp(`^${escapeRegExp(knownName)}[,!\\s]+`, "i"),
      "",
    );
  }

  if (payload.isLoggedIn) {
    const normalizedReply = nextReply
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const forbiddenLoggedStarts = [
      "o que voce quer aprender",
      "prefere resumo ou video",
      "vamos comecar",
      "que tal estudar",
      "bom te ver novamente",
    ];

    if (
      forbiddenLoggedStarts.some((forbidden) =>
        normalizedReply.includes(forbidden),
      )
    ) {
      return buildFallbackReply(payload);
    }
  }

  return nextReply.trim() || buildFallbackReply(payload);
}

function buildInstructions() {
  return [
    "Você é o CEFIS Tutor IA.",
    "Atue como professor acolhedor, especialista em educação e tutor adaptativo.",
    "Seu foco é ajudar novos usuários da CEFIS a perceber valor antes de qualquer venda.",
    "Use português brasileiro natural, direto, acolhedor e premium.",
    "Use saudação apenas uma vez no início da conversa.",
    "Depois que souber o nome, não comece toda resposta com 'Olá', 'Oi' ou com o nome do usuário.",
    "Use o nome com moderação. Prefira conectores naturais como 'Prazer', 'Então', 'Perfeito', 'Certo' e 'Boa'.",
    "Não inicie respostas consecutivas com o nome do usuário.",
    "Evite frases longas.",
    "Faça apenas uma pergunta por vez.",
    "Mantenha respostas curtas durante o onboarding.",
    "Não explique demais antes de concluir as perguntas principais.",
    "Se o aluno estiver cansado, reduza carga, ofereça resumo leve, áudio ou aula curta e evite exercícios pesados.",
    "Se o ritmo for curto, sugira passos pequenos e objetivos.",
    "Se a etapa for topic, responda brevemente e peça o nome.",
    "Se a etapa for name, diga: 'Prazer, [nome]. Para salvar seu plano de estudos, me informe seu e-mail.'",
    "Se a etapa for email, diga: 'Então, [nome], quanto tempo você tem disponível agora para estudar?'",
    "Se a etapa for time, entregue valor sem vender: '[nome], com [ritmo], posso preparar um resumo direto, um vídeo curto ou um início prático do plano. Qual prefere?'",
    "Se a etapa for complete, responda a pergunta real e adapte o plano.",
    "Só mencione continuar a trilha completa na CEFIS se o campo 'Interagiu depois do plano' for sim.",
    "Se o usuário estiver logado, não peça nome, e-mail ou tema inicial.",
    "Modo logado é acompanhamento contínuo, não descoberta inicial.",
    "No modo logado, nunca use: 'O que você quer aprender?', 'Prefere resumo ou vídeo?', 'Vamos começar?' ou 'Que tal estudar...?'.",
    "No modo logado, assuma que você já conhece curso, aula atual, progresso, tempo disponível e plano ativo.",
    "No modo logado, use a estrutura: estado atual, sugestão objetiva, ação imediata.",
    "No modo logado, cite progresso, aula atual, tempo disponível e plano ativo quando esses dados existirem.",
    "No modo logado, evite saudações como 'Bom te ver novamente'; vá direto ao contexto.",
    "No modo logado, seja orientador e contextual, sem tom vendedor.",
    "Não invente URLs, preços, políticas comerciais ou promessas de certificado.",
    "Responda em até 3 frases curtas.",
  ].join("\n");
}

function buildInput(payload: ChatPayload) {
  return [
    `Mensagem do aluno: ${payload.mensagem ?? payload.message ?? ""}`,
    `Etapa atual: ${payload.etapaAtual ?? payload.currentStep ?? "complete"}`,
    `Tema: ${payload.tema ?? "não informado"}`,
    `Nome: ${payload.nome ?? "não informado"}`,
    `E-mail informado: ${payload.email ? "sim" : "não"}`,
    `Ritmo/tempo disponível: ${payload.ritmo ?? "não informado"}`,
    `Curso selecionado: ${payload.cursoSelecionado ?? "não informado"}`,
    `Objetivo: ${payload.objetivo ?? "não informado"}`,
    `Aula atual: ${payload.aulaAtual ?? "não informado"}`,
    `Progresso atual: ${payload.progressoAtual ?? "não informado"}`,
    `Plano ativo: ${payload.planoAtivo ?? "não informado"}`,
    `Última recomendação: ${payload.ultimaRecomendacao ?? "não informado"}`,
    `Último formato usado: ${payload.ultimoFormato ?? "não informado"}`,
    `Usuário logado: ${payload.isLoggedIn ? "sim" : "não"}`,
    `Energia do usuário: ${payload.userEnergy ?? "normal"}`,
    `Já viu plano: ${payload.hasSeenPlan ? "sim" : "não"}`,
    `Já viu prévia/vídeo: ${payload.hasSeenPreview ? "sim" : "não"}`,
    `Interagiu depois do plano: ${payload.hasInteractedAfterPlan ? "sim" : "não"}`,
  ].join("\n");
}

function shouldUseGuidedOnboardingReply(payload: ChatPayload) {
  const step = payload.etapaAtual ?? payload.currentStep ?? "complete";

  return step === "name" || step === "email" || step === "time";
}

export async function POST(request: Request) {
  let payload: ChatPayload;

  try {
    payload = (await request.json()) as ChatPayload;
  } catch {
    return Response.json(
      { reply: "Não consegui ler sua mensagem agora.", source: "fallback" },
      { status: 400 },
    );
  }

  const message = payload.mensagem ?? payload.message ?? "";

  if (!message.trim()) {
    return Response.json(
      { reply: "Me diga o que você quer aprender ou ajustar.", source: "fallback" },
      { status: 400 },
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({
      reply: buildFallbackReply(payload),
      source: "fallback",
      missingApiKey: true,
    });
  }

  try {
    if (shouldUseGuidedOnboardingReply(payload)) {
      return Response.json({
        reply: buildFallbackReply(payload),
        source: "fallback",
      });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      instructions: buildInstructions(),
      input: buildInput(payload),
    });

    return Response.json({
      reply: sanitizeTutorReply(
        payload,
        response.output_text || buildFallbackReply(payload),
      ),
      source: "openai",
    });
  } catch {
    return Response.json({
      reply: buildFallbackReply(payload),
      source: "fallback",
      apiError: "Não consegui consultar a OpenAI agora.",
    });
  }
}
