import { defineCollection } from "astro:content";
import { file } from "astro/loaders";
import { parse } from "csv-parse/sync";


const characters = defineCollection({
  loader: file('src/data/characters.csv',
    {
      parser: (text) =>
        parse<Record<string, string>>(text, { columns: true, bom: true, skip_empty_lines: true })
          .map((r, i) => ({ ...r, order: i })),
    }
  )
})

const skills = defineCollection({
  loader: file('src/data/skills.csv',
    {
      parser: (text) =>
        parse<Record<string, string>>(text, { columns: true, bom: true, skip_empty_lines: true })
          .map((r, i) => ({ ...r, order: i })),
    }
  )
})

const classes = defineCollection({
  loader: file('src/data/classes.csv',
    {
      parser: (text) =>
        parse<Record<string, string>>(text, { columns: true, bom: true, skip_empty_lines: true })
          .map((r, i) => ({ ...r, order: i })),
    }
  )
})

const emblems = defineCollection({
  loader: file('src/data/emblems.csv',
    {
      parser: (text) =>
        parse<Record<string, string>>(text, { columns: true, bom: true, skip_empty_lines: true })
          .map((r, i) => ({ ...r, order: i })),
    }
  )
})

const chapters = defineCollection({
  loader: file('src/data/chapters.csv',
    {
      parser: (text) =>
        parse<Record<string, string>>(text, { columns: true, bom: true, skip_empty_lines: true })
          .map((r, i) => ({ ...r, order: i })),
    }
  )
})

export const collections = { characters, skills, classes, emblems, chapters };