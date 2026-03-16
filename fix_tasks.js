import fs from 'fs';

let content = fs.readFileSync('tasks.js', 'utf8');

const regex = /let body = '';\s*req\.on\('data', chunk => { body \+= chunk\.toString\(\); }\);\s*req\.on\('end', async \(\) => {([\s\S]*?)\n      \}\);/g;

content = content.replace(regex, (match, innerBody) => {
  return `let body = '';
      for await (const chunk of req) {
        body += chunk.toString();
      }
      try {${innerBody}
      } catch (err) {
        console.error('Error processing request body:', err);
      }`;
});

fs.writeFileSync('tasks.js', content);
console.log('Fixed tasks.js');
