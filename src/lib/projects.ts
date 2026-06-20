import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Project {
  id: string;
  title: string;
  description: string;
  cover: string;
  palette: string[];
  createdAt: number;
  imageCount?: number;
  shareToken?: string | null;
}

export interface BoardImage {
  id: string;
  src: string;
  storagePath?: string | null;
  caption?: string | null;
  addedAt: number;
  tags: string[];
}

const BUCKET = "moodboard-images";
const SIGNED_TTL = 60 * 60 * 24 * 365; // 1 year

const PALETTES = [
  ["#0f0f0f", "#2a2a2a", "#d4a574", "#f5f0e6"],
  ["#1a2e3d", "#4a7a8c", "#e8d4b8", "#f0e8dc"],
  ["#2d3a1f", "#7a8b5c", "#d4c5a0", "#f4ede2"],
  ["#3d1f2a", "#8b4a5c", "#d4a5b8", "#f0e0e4"],
];

type ProjectRow = {
  id: string;
  title: string;
  description: string;
  cover: string;
  palette: string[];
  created_at: string;
  share_token?: string | null;
  moodboard_items?: { count: number }[] | { count: number };
};

function rowToProject(r: ProjectRow): Project {
  const counts = Array.isArray(r.moodboard_items) ? r.moodboard_items : r.moodboard_items ? [r.moodboard_items] : [];
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    cover: r.cover,
    palette: r.palette ?? [],
    createdAt: new Date(r.created_at).getTime(),
    imageCount: counts[0]?.count ?? 0,
    shareToken: r.share_token ?? null,
  };
}

type ItemRow = {
  id: string;
  src: string;
  storage_path: string | null;
  caption: string | null;
  tags: string[];
  created_at: string;
};

function rowToImage(r: ItemRow): BoardImage {
  return {
    id: r.id,
    src: r.src,
    storagePath: r.storage_path,
    caption: r.caption,
    addedAt: new Date(r.created_at).getTime(),
    tags: r.tags ?? [],
  };
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*, moodboard_items(count)")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      setProjects([]);
    } else {
      setProjects((data ?? []).map((r) => rowToProject(r as ProjectRow)));
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async (title: string): Promise<Project | null> => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return null;
    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: uid,
        title: title || "Untitled Board",
        description: "A new visual exploration.",
        palette: [],
      })
      .select("*")
      .single();
    if (error || !data) {
      console.error(error);
      return null;
    }
    const project = rowToProject(data as ProjectRow);
    setProjects((p) => [project, ...p]);
    return project;
  }, []);

  const remove = useCallback(async (projectId: string) => {
    setProjects((cur) => cur.filter((p) => p.id !== projectId));
    const { error } = await supabase.from("projects").delete().eq("id", projectId);
    if (error) console.error(error);
  }, []);

  return { projects, loaded, create, refresh, remove };
}

export function useProject(id: string) {
  const [project, setProject] = useState<Project | undefined>(undefined);
  const [images, setImages] = useState<BoardImage[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: p, error: pErr }, { data: items, error: iErr }] = await Promise.all([
        supabase.from("projects").select("*").eq("id", id).maybeSingle(),
        supabase.from("moodboard_items").select("*").eq("project_id", id).order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      if (pErr) console.error(pErr);
      if (iErr) console.error(iErr);
      setProject(p ? rowToProject(p as ProjectRow) : undefined);
      setImages((items ?? []).map((r) => rowToImage(r as ItemRow)));
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const patch = useCallback(
    async (changes: Partial<Pick<Project, "title" | "description" | "cover" | "palette">>) => {
      setProject((cur) => (cur ? { ...cur, ...changes } : cur));
      const dbPatch: {
        title?: string;
        description?: string;
        cover?: string;
        palette?: string[];
      } = {};
      if (changes.title !== undefined) dbPatch.title = changes.title;
      if (changes.description !== undefined) dbPatch.description = changes.description;
      if (changes.cover !== undefined) dbPatch.cover = changes.cover;
      if (changes.palette !== undefined) dbPatch.palette = changes.palette;
      const { error } = await supabase.from("projects").update(dbPatch).eq("id", id);
      if (error) console.error(error);
    },
    [id],
  );

  const remove = useCallback(async () => {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) console.error(error);
  }, [id]);

  const enableShare = useCallback(async (): Promise<string | null> => {
    if (project?.shareToken) return project.shareToken;
    const token = crypto.randomUUID();
    const { error } = await supabase.from("projects").update({ share_token: token }).eq("id", id);
    if (error) {
      console.error(error);
      return null;
    }
    setProject((cur) => (cur ? { ...cur, shareToken: token } : cur));
    return token;
  }, [id, project?.shareToken]);

  const insertItem = useCallback(
    async (row: { src: string; storage_path?: string | null; caption?: string | null }) => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return null;
      const { data, error } = await supabase
        .from("moodboard_items")
        .insert({
          project_id: id,
          user_id: uid,
          src: row.src,
          storage_path: row.storage_path ?? null,
          caption: row.caption ?? null,
          tags: [],
        })
        .select("*")
        .single();
      if (error || !data) {
        console.error(error);
        return null;
      }
      const img = rowToImage(data as ItemRow);
      setImages((cur) => [img, ...cur]);
      return img;
    },
    [id],
  );

  const uploadFile = useCallback(
    async (file: File) => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return null;
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${uid}/${id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) {
        console.error(upErr);
        return null;
      }
      const { data: signed, error: sErr } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, SIGNED_TTL);
      if (sErr || !signed) {
        console.error(sErr);
        return null;
      }
      return insertItem({ src: signed.signedUrl, storage_path: path });
    },
    [id, insertItem],
  );

  const addByUrl = useCallback(
    async (url: string, caption?: string) => insertItem({ src: url, caption }),
    [insertItem],
  );

  const removeImage = useCallback(async (imageId: string) => {
    const target = images.find((i) => i.id === imageId);
    setImages((cur) => cur.filter((i) => i.id !== imageId));
    if (target?.storagePath) {
      await supabase.storage.from(BUCKET).remove([target.storagePath]);
    }
    const { error } = await supabase.from("moodboard_items").delete().eq("id", imageId);
    if (error) console.error(error);
  }, [images]);

  const updateImageTags = useCallback(async (imageId: string, tags: string[]) => {
    setImages((cur) => cur.map((i) => (i.id === imageId ? { ...i, tags } : i)));
    const { error } = await supabase.from("moodboard_items").update({ tags }).eq("id", imageId);
    if (error) console.error(error);
  }, []);

  return {
    project,
    images,
    loaded,
    patch,
    remove,
    uploadFile,
    addByUrl,
    removeImage,
    updateImageTags,
    enableShare,
  };
}