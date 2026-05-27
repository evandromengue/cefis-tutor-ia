const CEFIS_LOGIN_URL = "https://cefis.com.br/api/v1/login";

type CefisUserSummary = {
  id?: number | string | null;
  name?: string | null;
  email?: string | null;
  is_premium?: boolean | number | string | null;
  premium_plan_active?: boolean | number | string | null;
  is_demo_subscriber?: boolean | number | string | null;
};

type LoginRequest = {
  email?: string;
  password?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function extractUser(value: unknown): CefisUserSummary | null {
  const record = asRecord(value);

  if (!record) {
    return null;
  }

  const userCandidate =
    asRecord(record.user) ||
    asRecord(asRecord(record.data)?.user) ||
    asRecord(record.data) ||
    record;
  const userRecord = asRecord(userCandidate);

  if (!userRecord) {
    return null;
  }

  return {
    id:
      (userRecord.id as CefisUserSummary["id"]) ??
      (userRecord.user_id as CefisUserSummary["id"]) ??
      null,
    name:
      (userRecord.name as string | null | undefined) ??
      (userRecord.nome as string | null | undefined) ??
      (userRecord.first_name as string | null | undefined) ??
      null,
    email: (userRecord.email as string | null | undefined) ?? null,
    is_premium:
      (userRecord.is_premium as CefisUserSummary["is_premium"]) ?? null,
    premium_plan_active:
      (userRecord.premium_plan_active as CefisUserSummary["premium_plan_active"]) ??
      null,
    is_demo_subscriber:
      (userRecord.is_demo_subscriber as CefisUserSummary["is_demo_subscriber"]) ??
      null,
  };
}

export async function POST(request: Request) {
  let credentials: LoginRequest;

  try {
    credentials = (await request.json()) as LoginRequest;
  } catch {
    return Response.json({ error: "Credenciais invalidas." }, { status: 400 });
  }

  const email = credentials.email?.trim();
  const password = credentials.password;

  if (!email || !password) {
    return Response.json(
      { error: "E-mail e senha sao obrigatorios." },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(CEFIS_LOGIN_URL, {
      method: "POST",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, pass: password }),
    });
    const payload = (await response.json().catch(() => null)) as {
      data?: {
        key?: string;
        user?: unknown;
      };
      error?: {
        message?: string;
      };
    } | null;

    if (!response.ok) {
      return Response.json(
        {
          error:
            payload?.error?.message ??
            "Nao foi possivel autenticar com a CEFIS.",
        },
        { status: response.status },
      );
    }

    const apiKey = payload?.data?.key?.trim();

    if (!apiKey) {
      return Response.json(
        { error: "Login aceito, mas a API nao retornou data.key." },
        { status: 502 },
      );
    }

    return Response.json({
      ok: true,
      apiKey,
      user: extractUser(payload?.data?.user),
    });
  } catch {
    return Response.json(
      { error: "Nao foi possivel conectar ao login da CEFIS." },
      { status: 502 },
    );
  }
}
