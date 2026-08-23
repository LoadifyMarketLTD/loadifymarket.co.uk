const ID_PATTERN = /^[A-Za-z0-9_-]{6,80}$/;
const IMAGE_ID_PATTERN = /^photo-[A-Za-z0-9_-]{10,80}$/;

export default async (request: Request): Promise<Response> => {
  if (request.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const id = url.searchParams.get("id") ?? "";

  if (kind !== "image" && kind !== "download") {
    return new Response("Invalid image kind", { status: 400 });
  }

  if (kind === "image" ? !IMAGE_ID_PATTERN.test(id) : !ID_PATTERN.test(id)) {
    return new Response("Invalid image id", { status: 400 });
  }

  const upstream =
    kind === "image"
      ? `https://images.unsplash.com/${id}?auto=format&fit=crop&fm=jpg&q=84&w=1200&h=900`
      : `https://unsplash.com/photos/${id}/download?force=true&w=1200`;

  try {
    const response = await fetch(upstream, {
      redirect: "follow",
      headers: {
        Accept: "image/avif,image/webp,image/jpeg,image/*,*/*;q=0.8",
        "User-Agent": "LoadifyMarket/1.0 editorial-image-proxy",
      },
    });

    if (!response.ok || !response.body) {
      return new Response("Editorial image unavailable", { status: 502 });
    }

    const resolved = new URL(response.url);
    if (resolved.protocol !== "https:" || resolved.hostname !== "images.unsplash.com") {
      return new Response("Unexpected editorial image origin", { status: 502 });
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return new Response("Invalid editorial image payload", { status: 502 });
    }

    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > 8 * 1024 * 1024) {
      return new Response("Editorial image too large", { status: 502 });
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400",
        "CDN-Cache-Control": "public, max-age=2592000, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[category-editorial-image] upstream fetch failed", error);
    return new Response("Editorial image unavailable", { status: 502 });
  }
};
