export type Character = {
  id: string;
  name: string;
  img?: string;
  initClass: string;
  group: string;
};

export type Named = { name: string; img?: string; group?: string };