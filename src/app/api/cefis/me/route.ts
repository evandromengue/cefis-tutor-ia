const CEFIS_ME_URL = "https://cefis.com.br/api/v1/user/me";

type CefisUserSummary = {
  id?: number | string | null;
  name?: string | null;
  email?: string | null;
  is_premium?: boolean | number | string | null;
  premium_plan_active?: boolean | number | string | null;
  is_demo_subscriber?: boolean | number | string | null;
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

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const apiKey = authorization.trim();

  if (!apiKey) {
    return Response.json(
      { error: "Chave de API obrigatória." },
      { status: 401 },
    );
  }

  try {
    const response = await fetch(CEFIS_ME_URL, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: apiKey,
      },
    });
    const payload = (await response.json().catch(() => null)) as unknown;

    if (!response.ok) {
      return Response.json(
        { error: "Não foi possível carregar o usuário CEFIS." },
        { status: response.status },
      );
    }

    return Response.json({ user: extractUser(payload) });
  } catch {
    return Response.json(
      { error: "Não foi possível consultar o usuário CEFIS." },
      { status: 502 },
    );
  }
}
