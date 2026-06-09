import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    description: z.string().optional(),
    date: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('Harry'),
    tags: z.array(z.string()).default([]),
    category: z.string().optional(),
    heroImage: z.string().optional(),
    draft: z.boolean().default(false)
  })
});

export const collections = { blog };
