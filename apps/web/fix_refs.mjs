import fs from 'fs';
import path from 'path';

const sectionsDir = path.join(process.cwd(), 'src/components/sections');
const files = fs.readdirSync(sectionsDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(sectionsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace useRef<T | null>(null) with useRef<T>(null)
  const regex = /useRef<(\w+)\s*\|\s*null>\(/g;
  if (regex.test(content)) {
    content = content.replace(regex, 'useRef<$1>(');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed ${file}`);
  }
}
