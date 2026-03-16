import fs from 'fs';

let content = fs.readFileSync('tasks.js', 'utf8');

const target = `      } catch (err) {
        console.error('Error processing request body:', err);
      }`;

const replacement = `      } catch (err) {
        console.error('Error processing request body:', err);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Server error processing request' }));
        }
      }`;

content = content.replaceAll(target, replacement);

fs.writeFileSync('tasks.js', content);
console.log('Fixed catch blocks in tasks.js');
