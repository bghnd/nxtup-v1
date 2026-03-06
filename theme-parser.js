const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
    fs.readdirSync(dir).forEach(file => {
        const dirFile = path.join(dir, file);
        if (fs.statSync(dirFile).isDirectory()) {
            filelist = walkSync(dirFile, filelist);
        } else {
            if (dirFile.endsWith('.tsx') || dirFile.endsWith('.ts')) {
                filelist.push(dirFile);
            }
        }
    });
    return filelist;
};

const map = {
    'bg-slate-50': 'bg-background',
    'text-slate-900': 'text-foreground',
    'text-slate-800': 'text-foreground-muted',
    'text-slate-700': 'text-foreground-muted',
    'text-slate-600': 'text-muted-foreground',
    'text-slate-500': 'text-muted-foreground',
    'text-slate-400': 'text-muted',
    'bg-white': 'bg-card',
    'shadow-card': 'shadow-card',
    'border-slate-100': 'border-border',
    'border-slate-200': 'border-border',
    'border-slate-300': 'border-border-hover',
    'bg-slate-100': 'bg-accent',
    'bg-slate-200': 'bg-accent-hover',
    'bg-blue-50/50': 'bg-primary/10',
    'bg-blue-50': 'bg-primary/10',
    'text-blue-700': 'text-primary',
    'text-blue-600': 'text-primary',
    'text-blue-500': 'text-primary',
    'border-blue-400': 'border-primary/50',
    'bg-blue-600': 'bg-primary',
    'hover:bg-blue-700': 'hover:bg-primary-hover',
    'ring-blue-400': 'ring-primary',
    'bg-slate-900': 'bg-foreground',
    'text-white': 'text-background',
};

// Also handle dynamic strings like `bg-slate-50/50`
const regexes = [
    { pattern: /bg-slate-900\/25/g, replace: 'bg-background/80 backdrop-blur-sm' },
    { pattern: /bg-slate-50\/50/g, replace: 'bg-background' },
];

const files = walkSync('./src');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    regexes.forEach(r => {
        content = content.replace(r.pattern, r.replace);
    });

    // Sort keys by length descending to replace larger chunks first
    const keys = Object.keys(map).sort((a, b) => b.length - a.length);

    keys.forEach(key => {
        // Replace whole words to avoid partial matches
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        content = content.replace(regex, map[key]);
    });

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    }
});
