import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "qspicy-private-media";
const MAX_BYTES = 5 * 1024 * 1024;
const corsBase = {
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-player-token",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Vary": "Origin",
};

function cors(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = new Set(["https://a-deux-jeu.onrender.com", "http://localhost:5173", "http://127.0.0.1:5173"]);
  return { ...corsBase, "Access-Control-Allow-Origin": allowed.has(origin) ? origin : "https://a-deux-jeu.onrender.com" };
}
function json(req: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
function validUuid(value: string | null): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}
function detectImage(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}
function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Opération impossible.";
  return message.length > 220 ? "Opération impossible. Vérifie les autorisations et réessaie." : message;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json(req, 503, { error: "Stockage photo non configuré côté serveur." });

  const roomId = new URL(req.url).searchParams.get("room_id");
  const action = new URL(req.url).searchParams.get("action") ?? (req.method === "GET" ? "list" : "");
  const token = req.headers.get("x-player-token") ?? "";
  if (!validUuid(roomId) || token.length !== 64) return json(req, 400, { error: "Session ou salle invalide." });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    if (req.method === "POST" && action === "upload") {
      const scope = new URL(req.url).searchParams.get("scope") ?? "";
      const declaredType = req.headers.get("Content-Type")?.split(";")[0].trim() ?? "";
      const raw = new Uint8Array(await req.arrayBuffer());
      if (raw.byteLength < 1 || raw.byteLength > MAX_BYTES) return json(req, 413, { error: "La photo doit peser 5 Mo maximum." });
      const actualType = detectImage(raw);
      if (!actualType || actualType !== declaredType) return json(req, 415, { error: "Format refusé. Utilise une photo JPEG, PNG ou WebP." });

      const { error: authError } = await admin.rpc("qspicy_media_targets", {
        p_room_id: roomId, p_player_token: token, p_scope: scope,
      });
      if (authError) return json(req, 403, { error: errorMessage(authError) });

      const extension = actualType === "image/jpeg" ? "jpg" : actualType === "image/png" ? "png" : "webp";
      const path = `${roomId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, raw, {
        contentType: actualType, cacheControl: "60", upsert: false,
      });
      if (uploadError) return json(req, 502, { error: "La photo n'a pas pu être enregistrée. Réessaie." });

      const { data: registered, error: registerError } = await admin.rpc("qspicy_media_register", {
        p_room_id: roomId, p_player_token: token, p_scope: scope,
        p_object_path: path, p_mime_type: actualType, p_byte_size: raw.byteLength,
      });
      if (registerError || !registered) {
        await admin.storage.from(BUCKET).remove([path]);
        return json(req, 403, { error: errorMessage(registerError) });
      }
      return json(req, 201, { photo: registered });
    }

    if (req.method === "GET" && action === "list") {
      const { data, error } = await admin.rpc("qspicy_media_list", { p_room_id: roomId, p_player_token: token });
      if (error || !data) return json(req, 403, { error: errorMessage(error) });

      const rows = Array.isArray(data.items) ? data.items : [];
      const items = [];
      for (const row of rows) {
        const { data: signed, error: signError } = await admin.storage.from(BUCKET).createSignedUrl(row.object_path, 300);
        if (!signError && signed?.signedUrl) items.push({ ...row, signed_url: signed.signedUrl });
      }
      const expiredQuery = await admin.from("room_media").select("id,object_path").eq("room_id", roomId).lte("expires_at", new Date().toISOString());
      if (expiredQuery.data?.length) {
        await admin.storage.from(BUCKET).remove(expiredQuery.data.map((row: { object_path: string }) => row.object_path));
        await admin.from("room_media").delete().in("id", expiredQuery.data.map((row: { id: string }) => row.id));
      }
      if (data.room_status === "finished") {
        const all = await admin.from("room_media").select("id,object_path").eq("room_id", roomId);
        if (all.data?.length) {
          await admin.storage.from(BUCKET).remove(all.data.map((row: { object_path: string }) => row.object_path));
          await admin.from("room_media").delete().eq("room_id", roomId);
        }
        return json(req, 200, { my_receive_media: data.my_receive_media, players: data.players, items: [] });
      }
      return json(req, 200, { my_receive_media: data.my_receive_media, players: data.players, items });
    }

    if (req.method === "DELETE" && action === "cleanup_room") {
      const { error: accessError } = await admin.rpc("qspicy_media_list", { p_room_id: roomId, p_player_token: token });
      if (accessError) return json(req, 403, { error: errorMessage(accessError) });
      const all = await admin.from("room_media").select("id,object_path").eq("room_id", roomId);
      if (all.data?.length) {
        const { error: removeError } = await admin.storage.from(BUCKET).remove(all.data.map((row: { object_path: string }) => row.object_path));
        if (removeError) return json(req, 502, { error: "Les photos sont répertoriées, mais le nettoyage du stockage a échoué." });
        await admin.from("room_media").delete().eq("room_id", roomId);
      }
      return json(req, 200, { cleaned: true });
    }

    if (req.method === "DELETE" && action === "delete") {
      const mediaId = new URL(req.url).searchParams.get("media_id");
      if (!validUuid(mediaId)) return json(req, 400, { error: "Photo invalide." });
      const { data: path, error } = await admin.rpc("qspicy_media_delete", {
        p_room_id: roomId, p_player_token: token, p_media_id: mediaId,
      });
      if (error || !path) return json(req, 403, { error: errorMessage(error) });
      const { error: removeError } = await admin.storage.from(BUCKET).remove([path]);
      if (removeError) return json(req, 502, { error: "La photo est masquée, mais son fichier n'a pas encore pu être supprimé." });
      return json(req, 200, { deleted: true });
    }

    return json(req, 405, { error: "Action ou méthode non autorisée." });
  } catch (error) {
    return json(req, 500, { error: errorMessage(error) });
  }
});
