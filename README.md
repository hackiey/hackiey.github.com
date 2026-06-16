# Harry's Notes

Rebuilt with Astro and deployed with GitHub Pages.

## Development

```bash
npm install
npm run dev
```

## Obsidian Sync

```bash
OBSIDIAN_VAULT_DIR="/path/to/your/vault" npm run sync-notes
```

默认会扫描整个 Obsidian vault，只导出带 `publish` tag 的笔记。

导出 tag 和文章 tags 都从正文里的 `#tag` 解析，比如：

```md
#publish #强化学习 #论文
```

导出目标仍然是：

- `src/content/blog/`: 生成的博客 Markdown，直接和其他文章放在一起，扁平输出，不保留原 Obsidian 目录层级
- `public/notes-assets/`: 笔记里引用的本地附件，扁平输出，不保留原 Obsidian 目录层级

同步脚本会：

- 读取 Obsidian Markdown frontmatter
- 根据 Obsidian tags 判断是否导出
- `tags` 从正文里的 `#tag` 解析
- 把 `[[双链]]` 转成博客链接
- 把 `![[图片.png]]` 和相对路径附件复制到站点静态目录
- 自动把控制用的 `publish` tag 从博客文章标签里剔掉
- 只要求你在 Obsidian 里写 `date`
- `title` 优先取 frontmatter，其次取正文开头的 `# 一级标题`，再其次取文件名
- `description` 没写时，会从正文第一段自动生成
- `author` 没写时，默认 `Harry`
- `draft` 没写时，默认 `false`
- 缺少 `date` 的笔记会被跳过，并输出 warning
- 如果多个笔记文件名重名，脚本会自动在导出文件名后加 `-2`、`-3` 这样的后缀
- 如果多个附件文件名重名，脚本也会自动在附件文件名后加 `-2`、`-3` 这样的后缀

可选环境变量：

- `OBSIDIAN_EXPORT_TAG`: 导出 tag，默认 `publish`
- `OBSIDIAN_BLOG_OUT_DIR`: 输出 Markdown 目录，默认 `src/content/blog`
- `OBSIDIAN_BLOG_ASSET_DIR`: 输出附件目录，默认 `public/notes-assets`
- `OBSIDIAN_BLOG_ASSET_BASE`: 附件访问前缀，默认 `/notes-assets`

最小可用写法：

```md
---
date: 2026-06-11
---

# AlphaGo 读书笔记

#publish #强化学习 #论文

正文开始。
```

注意：

- 同步出来的 Markdown 会直接写到 `src/content/blog/`；脚本只会清理它自己上一次生成的文件，不会删掉你原来手写的文章
- 其他字段如果你想手动覆盖，仍然可以继续写在 Obsidian frontmatter 里

## Build

```bash
npm run build
```

## Structure

- `src/content/blog/`: blog posts in Markdown
- `public/img/`: static images from the old site
- `public/CNAME`: custom domain for GitHub Pages
- `.github/workflows/deploy.yml`: GitHub Pages deployment workflow

## Deployment

Push to the `main` branch after the repository is connected to GitHub Pages with `GitHub Actions` as the publishing source.
