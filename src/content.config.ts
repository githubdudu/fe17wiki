import { defineCollection } from "astro:content";
import { file } from "astro/loaders";
import { parse } from "csv-parse/sync";


const characters = defineCollection({
  loader: file('src/data/characters.csv',
    {
      parser: (text) => parse(text, { columns: true, bom: true, skip_empty_lines: true }),
    }
  )
})

export const collections = { characters };