const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '../content');

function parseFrontmatter(content) {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
    const match = content.match(frontmatterRegex);
    
    if (!match) {
        console.warn('No frontmatter found');
        return {
            data: {
                title: 'Untitled',
                date: new Date().toISOString().split('T')[0],
                tags: [],
                summary: ''
            },
            content: content
        };
    }
    
    const frontmatter = match[1];
    const body = content.slice(match[0].length);
    const data = {};
    
    const lines = frontmatter.split('\n');
    let currentKey = '';
    let currentValue = '';
    
    for (const line of lines) {
        if (!line.trim()) continue;
        
        if (line.includes(': ')) {
            if (currentKey) {
                data[currentKey] = parseValue(currentValue.trim());
            }
            const [key, ...rest] = line.split(': ');
            currentKey = key.trim();
            currentValue = rest.join(': ');
        } else {
            currentValue += '\n' + line;
        }
    }
    
    if (currentKey) {
        data[currentKey] = parseValue(currentValue.trim());
    }
    
    return {
        data: {
            title: data.title || 'Untitled',
            date: data.date || new Date().toISOString().split('T')[0],
            tags: Array.isArray(data.tags) ? data.tags : [],
            summary: data.summary || ''
        },
        content: body
    };
}

function parseValue(value) {
    if (value.startsWith('"') && value.endsWith('"')) {
        return value.slice(1, -1);
    }
    if (value.startsWith('[') && value.endsWith(']')) {
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }
    return value;
}

function buildIndex() {
    const categories = fs.readdirSync(CONTENT_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    
    for (const category of categories) {
        const categoryDir = path.join(CONTENT_DIR, category);
        const files = fs.readdirSync(categoryDir)
            .filter(file => file.endsWith('.md'));
        
        const posts = [];
        
        for (const file of files) {
            const filePath = path.join(categoryDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const { data } = parseFrontmatter(content);
            
            posts.push({
                title: data.title,
                filename: file.replace('.md', ''),
                date: data.date,
                tags: data.tags,
                summary: data.summary
            });
        }
        
        posts.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const indexPath = path.join(categoryDir, 'index.json');
        fs.writeFileSync(indexPath, JSON.stringify(posts, null, 2));
        
        console.log(`Generated ${indexPath} with ${posts.length} posts`);
    }
}

buildIndex();