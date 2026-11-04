import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createServer } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const profile = await mkdtemp(path.join(os.tmpdir(), 'codebattle-vim-'));
const fixture = await mkdtemp(path.join(root, '.vim-test-'));
const server = await createServer({
  configFile: false,
  root,
  optimizeDeps: { noDiscovery: true, include: ['monaco-vim'] },
  resolve: { alias: { 'monaco-editor/esm/vs': path.join(root, 'node_modules/monaco-editor/esm/vs') } },
  server: { host: '127.0.0.1', port: 0 },
});
let chrome;
let socket;
const pause = () => new Promise((resolve) => setTimeout(resolve, 100));

try {
  await writeFile(path.join(fixture, 'index.html'), `<!doctype html>
    <div id="editor" style="height:400px;width:800px"></div>
    <script type="module">
      import * as monaco from '/node_modules/monaco-editor/esm/vs/editor/editor.api.js';
      import { initEditorVim } from '/src/features/game/editor/vim.ts';
      window.testEditor = monaco.editor.create(document.getElementById('editor'), {value:'',language:'plaintext'});
      initEditorVim(window.testEditor, null);
      window.testEditor.focus();
      window.ready = true;
    </script>`);
  await server.listen();
  chrome = spawn(process.env.CHROMIUM_PATH || 'chromium', [
    '--headless', '--no-sandbox', '--disable-gpu', '--remote-debugging-port=0',
    `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: 'ignore' });
  let launchError;
  chrome.on('error', (error) => { launchError = error; });
  let port;
  for (let i = 0; i < 100 && !port; i++) {
    if (launchError) throw launchError;
    try { port = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; } catch { await pause(); }
  }
  assert.ok(port, 'Chromium did not start (override its executable with CHROMIUM_PATH)');
  const info = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  socket = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let id = 0;
  const pending = new Map();
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    clearTimeout(request.timeout);
    if (message.error) request.reject(new Error(JSON.stringify(message.error)));
    else request.resolve(message.result);
  });
  const call = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const requestId = ++id;
    const timeout = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 10_000);
    pending.set(requestId, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id: requestId, method, params, sessionId }));
  });
  const url = `http://127.0.0.1:${server.httpServer.address().port}/${path.basename(fixture)}/index.html`;
  const { targetId } = await call('Target.createTarget', { url });
  const { sessionId } = await call('Target.attachToTarget', { targetId, flatten: true });
  const evaluate = async (expression) => {
    const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
    assert.equal(result.exceptionDetails, undefined, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  for (let i = 0; i < 200; i++) {
    if (await evaluate('window.ready')) break;
    await pause();
  }
  assert.equal(await evaluate('window.ready'), true, 'Monaco did not load');
  const key = async (key, code, keyCode, text) => {
    const event = { key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode };
    await call('Input.dispatchKeyEvent', { type: 'keyDown', ...event, ...(text ? { text } : {}) }, sessionId);
    await call('Input.dispatchKeyEvent', { type: 'keyUp', ...event }, sessionId);
  };
  for (const [deletion, prefix, expected] of [
    ['Backspace', '', 'Zbc'], ['Delete', '', 'aZc'],
    ['Backspace', 'xy', 'axZbc'], ['Delete', 'xy', 'axyZc'],
  ]) {
    await evaluate("window.testEditor.setValue('abc\\nabc');window.testEditor.setPosition({lineNumber:1,column:2});window.testEditor.focus()");
    await key('i', 'KeyI', 73, 'i');
    if (prefix) await call('Input.insertText', { text: prefix }, sessionId);
    await key(deletion, deletion, deletion === 'Backspace' ? 8 : 46);
    await key('Z', 'KeyZ', 90, 'Z');
    await key('Escape', 'Escape', 27);
    await evaluate('window.testEditor.setPosition({lineNumber:2,column:2})');
    await key('.', 'Period', 190, '.');
    const lines = await evaluate('window.testEditor.getValue().split("\\n")');
    assert.deepEqual(lines, [expected, expected], `${deletion} must survive dot repeat`);
  }
  console.log('Vim browser replay checks passed: Backspace, Delete');
} finally {
  socket?.close();
  if (chrome?.pid && chrome.exitCode === null) {
    const exited = new Promise((resolve) => chrome.once('exit', resolve));
    chrome.kill();
    await exited;
  }
  await server.close();
  await rm(fixture, { recursive: true, force: true });
  await rm(profile, { recursive: true, force: true });
}
