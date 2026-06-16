import { defineConfig } from 'astro/config';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import remarkMath from 'remark-math';

export default defineConfig({
  site: 'https://words.hackiey.com',
  output: 'static',
  devToolbar: {
    enabled: false
  },
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [
      rehypeKatex,
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: 'append',
          properties: {
            className: ['heading-anchor']
          },
          content: {
            type: 'text',
            value: '#'
          }
        }
      ]
    ],
    shikiConfig: {
      theme: 'github-dark'
    }
  }
});
