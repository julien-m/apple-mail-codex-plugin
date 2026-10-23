import { spawn } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export function loadConnection(configFile) {
  if (!isAbsolute(configFile) || (statSync(configFile).mode & 0o077)) throw new Error('Private configuration required');
  const config = JSON.parse(readFileSync(configFile, 'utf8'));
  if (config.version !== 1 || Object.keys(config).some(k => !['version', 'serviceRoot', 'envFile', 'credsCommand'].includes(k))) throw new Error('Invalid configuration');
  for (const key of ['serviceRoot', 'envFile', 'credsCommand']) if (typeof config[key] !== 'string' || !isAbsolute(config[key])) throw new Error('Absolute paths required');
  if (statSync(config.envFile).mode & 0o077) throw new Error('Private environment references required');
  const variables = Object.create(null);
  for (const line of readFileSync(config.envFile, 'utf8').split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const match = /^(MAIL_API_URL|MAIL_API_TOKEN)=(.+)$/.exec(line);
    if (!match || variables[match[1]]) throw new Error('Invalid environment references');
    variables[match[1]] = match[2];
  }
  if (!/^creds:[a-z0-9._-]+\/[a-z0-9._-]+\/[a-z0-9._/-]+$/.test(variables.MAIL_API_TOKEN ?? '')) throw new Error('Keychain reference required');
  const url = new URL(variables.MAIL_API_URL);
  if (url.username || url.password || !(['https:'].includes(url.protocol) || url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))) throw new Error('Secure API URL required');
  const bridge = join(config.serviceRoot, 'dist/transports/stdio.js');
  if (!statSync(bridge).isFile() || !statSync(config.credsCommand).isFile()) throw new Error('Runtime unavailable');
  return { command: config.credsCommand, args: ['env', '--file', config.envFile, '--', process.execPath, bridge] };
}

export function launch(configFile) {
  const connection = loadConnection(configFile);
  const env = {};
  for (const key of ['PATH', 'HOME', 'USER', 'LOGNAME', 'TMPDIR', 'LANG', 'LC_ALL']) if (process.env[key] !== undefined) env[key] = process.env[key];
  const grouped = process.platform !== 'win32';
  const child = spawn(connection.command, connection.args, { stdio: 'inherit', env, detached: grouped });
  let timer;
  let stopping=false, forced=false;
  function send(signal) {
    try { if (grouped && child.pid) process.kill(-child.pid, signal); else child.kill(signal); } catch { /* Child already exited. */ }
  }
  const handlers = new Map(['SIGINT', 'SIGTERM', 'SIGHUP'].map(signal => [signal, () => {
    stopping=true;
    send(signal);
    timer ??= setTimeout(() => {forced=true;send('SIGKILL');}, 5000).unref();
  }]));
  for (const [signal, handler] of handlers) process.on(signal, handler);
  const cleanup = () => { clearTimeout(timer); for (const [signal, handler] of handlers) process.removeListener(signal, handler); };
  child.once('error', () => { cleanup(); process.stderr.write('Apple Mail: Unable to launch. Check the local configuration and macOS Keychain.\n'); process.exitCode = 1; });
  child.once('exit', (code, signal) => { if(grouped)send('SIGKILL'); cleanup(); process.exitCode = stopping&&!forced ? 0 : code ?? (signal ? 1 : 0); });
  return child;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { launch(process.env.APPLE_MAIL_CONFIG ?? join(homedir(), 'Library', 'Application Support', 'apple-mail', 'config.json')); }
  catch { process.stderr.write('Apple Mail: Configure the service and Keychain references using the installation guide.\n'); process.exitCode = 1; }
}
