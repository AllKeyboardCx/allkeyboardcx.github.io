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
        title: '',        // 没写 TITLE 就留空，由 collectPosts 用文件名兜底
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

/* ---------- 文件名序号 ---------- */

// 中文数字 / 阿拉伯数字 → 整数，认不出返回 null
const CN_DIGIT = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const CN_UNIT = { 十: 10, 百: 100 };

function cnToInt(str) {
    if (!str) return null;
    if (/^\d+$/.test(str)) return parseInt(str, 10);
    let total = 0;
    let num = 0;
    for (const ch of str) {
        if (ch in CN_DIGIT) {
            num = CN_DIGIT[ch];
        } else if (ch in CN_UNIT) {
            total += (num || 1) * CN_UNIT[ch];
            num = 0;
        } else {
            return null;
        }
    }
    return total + num;
}

// 序章类固定词统一当成 0，永远排在最前
const ORDINAL_ZERO = /^(前言|序言|序|引言|导言|简介|概览|概述)/;
const ORDINAL_DI = /^第\s*([0-9]+|[零〇一二两三四五六七八九十百]+)\s*(?:部分|关|章|节|课|讲|回|篇|部|期|周|天|幕|话)/;

// 从文件名（不含 .md）里认序号：第X关 / 01-xxx / 一、xxx / 前言
function ordinalOf(name) {
    if (ORDINAL_ZERO.test(name)) return 0;

    let m = name.match(ORDINAL_DI);
    if (m) {
        const n = cnToInt(m[1]);
        if (n !== null) return n;
    }

    m = name.match(/^(\d+)/);
    if (m) return parseInt(m[1], 10);

    m = name.match(/^([零〇一二两三四五六七八九十百]+)\s*[、.．:：\s]/);
    if (m) {
        const n = cnToInt(m[1]);
        if (n !== null) return n;
    }

    return null;
}

// 序号升序；认不出序号的排到有序号的后面，同序号再按日期、文件名
function ordinalSort(posts) {
    return posts.slice().sort((a, b) => {
        const na = a.ordinal;
        const nb = b.ordinal;
        const aHas = na !== null && na !== undefined;
        const bHas = nb !== null && nb !== undefined;
        if (aHas !== bHas) return aHas ? -1 : 1;
        if (aHas && bHas && na !== nb) return na - nb;
        const d = new Date(a.date) - new Date(b.date);
        if (d) return d;
        return a.filename < b.filename ? -1 : a.filename > b.filename ? 1 : 0;
    });
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
            title: data.title || baseName,   // 没写 TITLE 就用文件名（不含 .md）
            // 专栏文章的 filename 带上目录前缀：所有「用 filename 拼文章 URL / 阅读量 path」的旧代码不用改
            filename: seriesSlug ? `${seriesSlug}/${baseName}` : baseName,
            date: data.date || defaultDate,
            tags: data.tags,
            summary: data.summary,
            ordinal: ordinalOf(baseName)       // 只用于排序，写 JSON 前会删掉
        };

        if (seriesSlug) post.series = seriesSlug;

        posts.push(post);
    }

    return posts;
}

function sortByDateDesc(posts) {
    return posts.slice().sort((a, b) => {
        const d = new Date(b.date) - new Date(a.date);
        if (d) return d;
        // 同一天的多篇（专栏连载常常是同一天）：按文件名序号升序，不再乱排
        const na = a.ordinal;
        const nb = b.ordinal;
        const aHas = na !== null && na !== undefined;
        const bHas = nb !== null && nb !== undefined;
        if (aHas !== bHas) return aHas ? -1 : 1;
        if (aHas && bHas && na !== nb) return na - nb;
        return a.filename < b.filename ? -1 : a.filename > b.filename ? 1 : 0;
    });
}

// 专栏内顺序：series.json 的 order 优先，其余按 DATE 升序（比赛 WP 按时间读）
function orderSeriesPosts(posts, order) {
    const asc = posts.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    // 没手写 order 时：文件名带序号就按序号升序（前言这类算 0），认不出的排最后
    if (!order.length) return ordinalSort(posts);

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

        const publicPosts = posts.map(post => {
            const copy = Object.assign({}, post);
            delete copy.ordinal;
            return copy;
        });

        const indexPath = path.join(categoryDir, 'index.json');
        fs.writeFileSync(indexPath, JSON.stringify(publicPosts, null, 2), 'utf-8');

        const seriesPath = path.join(categoryDir, 'series.json');
        fs.writeFileSync(seriesPath, JSON.stringify(seriesList, null, 2), 'utf-8');

        console.log(`  => ${posts.length} posts (${flatPosts.length} 单篇 + ${seriesPosts.length} 专栏), ${seriesList.length} 个专栏`);
    }
}

buildIndex();
