const CEFIS_API_BASE_URL = "https://api-v3.cefis.com.br";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const courseId = requestUrl.searchParams.get("courseId");

  if (!courseId) {
    return Response.json(
      { data: [], error: "courseId é obrigatório." },
      { status: 400 },
    );
  }

  const cefisUrl = new URL(
    `/courses/${encodeURIComponent(courseId)}/lessons`,
    CEFIS_API_BASE_URL,
  );

  try {
    const response = await fetch(cefisUrl, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    const body = await response.text();

    return new Response(body, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return Response.json(
      { data: [], error: "Não foi possível consultar aulas da CEFIS." },
      { status: 502 },
    );
  }
}
