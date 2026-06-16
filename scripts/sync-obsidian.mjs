import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const IMAGE_EXTENSIONS = new Set([
  '.apng',
  '.avif',
  '.gif',
  '.jpeg',
  '.jpg',
  '.png',
  '.svg',
  '.webp'
]);

const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown']);
const DEFAULTS = {
  exportTag: 'publish',
  outDir: 'src/content/blog',
  assetDir: 'public/notes-assets',
  assetBase: '/notes-assets',
  legacyOutDir: 'src/content/blog/notes',
  manifestFile: '.obsidian-sync-manifest.json'
};

async function main() {
  const options = parseOptions(process.argv.slice(2), process.env);
  const repoRoot = process.cwd();
  const collectionRoot = path.resolve(repoRoot, 'src/content/blog');
  const manifestPath = path.resolve(repoRoot, DEFAULTS.manifestFile);
  const vaultRoot = options.vaultDir ? path.resolve(options.vaultDir) : null;

  if (!vaultRoot) {
    fail('Missing vault path. Use `--vault /path/to/vault` or set `OBSIDIAN_VAULT_DIR`.');
  }

  const outRoot = path.resolve(repoRoot, options.outDir);
  const assetRoot = path.resolve(repoRoot, options.assetDir);
  const assetBase = normalizeAssetBase(options.assetBase);
  const exportTag = normalizeTag(options.exportTag);

  if (!exportTag) {
    fail('Missing export tag. Use `--tag publish` or set `OBSIDIAN_EXPORT_TAG`.');
  }

  if (!isWithinRoot(outRoot, collectionRoot)) {
    fail(`Output directory must stay inside ${collectionRoot}`);
  }

  await assertDirectory(vaultRoot, 'Obsidian vault');
  const vaultFiles = await listFiles(vaultRoot, {
    excludeDirNames: new Set(['.git', '.obsidian'])
  });
  const markdownFiles = vaultFiles.filter((filePath) =>
    MARKDOWN_EXTENSIONS.has(path.extname(filePath).toLowerCase())
  );
  const selectedNotes = await selectTaggedNotes(markdownFiles, exportTag);
  const assetCache = new Map();
  const warnings = [];

  await cleanupManagedMarkdown({
    collectionRoot,
    manifestPath,
    repoRoot,
    warnings
  });
  await cleanupLegacyOutputDir({
    collectionRoot,
    legacyOutRoot: path.resolve(repoRoot, DEFAULTS.legacyOutDir),
    outRoot
  });
  await fs.rm(assetRoot, { recursive: true, force: true });
  await fs.mkdir(outRoot, { recursive: true });
  await fs.mkdir(assetRoot, { recursive: true });

  const reservedOutputPaths = await collectReservedOutputPaths(outRoot);
  const reservedAssetPaths = new Map();
  const notes = createNoteRecords({
    collectionRoot,
    outRoot,
    reservedOutputPaths,
    sourcePaths: selectedNotes,
    sourceRoot: vaultRoot,
    warnings
  });
  const indexes = buildIndexes({ notes, vaultFiles, vaultRoot });
  let writtenCount = 0;
  const writtenMarkdownPaths = [];

  for (const note of notes) {
    const raw = await fs.readFile(note.sourcePath, 'utf8');
    const { data, body } = parseFrontmatter(raw);
    const prepared = prepareBody(body, data.title);
    const inlineTags = extractInlineTags(prepared.body);
    const cleanedBody = normalizeDisplayMathBlocks(
      stripTagParagraphsFromBody(stripExportTagFromBody(prepared.body, exportTag))
    );
    const transformedBody = await rewriteMarkdown(cleanedBody, {
      assetBase,
      assetCache,
      assetOutputPaths: reservedAssetPaths,
      assetRoot,
      indexes,
      note,
      vaultRoot,
      warnings
    });

    const frontmatter = normalizeFrontmatter({
      body: cleanedBody,
      exportTag,
      frontmatter: data,
      inlineTags,
      note,
      resolvedTitle: prepared.title
    });

    const missingRequired = getMissingRequiredFields(frontmatter);
    if (missingRequired.length > 0) {
      warnings.push(
        `Skipped ${note.relativePath} because required field(s) are missing in Obsidian: ${missingRequired.join(', ')}`
      );
      continue;
    }

    if (typeof frontmatter.heroImage === 'string') {
      frontmatter.heroImage = await rewriteFrontmatterAsset(frontmatter.heroImage, {
        assetBase,
        assetCache,
        assetOutputPaths: reservedAssetPaths,
        assetRoot,
        indexes,
        note,
        vaultRoot,
        warnings
      });
    }

    const output = `${serializeFrontmatter(frontmatter)}\n\n${transformedBody.trim()}\n`;
    await fs.mkdir(path.dirname(note.outputPath), { recursive: true });
    await fs.writeFile(note.outputPath, output, 'utf8');
    writtenCount += 1;
    writtenMarkdownPaths.push(path.relative(repoRoot, note.outputPath));
  }

  await writeManifest(manifestPath, { markdownPaths: writtenMarkdownPaths });

  console.log(`Synced ${writtenCount} note(s) tagged #${exportTag} from ${vaultRoot}`);
  console.log(`Wrote Markdown to ${outRoot}`);
  console.log(`Copied ${assetCache.size} asset(s) to ${assetRoot}`);

  if (warnings.length > 0) {
    console.warn('\nWarnings:');
    for (const warning of warnings) {
      console.warn(`- ${warning}`);
    }
  }
}

function parseOptions(argv, env) {
  const parsed = {
    vaultDir: env.OBSIDIAN_VAULT_DIR ?? '',
    exportTag: env.OBSIDIAN_EXPORT_TAG ?? DEFAULTS.exportTag,
    outDir: env.OBSIDIAN_BLOG_OUT_DIR ?? DEFAULTS.outDir,
    assetDir: env.OBSIDIAN_BLOG_ASSET_DIR ?? DEFAULTS.assetDir,
    assetBase: env.OBSIDIAN_BLOG_ASSET_BASE ?? DEFAULTS.assetBase
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) {
      continue;
    }

    const [rawKey, inlineValue] = arg.slice(2).split('=');
    const key = rawKey.trim();
    const value = inlineValue ?? argv[index + 1];

    if (inlineValue == null) {
      index += 1;
    }

    switch (key) {
      case 'vault':
        parsed.vaultDir = value;
        break;
      case 'tag':
        parsed.exportTag = value;
        break;
      case 'out-dir':
        parsed.outDir = value;
        break;
      case 'asset-dir':
        parsed.assetDir = value;
        break;
      case 'asset-base':
        parsed.assetBase = value;
        break;
      default:
        fail(`Unknown option: --${key}`);
    }
  }

  return parsed;
}

async function selectTaggedNotes(markdownFiles, exportTag) {
  const selected = [];

  for (const filePath of markdownFiles) {
    const raw = await fs.readFile(filePath, 'utf8');
    const { body } = parseFrontmatter(raw);
    const inlineTags = extractInlineTags(body);
    const allTags = new Set(inlineTags);

    if ([...allTags].some((tag) => isExportTagMatch(tag, exportTag))) {
      selected.push(filePath);
    }
  }

  return selected;
}

function createNoteRecords({ collectionRoot, outRoot, reservedOutputPaths, sourcePaths, sourceRoot, warnings }) {
  const usedOutputPaths = new Map(reservedOutputPaths);

  return sourcePaths.map((sourcePath) => {
    const relativePath = path.relative(sourceRoot, sourcePath);
    const outputRelativePath = createFlatOutputRelativePath(relativePath, usedOutputPaths, warnings);
    const outputPath = path.join(outRoot, outputRelativePath);
    const outputWithoutExt = stripExtension(outputPath);
    const slugPath = toPosix(path.relative(collectionRoot, outputWithoutExt));
    const slugSegments = slugPath.split('/').filter(Boolean);

    return {
      outputPath,
      publishRelativePath: toPosix(stripExtension(relativePath)),
      relativePath: toPosix(relativePath),
      slugPath,
      slugSegments,
      sourcePath,
      url: `/blog/${slugSegments.map((segment) => encodeURIComponent(segment)).join('/')}/`
    };
  });
}

async function cleanupManagedMarkdown({ collectionRoot, manifestPath, repoRoot, warnings }) {
  const manifest = await readManifest(manifestPath);
  if (!manifest) {
    return;
  }

  for (const relativePath of manifest.markdownPaths ?? []) {
    const filePath = path.resolve(repoRoot, relativePath);
    if (!isWithinRoot(filePath, collectionRoot)) {
      continue;
    }

    await fs.rm(filePath, { force: true });
  }

  await fs.rm(manifestPath, { force: true });
  await pruneEmptyDirectories(collectionRoot);
  warnings.push(`Removed ${manifest.markdownPaths?.length ?? 0} previously synced Markdown file(s)`);
}

async function cleanupLegacyOutputDir({ collectionRoot, legacyOutRoot, outRoot }) {
  if (path.resolve(legacyOutRoot) === path.resolve(outRoot)) {
    return;
  }

  if (!isWithinRoot(legacyOutRoot, collectionRoot)) {
    return;
  }

  await fs.rm(legacyOutRoot, { recursive: true, force: true });
}

async function collectReservedOutputPaths(outRoot) {
  const reserved = new Map();
  const entries = await fs.readdir(outRoot, { withFileTypes: true }).catch(() => []);

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const fullPath = path.join(outRoot, entry.name);
    if (!MARKDOWN_EXTENSIONS.has(path.extname(fullPath).toLowerCase())) {
      continue;
    }

    reserved.set(normalizeKey(entry.name), `existing file ${entry.name}`);
  }

  return reserved;
}

async function readManifest(manifestPath) {
  try {
    return JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  } catch {
    return null;
  }
}

async function writeManifest(manifestPath, manifest) {
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

async function pruneEmptyDirectories(root) {
  const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const directory = path.join(root, entry.name);
    await pruneEmptyDirectories(directory);

    const nestedEntries = await fs.readdir(directory).catch(() => null);
    if (nestedEntries && nestedEntries.length === 0) {
      await fs.rmdir(directory).catch(() => {});
    }
  }
}

function createFlatOutputRelativePath(relativePath, usedOutputPaths, warnings) {
  const extension = path.extname(relativePath);
  const basename = path.basename(relativePath, extension);
  const slugBase = slugifyPathSegment(basename) || 'note';
  const firstCandidate = `${slugBase}${extension}`;
  let candidate = firstCandidate;
  let collisionCount = 2;
  const firstKey = normalizeKey(firstCandidate);
  const firstOwner = usedOutputPaths.get(firstKey);

  while (usedOutputPaths.has(normalizeKey(candidate))) {
    candidate = `${slugBase}-${collisionCount}${extension}`;
    collisionCount += 1;
  }

  usedOutputPaths.set(normalizeKey(candidate), toPosix(relativePath));

  if (firstOwner) {
    warnings.push(
      `Flattened filename collision: ${toPosix(relativePath)} and ${firstOwner} both map to ${firstCandidate}; wrote ${candidate} instead`
    );
  }

  return candidate;
}

function buildIndexes({ notes, vaultFiles, vaultRoot }) {
  const noteByPath = new Map();
  const noteByBasename = new Map();
  const vaultByRelativePath = new Map();
  const vaultByBasename = new Map();
  const vaultFileSet = new Set();

  for (const note of notes) {
    registerUnique(noteByPath, normalizeKey(note.publishRelativePath), note);
    registerUnique(noteByBasename, normalizeKey(path.basename(note.publishRelativePath)), note);
  }

  for (const filePath of vaultFiles) {
    const absolutePath = path.resolve(filePath);
    const relativePath = toPosix(path.relative(vaultRoot, absolutePath));
    const basename = path.basename(relativePath);
    vaultFileSet.add(absolutePath);
    registerUnique(vaultByRelativePath, normalizeKey(relativePath), absolutePath);

    const basenameKey = normalizeKey(basename);
    const existing = vaultByBasename.get(basenameKey);
    if (!existing) {
      vaultByBasename.set(basenameKey, [absolutePath]);
    } else {
      existing.push(absolutePath);
    }
  }

  return {
    noteByBasename,
    noteByPath,
    vaultByBasename,
    vaultByRelativePath,
    vaultFileSet,
    vaultRoot
  };
}

function registerUnique(map, key, value) {
  if (!map.has(key)) {
    map.set(key, value);
    return;
  }

  map.set(key, null);
}

async function rewriteMarkdown(markdown, context) {
  const segments = splitByCodeFence(markdown);
  const rebuilt = [];

  for (const segment of segments) {
    if (segment.isCode) {
      rebuilt.push(segment.value);
      continue;
    }

    let value = segment.value;
    value = await replaceAsync(value, /!\[\[([^[\]]+)\]\]/g, async (_match, token) =>
      renderWikiReference(token, { ...context, embed: true })
    );
    value = await replaceAsync(value, /\[\[([^[\]]+)\]\]/g, async (_match, token) =>
      renderWikiReference(token, { ...context, embed: false })
    );
    value = await replaceAsync(value, /!\[([^\]]*)\]\(([^)]+)\)/g, async (_match, alt, target) =>
      renderMarkdownReference({ alt, image: true, target }, context)
    );
    value = await replaceAsync(value, /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g, async (_match, label, target) =>
      renderMarkdownReference({ alt: label, image: false, target }, context)
    );
    value = wrapObsidianImageRows(value);
    rebuilt.push(value);
  }

  return rebuilt.join('');
}

async function renderWikiReference(rawToken, context) {
  const { alias, imageSize, target } = parseWikiToken(rawToken);
  const { pathPart, anchor } = splitAnchor(target);
  const noteTarget = resolveNoteTarget(context.note, pathPart, context.indexes);

  if (noteTarget) {
    const linkText = alias || humanizeName(path.basename(pathPart, path.extname(pathPart)));
    const href = anchor ? `${noteTarget.url}#${slugifyHeading(anchor)}` : noteTarget.url;
    return `[${linkText}](${href})`;
  }

  const assetTarget = resolveAssetTarget(context.note, pathPart, context.indexes);
  if (assetTarget) {
    const assetUrl = await copyAsset(assetTarget, context);
    const label = alias || path.basename(pathPart);
    if (context.embed || isImagePath(pathPart)) {
      if (imageSize && isImagePath(pathPart)) {
        return renderSizedImageEmbed({
          alt: '',
          src: assetUrl,
          width: imageSize.width
        });
      }

      return `![${label}](${assetUrl})`;
    }

    return `[${label}](${assetUrl})`;
  }

  context.warnings.push(`Unresolved wiki link in ${context.note.relativePath}: [[${rawToken}]]`);
  return alias || target;
}

async function renderMarkdownReference(reference, context) {
  const rawTarget = reference.target.trim();
  if (isExternalTarget(rawTarget) || rawTarget.startsWith('/') || rawTarget.startsWith('#')) {
    return reference.image
      ? `![${reference.alt}](${rawTarget})`
      : `[${reference.alt}](${rawTarget})`;
  }

  const { pathPart, anchor } = splitAnchor(rawTarget);
  const noteTarget = resolveNoteTarget(context.note, pathPart, context.indexes);

  if (noteTarget) {
    const href = anchor ? `${noteTarget.url}#${slugifyHeading(anchor)}` : noteTarget.url;
    return reference.image
      ? `![${reference.alt}](${href})`
      : `[${reference.alt}](${href})`;
  }

  const assetTarget = resolveAssetTarget(context.note, pathPart, context.indexes);
  if (assetTarget) {
    const assetUrl = await copyAsset(assetTarget, context);
    return reference.image
      ? `![${reference.alt}](${assetUrl})`
      : `[${reference.alt}](${assetUrl})`;
  }

  context.warnings.push(`Unresolved Markdown link in ${context.note.relativePath}: ${rawTarget}`);
  return reference.image
    ? `![${reference.alt}](${rawTarget})`
    : `[${reference.alt}](${rawTarget})`;
}

async function rewriteFrontmatterAsset(rawTarget, context) {
  if (isExternalTarget(rawTarget) || rawTarget.startsWith('/')) {
    return rawTarget;
  }

  const assetTarget = resolveAssetTarget(context.note, rawTarget, context.indexes);
  if (!assetTarget) {
    context.warnings.push(`Unresolved heroImage in ${context.note.relativePath}: ${rawTarget}`);
    return rawTarget;
  }

  return copyAsset(assetTarget, context);
}

function resolveNoteTarget(note, rawTarget, indexes) {
  const normalized = normalizeKey(stripExtension(rawTarget));
  const candidates = [];
  const dirname = path.posix.dirname(note.publishRelativePath);

  if (rawTarget.includes('/') || rawTarget.includes('\\') || rawTarget.startsWith('.')) {
    candidates.push(normalizeKey(path.posix.normalize(path.posix.join(dirname, stripExtension(toPosix(rawTarget))))));
    candidates.push(normalized);
  } else {
    candidates.push(normalizeKey(path.posix.join(dirname, stripExtension(rawTarget))));
    candidates.push(normalized);
    candidates.push(normalizeKey(path.basename(stripExtension(rawTarget))));
  }

  for (const candidate of candidates) {
    const byPath = indexes.noteByPath.get(candidate);
    if (byPath) {
      return byPath;
    }

    if (byPath === null) {
      return null;
    }
  }

  const basenameMatch = indexes.noteByBasename.get(normalizeKey(path.basename(stripExtension(rawTarget))));
  if (basenameMatch) {
    return basenameMatch;
  }

  return null;
}

function resolveAssetTarget(note, rawTarget, indexes) {
  const normalizedTarget = stripQueryAndHash(rawTarget);
  const dirname = path.dirname(note.sourcePath);
  const absoluteCandidates = [];

  if (path.isAbsolute(normalizedTarget)) {
    absoluteCandidates.push(path.resolve(normalizedTarget));
  } else {
    absoluteCandidates.push(path.resolve(dirname, normalizedTarget));
    absoluteCandidates.push(path.resolve(indexes.vaultRoot, normalizedTarget));
  }

  for (const candidate of absoluteCandidates) {
    if (indexes.vaultFileSet.has(candidate)) {
      return candidate;
    }
  }

  const relativeKey = normalizeKey(toPosix(normalizedTarget));
  const byPath = indexes.vaultByRelativePath.get(relativeKey);
  if (byPath) {
    return byPath;
  }

  const basename = path.basename(normalizedTarget);
  const basenameMatches = indexes.vaultByBasename.get(normalizeKey(basename));
  if (basenameMatches?.length === 1) {
    return basenameMatches[0];
  }

  return null;
}

async function copyAsset(sourcePath, context) {
  const cached = context.assetCache.get(sourcePath);
  if (cached) {
    return cached;
  }

  const outputName = createFlatAssetOutputName(sourcePath, context.assetOutputPaths, context.warnings);
  const destination = path.join(context.assetRoot, outputName);
  await fs.copyFile(sourcePath, destination);

  const url = `${context.assetBase}/${encodeURIComponent(outputName)}`;
  context.assetCache.set(sourcePath, url);
  return url;
}

function createFlatAssetOutputName(sourcePath, usedOutputPaths, warnings) {
  const extension = path.extname(sourcePath);
  const basename = path.basename(sourcePath, extension);
  const slugBase = slugifyPathSegment(basename) || 'asset';
  const firstCandidate = `${slugBase}${extension}`;
  let candidate = firstCandidate;
  let collisionCount = 2;
  const firstKey = normalizeKey(firstCandidate);
  const firstOwner = usedOutputPaths.get(firstKey);

  while (usedOutputPaths.has(normalizeKey(candidate))) {
    candidate = `${slugBase}-${collisionCount}${extension}`;
    collisionCount += 1;
  }

  usedOutputPaths.set(normalizeKey(candidate), sourcePath);

  if (firstOwner) {
    warnings.push(
      `Flattened asset collision: ${toPosix(path.relative(process.cwd(), sourcePath))} and ${toPosix(
        path.relative(process.cwd(), firstOwner)
      )} both map to ${firstCandidate}; wrote ${candidate} instead`
    );
  }

  return candidate;
}

function normalizeFrontmatter({ body, exportTag, frontmatter, inlineTags, note, resolvedTitle }) {
  return {
    title: normalizeOptionalString(frontmatter.title) ?? normalizeOptionalString(resolvedTitle) ?? defaultTitleFromNote(note),
    subtitle: normalizeOptionalString(frontmatter.subtitle),
    description: normalizeOptionalString(frontmatter.description) ?? buildDefaultDescription(body),
    date: normalizeOptionalString(frontmatter.date),
    updatedDate: normalizeOptionalDate(frontmatter.updatedDate),
    author: normalizeOptionalString(frontmatter.author) ?? 'Harry',
    tags: mergeExportedTags(inlineTags, exportTag),
    category: normalizeOptionalString(frontmatter.category),
    heroImage: normalizeOptionalString(frontmatter.heroImage),
    draft: normalizeOptionalBoolean(frontmatter.draft) ?? false
  };
}

function getMissingRequiredFields(frontmatter) {
  const missing = [];

  if (!frontmatter.date) {
    missing.push('date');
  }

  return missing;
}

function serializeFrontmatter(frontmatter) {
  const lines = ['---'];
  lines.push(`title: ${yamlString(frontmatter.title)}`);

  if (frontmatter.subtitle) {
    lines.push(`subtitle: ${yamlString(frontmatter.subtitle)}`);
  }

  if (frontmatter.description) {
    lines.push(`description: ${yamlString(frontmatter.description)}`);
  }

  lines.push(`date: ${frontmatter.date}`);

  if (frontmatter.updatedDate) {
    lines.push(`updatedDate: ${frontmatter.updatedDate}`);
  }

  if (frontmatter.author) {
    lines.push(`author: ${yamlString(frontmatter.author)}`);
  }

  if (frontmatter.tags.length > 0) {
    lines.push('tags:');
    for (const tag of frontmatter.tags) {
      lines.push(`  - ${yamlString(tag)}`);
    }
  }

  if (frontmatter.category) {
    lines.push(`category: ${yamlString(frontmatter.category)}`);
  }

  if (frontmatter.heroImage) {
    lines.push(`heroImage: ${yamlString(frontmatter.heroImage)}`);
  }

  if (typeof frontmatter.draft === 'boolean') {
    lines.push(`draft: ${frontmatter.draft ? 'true' : 'false'}`);
  }
  lines.push('---');
  return lines.join('\n');
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return { data: {}, body: raw };
  }

  const data = {};
  const lines = match[1].split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) {
      continue;
    }

    const keyMatch = line.match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
    if (!keyMatch) {
      continue;
    }

    const [, key, rawValue = ''] = keyMatch;
    if (rawValue === '') {
      const nextLine = lines[index + 1] ?? '';
      if (nextLine.trim().startsWith('- ')) {
        const values = [];
        while ((lines[index + 1] ?? '').trim().startsWith('- ')) {
          index += 1;
          values.push(parseScalar(lines[index].trim().slice(2)));
        }
        data[key] = values;
      } else {
        data[key] = '';
      }
      continue;
    }

    if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
      data[key] = rawValue
        .slice(1, -1)
        .split(',')
        .map((item) => parseScalar(item.trim()))
        .filter(Boolean);
      continue;
    }

    data[key] = parseScalar(rawValue.trim());
  }

  return {
    data,
    body: raw.slice(match[0].length)
  };
}

function prepareBody(rawBody, frontmatterTitle) {
  const body = rawBody.replace(/^\s+/, '');
  const firstLineMatch = body.match(/^#\s+(.+?)\s*(?:\r?\n|$)/);
  const normalizedFrontmatterTitle = normalizeOptionalString(frontmatterTitle);

  if (!firstLineMatch) {
    return { body: body.trim(), title: normalizedFrontmatterTitle };
  }

  const heading = normalizeOptionalString(firstLineMatch[1]);
  const shouldUseHeadingAsTitle = !normalizedFrontmatterTitle && Boolean(heading);
  const shouldStrip = Boolean(heading) && (shouldUseHeadingAsTitle || normalizedFrontmatterTitle === heading);
  const nextBody = shouldStrip ? body.slice(firstLineMatch[0].length).replace(/^\s+/, '') : body;

  return {
    body: nextBody.trim(),
    title: normalizedFrontmatterTitle ?? heading
  };
}

function parseScalar(rawValue) {
  if ((rawValue.startsWith('"') && rawValue.endsWith('"')) || (rawValue.startsWith("'") && rawValue.endsWith("'"))) {
    return rawValue.slice(1, -1);
  }

  if (rawValue === 'true') {
    return true;
  }

  if (rawValue === 'false') {
    return false;
  }

  return rawValue;
}

function splitByCodeFence(markdown) {
  const regex = /```[\s\S]*?```/g;
  const pieces = [];
  let start = 0;

  for (const match of markdown.matchAll(regex)) {
    const index = match.index ?? 0;
    pieces.push({ isCode: false, value: markdown.slice(start, index) });
    pieces.push({ isCode: true, value: match[0] });
    start = index + match[0].length;
  }

  pieces.push({ isCode: false, value: markdown.slice(start) });
  return pieces;
}

function normalizeDisplayMathBlocks(markdown) {
  return splitByCodeFence(markdown)
    .map((segment) => {
      if (segment.isCode) {
        return segment.value;
      }

      return segment.value.replace(/(^|\n)\s*\$\$\s*(.+?)\s*\$\$\s*(?=\n|$)/g, (_match, prefix, expression) => {
        return `${prefix}$$\n${expression.trim()}\n$$`;
      });
    })
    .join('');
}

function parseWikiToken(token) {
  const [targetPart, aliasPart] = token.split('|');
  const rawAlias = aliasPart?.trim() || '';
  const imageSize = parseObsidianImageSize(rawAlias);

  return {
    alias: imageSize ? '' : rawAlias,
    imageSize,
    target: targetPart.trim()
  };
}

function parseObsidianImageSize(value) {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const width = Number.parseInt(value, 10);
  if (!Number.isFinite(width) || width <= 0) {
    return null;
  }

  return { width };
}

function renderSizedImageEmbed({ alt, src, width }) {
  const safeAlt = escapeHtmlAttribute(alt);
  const safeSrc = escapeHtmlAttribute(src);
  const safeWidth = escapeHtmlAttribute(String(width));
  return `<span class="obsidian-inline-image" style="--obsidian-embed-width: ${safeWidth}px;"><img src="${safeSrc}" alt="${safeAlt}" width="${safeWidth}" loading="lazy"></span>`;
}

function wrapObsidianImageRows(markdown) {
  const imageSpanPattern =
    '<span class="obsidian-inline-image"[^>]*><img[^>]*><\\/span>';
  const linePattern = new RegExp(`(^|\\n)((?:\\s*${imageSpanPattern}\\s*)+)(?=\\n|$)`, 'g');

  return markdown.replace(linePattern, (_match, prefix, row) => {
    return `${prefix}\n<div class="obsidian-image-row">${row.trim()}</div>\n`;
  });
}

function escapeHtmlAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function splitAnchor(target) {
  const index = target.indexOf('#');
  if (index === -1) {
    return { anchor: '', pathPart: target };
  }

  return {
    anchor: target.slice(index + 1).trim(),
    pathPart: target.slice(0, index).trim()
  };
}

function normalizeOptionalDate(value) {
  const candidate = normalizeOptionalString(value);
  return candidate || undefined;
}

function mergeExportedTags(inlineTags, exportTag) {
  const merged = [...inlineTags]
    .map(normalizeTag)
    .filter(Boolean)
    .filter((tag, index, array) => array.indexOf(tag) === index)
    .filter((tag) => !isExportTagMatch(tag, exportTag));

  return merged;
}

function normalizeOptionalBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }
  }

  return undefined;
}

function normalizeString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function normalizeOptionalString(value) {
  const normalized = normalizeString(value);
  return normalized || undefined;
}

function defaultTitleFromNote(note) {
  const basename = path.basename(note.relativePath, path.extname(note.relativePath));
  return humanizeName(basename) || 'Untitled';
}

function buildDefaultDescription(markdown) {
  const blocks = markdown
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  for (const block of blocks) {
    if (isTagOnlyParagraph(block)) {
      continue;
    }

    const plainText = summarizeMarkdownBlock(block);
    if (plainText) {
      return plainText;
    }
  }

  return undefined;
}

function summarizeMarkdownBlock(block) {
  const text = block
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/!\[\[([^[\]]+)\]\]/g, ' ')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, ' ')
    .replace(/\[\[([^[\]|]+)\|([^[\]]+)\]\]/g, '$2')
    .replace(/\[\[([^[\]]+)\]\]/g, (_match, target) => humanizeName(path.basename(target, path.extname(target))))
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) {
    return undefined;
  }

  return text.length > 160 ? `${text.slice(0, 157).trimEnd()}...` : text;
}

function yamlString(value) {
  return JSON.stringify(value);
}

function extractInlineTags(markdown) {
  const matches = [];
  const searchable = splitByCodeFence(markdown)
    .filter((segment) => !segment.isCode)
    .map((segment) => segment.value.replace(/`[^`]*`/g, ' '))
    .join('\n');
  const regex = /(^|[\s([{])#([\p{Letter}\p{Number}_/-]+)(?=$|[\s)\]}.,;!?])/gu;

  for (const match of searchable.matchAll(regex)) {
    const tag = normalizeTag(match[2]);
    if (tag) {
      matches.push(tag);
    }
  }

  return matches.filter((tag, index) => matches.indexOf(tag) === index);
}

function stripExportTagFromBody(markdown, exportTag) {
  const escaped = escapeRegex(exportTag);
  const regex = new RegExp(
    `(^|[\\s([\\{])#(${escaped}(?:\\/[\\p{Letter}\\p{Number}_-]+)*)(?=$|[\\s)\\]}.,;!?])`,
    'giu'
  );
  const rebuilt = splitByCodeFence(markdown).map((segment) => {
    if (segment.isCode) {
      return segment.value;
    }

    return segment.value.replace(regex, '$1');
  });

  return rebuilt
    .join('')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripTagParagraphsFromBody(markdown) {
  return markdown
    .split(/\n{2,}/)
    .filter((block) => !isTagOnlyParagraph(block))
    .join('\n\n')
    .trim();
}

function isTagOnlyParagraph(block) {
  const compact = block
    .trim()
    .replace(/\s+/g, ' ');

  if (!compact) {
    return false;
  }

  return /^#[\p{Letter}\p{Number}_/-]+(?:\s+#[\p{Letter}\p{Number}_/-]+)*$/u.test(compact);
}

function slugifyPathSegment(value) {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return slug || 'note';
}

function slugifyHeading(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .replace(/\s+/g, '-');
}

function humanizeName(value) {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTag(value) {
  return normalizeString(value)
    .replace(/^#+/, '')
    .trim()
    .toLowerCase();
}

function isExportTagMatch(tag, exportTag) {
  return tag === exportTag || tag.startsWith(`${exportTag}/`);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeAssetBase(value) {
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  return withLeadingSlash.replace(/\/+$/, '');
}

function normalizeKey(value) {
  return toPosix(value).replace(/^\/+/, '').toLowerCase();
}

function stripExtension(filePath) {
  const extension = path.extname(filePath);
  return extension ? filePath.slice(0, -extension.length) : filePath;
}

function stripQueryAndHash(value) {
  return value.split('#')[0].split('?')[0];
}

function isExternalTarget(value) {
  return /^(https?:|mailto:|tel:)/i.test(value);
}

function isImagePath(value) {
  return IMAGE_EXTENSIONS.has(path.extname(stripQueryAndHash(value)).toLowerCase());
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function isWithinRoot(candidate, root) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

async function assertDirectory(directory, label) {
  try {
    const stat = await fs.stat(directory);
    if (!stat.isDirectory()) {
      fail(`${label} is not a directory: ${directory}`);
    }
  } catch {
    fail(`${label} does not exist: ${directory}`);
  }
}

async function listFiles(root, options = {}) {
  const { excludeDirNames = new Set(), predicate } = options;
  const results = [];

  async function visit(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!excludeDirNames.has(entry.name)) {
          await visit(fullPath);
        }
        continue;
      }

      if (!predicate || predicate(fullPath)) {
        results.push(fullPath);
      }
    }
  }

  await visit(root);
  return results.sort((left, right) => left.localeCompare(right));
}

async function replaceAsync(value, pattern, replacer) {
  const matches = [...value.matchAll(pattern)];
  if (matches.length === 0) {
    return value;
  }

  const replacements = await Promise.all(matches.map((match) => replacer(...match)));
  let rebuilt = '';
  let start = 0;

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const matchIndex = match.index ?? 0;
    rebuilt += value.slice(start, matchIndex);
    rebuilt += replacements[index];
    start = matchIndex + match[0].length;
  }

  rebuilt += value.slice(start);
  return rebuilt;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

await main();
