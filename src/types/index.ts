export interface FileMeta {
  id: string;
  section_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  uploaded_at: string;
  // Signed URL is generated on-demand, not stored
  url?: string;
}

export interface Section {
  id: string;
  page_id: string;
  title: string;
  content: string;
  sort_order: number;
  created_at: string;
  files: FileMeta[];
}

export interface Page {
  id: string;
  slug: string;
  visibility: "public" | "private";
  created_at: string;
  expires_at: string | null;
  sections: Section[];
}
