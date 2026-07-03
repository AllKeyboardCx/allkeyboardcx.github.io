const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '../content');

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
    
    const body = lines.slice(bodyStart).join('\n').trim();
    
    return { data, body };
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
            const { data } = parseMetadata(content);
            
            const stat = fs.statSync(filePath);
            const defaultDate = stat.mtime.toISOString().split('T')[0];
            
            posts.push({
                title: data.title,
                filename: file.replace('.md', ''),
                date: data.date || defaultDate,
                tags: data.tags,
                summary: data.summary
            });
        }
        
        posts.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const indexPath = path.join(categoryDir, 'index.json');
        fs.writeFileSync(indexPath, JSON.stringify(posts, null, 2), 'utf-8');
        
        console.log(`Generated ${indexPath} with ${posts.length} posts`);
    }
}

buildIndex();