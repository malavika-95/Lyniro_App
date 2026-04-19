import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const { GET: authGET, POST: authPOST } = toNextJsHandler(auth);

function withCors(handler) {
  return async (req, ...args) => {
    const origin = req.headers.get("origin");
    const headers= {
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    };
    if (origin) {
      headers["Access-Control-Allow-Origin"] = origin;
    }
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }
    const res = await handler(req, ...args);
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  };
}

export const GET = withCors(authGET);
export const POST = withCors(authPOST);
export const OPTIONS = withCors(() => new Response(null, { status: 204 }));
