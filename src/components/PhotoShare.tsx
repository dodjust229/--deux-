import { useEffect, useRef, useState } from "react";
import { deleteRoomPhoto, getRoomPhotos, uploadRoomPhoto, type RoomPhotoState } from "../api";
import { Icon } from "./Icon";

type Props = {
  roomId: string;
  token: string;
  myPlayerId: string;
  mode: "couple" | "duos";
  onPermissionChange?: (allow: boolean) => void;
};

async function preparePhoto(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Choisis une image depuis ta galerie.");
  if (file.size > 20 * 1024 * 1024) throw new Error("La photo originale dépasse 20 Mo.");
  let bitmap: ImageBitmap | null = null;
  let imageUrl = "";
  let source: CanvasImageSource;
  let width = 0;
  let height = 0;
  try {
    if (typeof createImageBitmap === "function") {
      try {
        bitmap = await createImageBitmap(file);
        source = bitmap;
        width = bitmap.width;
        height = bitmap.height;
      } catch {
        bitmap = null;
      }
    }
    if (!bitmap) {
      imageUrl = URL.createObjectURL(file);
      const image = new Image();
      image.src = imageUrl;
      await image.decode();
      source = image;
      width = image.naturalWidth;
      height = image.naturalHeight;
    }
    if (!width || !height) throw new Error("Cette image ne peut pas être lue par le navigateur.");
    const scale = Math.min(1, 1600 / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Impossible de préparer l'image.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    let quality = 0.84;
    let blob: Blob | null = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= 5 * 1024 * 1024) break;
      quality -= 0.12;
    }
    if (!blob || blob.size > 5 * 1024 * 1024) throw new Error("Cette photo reste trop lourde après compression.");
    return blob;
  } finally {
    bitmap?.close();
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  }
}

export function PhotoShare({ roomId, token, myPlayerId, mode, onPermissionChange }: Props) {
  const [state, setState] = useState<RoomPhotoState | null>(null);
  const [scope, setScope] = useState<"partner" | "duo" | "group">(mode === "duos" ? "duo" : "partner");
  const [selected, setSelected] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    try {
      const next = await getRoomPhotos(roomId, token);
      setState(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible de charger les photos.");
    }
  };

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const next = await getRoomPhotos(roomId, token);
        if (alive) setState(next);
      } catch (caught) {
        if (alive) setError(caught instanceof Error ? caught.message : "Impossible de charger les photos.");
      }
    };
    void load();
    const timer = window.setInterval(load, 6000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [roomId, token]);

  useEffect(() => {
    if (!selected) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(selected);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [selected]);

  const others = state?.players.filter((p) => p.id !== myPlayerId) ?? [];
  const myPlayer = state?.players.find((p) => p.id === myPlayerId);
  const partner = others.find((p) => mode === "couple" || p.duo_no === myPlayer?.duo_no);
  const groupAllowed = mode === "duos" && others.length === 3 &&
    state?.players.every((p) => p.cross_participation) &&
    others.every((p) => p.receive_media);
  const duoAllowed = mode === "duos" && Boolean(partner?.receive_media);
  const partnerAllowed = mode === "couple" && Boolean(partner?.receive_media);
  const canSend = mode === "couple"
    ? partnerAllowed
    : scope === "group" ? Boolean(groupAllowed) : duoAllowed;

  const choose = (file?: File) => {
    setError("");
    setSelected(file ?? null);
  };

  const send = async () => {
    if (!selected || !canSend) return;
    setBusy(true);
    setError("");
    try {
      const photo = await preparePhoto(selected);
      await uploadRoomPhoto(roomId, token, scope, photo);
      setSelected(null);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Envoi impossible.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    setError("");
    try {
      await deleteRoomPhoto(roomId, token, id);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Suppression impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <details className="panel photo-share">
      <summary>
        <span><Icon name="image" size={17} /> Photos personnelles</span>
        <small>Galerie · partage privé</small>
      </summary>
      <p className="muted small">Choisis une photo dans la galerie de ton téléphone ou de ton ordinateur. Elle est compressée avant l'envoi et n'est visible que par les destinataires autorisés.</p>

      {mode === "couple" ? (
        <label className="duo-toggle photo-share__permission">
          <input type="checkbox" checked={Boolean(state?.my_receive_media)} disabled={!state || busy}
            onChange={(event) => onPermissionChange?.(event.target.checked)} />
          <span>J'accepte de recevoir les photos de mon partenaire.</span>
        </label>
      ) : (
        <p className="muted small">Réception des photos : {state?.my_receive_media ? "autorisée" : "désactivée"}. Tu peux modifier cette autorisation dans « Mes autorisations ».</p>
      )}

      {mode === "duos" && (
        <label className="field photo-share__scope">
          <span>Envoyer à</span>
          <select value={scope} onChange={(event) => setScope(event.target.value as "duo" | "group")} disabled={busy}>
            <option value="duo">Mon duo</option>
            <option value="group" disabled={!groupAllowed}>Les quatre joueurs · accord collectif requis</option>
          </select>
        </label>
      )}

      <div className="photo-share__send">
        <input ref={inputRef} className="photo-share__file" type="file" accept="image/*" onChange={(event) => choose(event.target.files?.[0])} />
        <button className="secondary" type="button" onClick={() => inputRef.current?.click()} disabled={busy}>
          <Icon name="image" /> Choisir dans ma galerie
        </button>
        {selected && (
          <div className="photo-share__preview">
            <img src={preview} alt="Aperçu de la photo à envoyer" />
            <div className="photo-share__preview-actions">
              <button className="secondary" type="button" onClick={() => setSelected(null)} disabled={busy}>Annuler</button>
              <button className="primary" type="button" onClick={send} disabled={busy || !canSend}>
                {busy ? "Envoi…" : "Confirmer l'envoi"} <Icon name="send" />
              </button>
            </div>
            {!canSend && <small className="muted">Le destinataire doit d'abord autoriser la réception des photos.</small>}
          </div>
        )}
      </div>

      {error && <p className="photo-share__error" role="alert">{error}</p>}

      <div className="photo-share__gallery">
        {(state?.items ?? []).map((photo) => {
          const sender = state?.players.find((p) => p.id === photo.sender_player_id);
          const mine = photo.sender_player_id === myPlayerId;
          return (
            <figure key={photo.id}>
              <a href={photo.signed_url} target="_blank" rel="noreferrer">
                <img src={photo.signed_url} alt={`Photo partagée par ${sender?.nickname ?? "un joueur"}`} loading="lazy" />
              </a>
              <figcaption>
                <span>{mine ? "Envoyée par toi" : sender?.nickname ?? "Joueur"}</span>
                {mine && <button type="button" className="photo-share__delete" onClick={() => void remove(photo.id)} disabled={busy} aria-label="Supprimer cette photo"><Icon name="close" size={14} /></button>}
              </figcaption>
            </figure>
          );
        })}
        {state && state.items.length === 0 && <p className="muted small">Aucune photo partagée pour le moment.</p>}
      </div>
      <p className="muted small">Les photos restent privées, expirent après 6 heures et sont nettoyées à la fin de la partie ou au départ. Si tous les navigateurs se ferment brutalement, le nettoyage physique intervient à la prochaine ouverture de la salle. Une capture d'écran reste toujours possible sur l'appareil du destinataire.</p>
    </details>
  );
}
