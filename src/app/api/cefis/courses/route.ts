const CEFIS_API_BASE_URL = "https://api-v3.cefis.com.br";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const search = requestUrl.searchParams.get("search") ?? "";
  const count = requestUrl.searchParams.get("count") ?? "6";
  const cefisUrl = new URL("/courses", CEFIS_API_BASE_URL);

  cefisUrl.searchParams.set("search", search);
  cefisUrl.searchParams.set("count", count);

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
      { data: [], error: "Não foi possível consultar cursos da CEFIS." },
      { status: 502 },
    );
  }
}
