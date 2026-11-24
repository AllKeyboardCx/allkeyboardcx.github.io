const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '../content');

function convertObsidianImages(content) {
    return content.replace(/!\[\[([^\]]+)\]\]/g, (match, inner) => {
        const parts = inner.split('|');
        const filename = parts[0].trim();
        const width = parts[1] ? parts[1].trim() : '';

        if (width) {
            return `<img src="../pictures/${filename}" width="${width}" alt="${filename}" loading="lazy" decoding="async">`;
        }
        return `![${filename}](<../pictures/${filename}>)`;
    });
}

function processMarkdownFile(filePath) {
    const original = fs.readFileSync(filePath, 'utf-8');
    const converted = convertObsidianImages(original);
    if (converted !== original) {
        fs.writeFileSync(filePath, converted, 'utf-8');
        console.log(`Converted Obsidian images in: ${filePath}`);
        return converted;
    }
    return original;
}

function parseMetadata(content) {
    const lines = content.split('\n');
    const data = {
        title: 'Untitled',
        date: '',
        tags: [],
        summary: ''
    };

    let bodyStart = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith('TITLE ')) {
            data.title = line.substring(6).trim();
            bodyStart = i + 1;
        } else if (line.startsWith('DATE ')) {
            data.date = line.substring(5).trim();
            bodyStart = i + 1;
        } else if (line.startsWith('SUMMARY ')) {
            data.summary = line.substring(8).trim();
            bodyStart = i + 1;
        } else if (line.startsWith('TAG ')) {
            const tagStr = line.substring(4).trim();
            data.tags = tagStr ? tagStr.split(',').map(t => t.trim()).filter(t => t) : [];
            bodyStart = i + 1;
        } else if (line.startsWith('# ') || line.startsWith('## ') || line.startsWith('### ') || line.startsWith('#### ') || line.startsWith('##### ') || line.startsWith('###### ') || (line && !line.startsWith('TITLE') && !line.startsWith('DATE') && !line.startsWith('SUMMARY') && !line.startsWith('TAG'))) {
            break;
        }
    }

    return { data, body: lines.slice(bodyStart).join('\n').trim() };
}

/* ---------- 专栏（series）辅助 ---------- */

// 可选 content/<category>/<series>/series.json：{ title, summary, cover, order: [文件名...] }
function readSeriesMeta(seriesDir) {
    const fallback = {
        title: path.basename(seriesDir),
        summary: '',
        cover: '',
        order: []
    };
    const metaPath = path.join(seriesDir, 'series.json');
    if (!fs.existsSync(metaPath)) return fallback;

    try {
        const raw = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        return {
            title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : fallback.title,
            summary: typeof raw.summary === 'string' ? raw.summary.trim() : '',
            cover: typeof raw.cover === 'string' ? raw.cover.trim() : '',
            order: Array.isArray(raw.order)
                ? raw.order.filter(f => typeof f === 'string').map(f => f.replace(/\.md$/i, ''))
                : []
        };
    } catch (error) {
        console.warn(`  ! series.json 解析失败，回退到文件夹名: ${metaPath} (${error.message})`);
        return fallback;
    }
}

// 读取某个目录下的 md；seriesSlug 为 null 表示分类下的单篇
function collectPosts(dirPath, seriesSlug) {
    const files = fs.readdirSync(dirPath, { withFileTypes: true })
        .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
        .map(entry => entry.name)
        .sort();

    const posts = [];

    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const content = processMarkdownFile(filePath);
        const { data } = parseMetadata(content);

        const stat = fs.statSync(filePath);
        const defaultDate = stat.mtime.toISOString().split('T')[0];
        const baseName = file.replace(/\.md$/i, '');

        const post = {
            title: data.title,
            // 专栏文章的 filename 带上目录前缀：所有「用 filename 拼文章 URL / 阅读量 path」的旧代码不用改
            filename: seriesSlug ? `${seriesSlug}/${baseName}` : baseName,
            date: data.date || defaultDate,
            tags: data.tags,
            summary: data.summary
        };

        if (seriesSlug) post.series = seriesSlug;

        posts.push(post);
    }

    return posts;
}

function sortByDateDesc(posts) {
    return posts.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
}

// 专栏内顺序：series.json 的 order 优先，其余按 DATE 升序（比赛 WP 按时间读）
function orderSeriesPosts(posts, order) {
    const asc = posts.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    if (!order.length) return asc;

    const rank = new Map(order.map((name, index) => [name, index]));
    const known = asc.filter(p => rank.has(p.filename.split('/').pop()));
    const rest = asc.filter(p => !rank.has(p.filename.split('/').pop()));

    known.sort((a, b) => rank.get(a.filename.split('/').pop()) - rank.get(b.filename.split('/').pop()));

    return known.concat(rest);
}

function pickSummary(posts) {
    const newest = sortByDateDesc(posts)[0];
    return newest && newest.summary ? newest.summary : '';
}

function pickUpdated(posts) {
    const newest = sortByDateDesc(posts)[0];
    return newest ? newest.date : '';
}

function listSeries(categoryDir, category) {
    const seriesDirs = fs.readdirSync(categoryDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
        .map(entry => entry.name)
        .sort();

    const seriesList = [];
    const seriesPosts = [];

    for (const slug of seriesDirs) {
        const seriesDir = path.join(categoryDir, slug);
        const meta = readSeriesMeta(seriesDir);
        const posts = collectPosts(seriesDir, slug);

        if (!posts.length) {
            console.log(`  - ${category}/${slug}: 空专栏，跳过`);
            continue;
        }

        posts.forEach(post => { post.seriesTitle = meta.title; });

        const ordered = orderSeriesPosts(posts, meta.order);

        seriesList.push({
            slug,
            title: meta.title,
            summary: meta.summary || pickSummary(posts),
            cover: meta.cover,
            count: ordered.length,
            updated: pickUpdated(posts),
            articles: ordered.map(post => ({
                filename: post.filename,
                title: post.title,
                date: post.date,
                tags: post.tags,
                summary: post.summary
            }))
        });

        seriesPosts.push(...posts);
        console.log(`  - ${category}/${slug}: ${ordered.length} 篇`);
    }

    return { seriesList, seriesPosts };
}

function buildIndex() {
    const categories = fs.readdirSync(CONTENT_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
        .map(dirent => dirent.name)
        .sort();

    for (const category of categories) {
        const categoryDir = path.join(CONTENT_DIR, category);

        console.log(`[${category}]`);

        const flatPosts = collectPosts(categoryDir, null);
        const { seriesList, seriesPosts } = listSeries(categoryDir, category);

        const posts = sortByDateDesc(flatPosts.concat(seriesPosts));

        const indexPath = path.join(categoryDir, 'index.json');
        fs.writeFileSync(indexPath, JSON.stringify(posts, null, 2), 'utf-8');

        const seriesPath = path.join(categoryDir, 'series.json');
        fs.writeFileSync(seriesPath, JSON.stringify(seriesList, null, 2), 'utf-8');

        console.log(`  => ${posts.length} posts (${flatPosts.length} 单篇 + ${seriesPosts.length} 专栏), ${seriesList.length} 个专栏`);
    }
}

buildIndex();
