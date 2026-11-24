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
function detectImage(bytes: Uint8Array): "image/jpeg" | null {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    ? "image/jpeg"
    : null;
}
function jpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  let offset = 2;
  const sof = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++];
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) return null;
    if (sof.has(marker)) {
      const height = (bytes[offset + 3] << 8) | bytes[offset + 4];
      const width = (bytes[offset + 5] << 8) | bytes[offset + 6];
      return width > 0 && height > 0 ? { width, height } : null;
    }
    offset += length;
  }
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
      if (!actualType || actualType !== declaredType) return json(req, 415, { error: "La photo doit être réencodée en JPEG avant son envoi." });
      const dimensions = jpegDimensions(raw);
      if (!dimensions || dimensions.width > 4000 || dimensions.height > 4000 || dimensions.width * dimensions.height > 16000000) {
        return json(req, 415, { error: "Dimensions de photo invalides ou trop importantes." });
      }

      const { error: authError } = await admin.rpc("qspicy_media_targets", {
        p_room_id: roomId, p_player_token: token, p_scope: scope,
      });
      if (authError) return json(req, 403, { error: errorMessage(authError) });

      const extension = "jpg";
      const path = `${roomId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, raw.buffer as ArrayBuffer, {
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
        const { error: expiredRemoveError } = await admin.storage.from(BUCKET).remove(expiredQuery.data.map((row: { object_path: string }) => row.object_path));
        if (!expiredRemoveError) {
          await admin.from("room_media").delete().in("id", expiredQuery.data.map((row: { id: string }) => row.id));
        }
      }
      if (data.room_status === "finished") {
        const all = await admin.from("room_media").select("id,object_path").eq("room_id", roomId);
        if (all.data?.length) {
          const { error: finishRemoveError } = await admin.storage.from(BUCKET).remove(all.data.map((row: { object_path: string }) => row.object_path));
          if (!finishRemoveError) await admin.from("room_media").delete().eq("room_id", roomId);
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
      const { data: path, error: authError } = await admin.rpc("qspicy_media_delete_path", {
        p_room_id: roomId, p_player_token: token, p_media_id: mediaId,
      });
      if (authError || !path) return json(req, 403, { error: errorMessage(authError) });
      const { error: removeError } = await admin.storage.from(BUCKET).remove([path]);
      if (removeError) return json(req, 502, { error: "La photo est conservée ; son fichier n'a pas encore pu être supprimé." });
      const { error: deleteError } = await admin.rpc("qspicy_media_delete", {
        p_room_id: roomId, p_player_token: token, p_media_id: mediaId,
      });
      if (deleteError) return json(req, 502, { error: "Le fichier a été supprimé, mais sa référence doit encore être nettoyée." });
      return json(req, 200, { deleted: true });
    }

    return json(req, 405, { error: "Action ou méthode non autorisée." });
  } catch (error) {
    return json(req, 500, { error: errorMessage(error) });
  }
});
