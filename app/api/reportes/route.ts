const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbythH49QDgXyfeOM5KV47u2FwjwheJisJA6F3e79uREGDSv67xytEp-IgykhwVMp3L_Vg/exec";

export async function GET(request: Request) {
  try {
    const incomingUrl = new URL(request.url);

    const targetUrl =
      APPS_SCRIPT_URL + incomingUrl.search;

    const response = await fetch(targetUrl, {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
    });

    const text = await response.text();

    return new Response(text, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") ||
          "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("ERROR API REPORTES:", error);

    return Response.json(
      {
        ok: false,
        error: "No fue posible conectar con Google Sheets.",
      },
      {
        status: 500,
      }
    );
  }
}
