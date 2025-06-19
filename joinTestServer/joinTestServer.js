import { spawn } from 'child_process';

const [,, targetUrl, startIndex, numInstances] = process.argv;

if (!targetUrl || isNaN(Number(startIndex)) || !numInstances || isNaN(Number(numInstances))) {
  console.error('Usage: node joinTestServer.js <targetUrl> <startIndex> <numInstances> (0 becomes host, others guests)');
  process.exit(1);
}

// 0 becomes host, others become guets
const instances = [];
for (let i = 1; i <= Number(numInstances); i++) {
  const child = spawn('node', [
    '../joinTestUser/joinTestUser.js',
    targetUrl, 
    Number(startIndex) + i,
  ], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  instances.push(child);

  const waitMs = Math.floor(Math.random() * 60*1000) + 1000;
  await new Promise(res => setTimeout(res, waitMs));    
}

process.on('SIGINT', () => {
  console.log('Shutting down all joinTestUser instances...');
  instances.forEach(child => child.kill());
  process.exit(0);
}); 