import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* ------------------------- Client identity (anon) ------------------------- */

const ID_KEY = "atelier.client.id";
const NAME_KEY = "atelier.client.name";

export interface ClientIdentity {
  id: string;
  name: string | null;
}

export function getClientIdentity(): ClientIdentity {
  if (typeof window === "undefined") return { id: "", name: null };
  let id = window.localStorage.getItem(ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(ID_KEY, id);
  }
  const name = window.localStorage.getItem(NAME_KEY);
  return { id, name: name && name.trim() ? name : null };
}

export function setClientName(name: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NAME_KEY, name.trim().slice(0, 60));
}

export function useClientIdentity() {
  const [identity, setIdentity] = useState<ClientIdentity>({ id: "", name: null });
  useEffect(() => {
    setIdentity(getClientIdentity());
  }, []);
  const updateName = useCallback((name: string) => {
    setClientName(name);
    setIdentity((cur) => ({ ...cur, name: name.trim() || null }));
  }, []);
  return { identity, setName: updateName };
}

/* ------------------------------- Types ----------------------------------- */

export type ReactionKind = "love" | "pass";
export type Decision = "approve" | "changes";

export interface Reaction {
  id: string;
  itemId: string;
  clientId: string;
  clientName: string;
  kind: ReactionKind;
}

export interface FeedbackEntry {
  id: string;
  itemId: string | null;
  clientId: string;
  clientName: string;
  body: string;
  decision: Decision | null;
  seenByOwner: boolean;
  createdAt: number;
  resolved: boolean;
  internalNote: string | null;
}

type RxRow = {
  id: string;
  item_id: string;
  client_id: string;
  client_name: string;
  kind: ReactionKind;
};

type FbRow = {
  id: string;
  item_id: string | null;
  client_id: string;
  client_name: string;
  body: string;
  decision: Decision | null;
  seen_by_owner: boolean;
  created_at: string;
  resolved?: boolean | null;
  internal_note?: string | null;
};

function rxFrom(r: RxRow): Reaction {
  return { id: r.id, itemId: r.item_id, clientId: r.client_id, clientName: r.client_name, kind: r.kind };
}
function fbFrom(r: FbRow): FeedbackEntry {
  return {
    id: r.id,
    itemId: r.item_id,
    clientId: r.client_id,
    clientName: r.client_name,
    body: r.body,
    decision: r.decision,
    seenByOwner: r.seen_by_owner,
    createdAt: new Date(r.created_at).getTime(),
    resolved: Boolean(r.resolved),
    internalNote: r.internal_note ?? null,
  };
}

/* ----------------------------- Public hooks ------------------------------ */

export function useBoardFeedback(
  projectId: string | null | undefined,
  options: { ownerView?: boolean } = {},
) {
  const ownerView = options.ownerView ?? false;
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!projectId) return;
    const fbCols = ownerView
      ? "id, item_id, client_id, client_name, body, decision, seen_by_owner, created_at, resolved, internal_note"
      : "id, item_id, client_id, client_name, body, decision, seen_by_owner, created_at";
    const [{ data: rx }, { data: fb }] = await Promise.all([
      supabase
        .from("board_reactions")
        .select("id, item_id, client_id, client_name, kind")
        .eq("project_id", projectId),
      supabase
        .from("board_feedback")
        .select(fbCols)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
    ]);
    setReactions((rx ?? []).map((r) => rxFrom(r as RxRow)));
    setFeedback((fb ?? []).map((r) => fbFrom(r as FbRow)));
    setLoaded(true);
  }, [projectId, ownerView]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Toggle reaction for a given client+item
  const toggleReaction = useCallback(
    async (
      itemId: string,
      kind: ReactionKind,
      identity: ClientIdentity,
    ) => {
      if (!projectId || !identity.id) return;
      const existing = reactions.find((r) => r.itemId === itemId && r.clientId === identity.id);
      const clientName = identity.name?.trim() || "Guest";
      if (existing && existing.kind === kind) {
        // remove
        setReactions((cur) => cur.filter((r) => r.id !== existing.id));
        const { error } = await supabase.rpc("delete_my_reaction", {
          _id: existing.id,
          _client_id: identity.id,
        });
        if (error) {
          console.error(error);
          toast.error("Couldn't remove your reaction. Please try again.");
          refresh();
        }
        return;
      }
      if (existing) {
        // switch kind
        setReactions((cur) =>
          cur.map((r) => (r.id === existing.id ? { ...r, kind, clientName } : r)),
        );
        const { error } = await supabase.rpc("update_my_reaction", {
          _id: existing.id,
          _client_id: identity.id,
          _kind: kind,
          _client_name: clientName,
        });
        if (error) {
          console.error(error);
          toast.error("Couldn't save your reaction. Please try again.");
          refresh();
        }
        return;
      }
      // insert
      const { data, error } = await supabase
        .from("board_reactions")
        .insert({
          project_id: projectId,
          item_id: itemId,
          client_id: identity.id,
          client_name: clientName,
          kind,
        })
        .select("id, item_id, client_id, client_name, kind")
        .single();
      if (error || !data) {
        console.error(error);
        toast.error(error?.message ?? "Couldn't save your reaction. Please try again.");
        return;
      }
      setReactions((cur) => [...cur, rxFrom(data as RxRow)]);
    },
    [projectId, reactions, refresh],
  );

  const addComment = useCallback(
    async (itemId: string | null, body: string, identity: ClientIdentity, decision: Decision | null = null) => {
      if (!projectId || !identity.id) return null;
      const clientName = identity.name?.trim() || "Guest";
      const { data, error } = await supabase
        .from("board_feedback")
        .insert({
          project_id: projectId,
          item_id: itemId,
          client_id: identity.id,
          client_name: clientName,
          body,
          decision,
        })
        .select("id, item_id, client_id, client_name, body, decision, seen_by_owner, created_at")
        .single();
      if (error || !data) {
        console.error(error);
        toast.error(error?.message ?? "Couldn't post your comment. Please try again.");
        return null;
      }
      const entry = fbFrom(data as FbRow);
      setFeedback((cur) => [entry, ...cur]);
      return entry;
    },
    [projectId],
  );

  const markAllSeen = useCallback(async () => {
    if (!projectId) return;
    const unseen = feedback.filter((f) => !f.seenByOwner).map((f) => f.id);
    if (unseen.length === 0) return;
    setFeedback((cur) => cur.map((f) => (unseen.includes(f.id) ? { ...f, seenByOwner: true } : f)));
    const { error } = await supabase
      .from("board_feedback")
      .update({ seen_by_owner: true })
      .in("id", unseen);
    if (error) console.error(error);
  }, [projectId, feedback]);

  const setResolved = useCallback(
    async (id: string, resolved: boolean) => {
      setFeedback((cur) => cur.map((f) => (f.id === id ? { ...f, resolved } : f)));
      const { error } = await supabase
        .from("board_feedback")
        .update({ resolved })
        .eq("id", id);
      if (error) {
        console.error(error);
        toast.error("Couldn't update status. Please try again.");
        setFeedback((cur) => cur.map((f) => (f.id === id ? { ...f, resolved: !resolved } : f)));
      }
    },
    [],
  );

  const setInternalNote = useCallback(
    async (id: string, note: string) => {
      const trimmed = note.trim();
      const value = trimmed.length ? trimmed : null;
      setFeedback((cur) => cur.map((f) => (f.id === id ? { ...f, internalNote: value } : f)));
      const { error } = await supabase
        .from("board_feedback")
        .update({ internal_note: value })
        .eq("id", id);
      if (error) {
        console.error(error);
        toast.error("Couldn't save internal note.");
      }
    },
    [],
  );

  return { reactions, feedback, loaded, refresh, toggleReaction, addComment, markAllSeen, setResolved, setInternalNote };
}

/* ----------------------------- Time helper ------------------------------- */

export function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const s = Math.round(diff / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.round(mo / 12)}y ago`;
}