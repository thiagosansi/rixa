import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildJoinUrl, isLocalHostname, pickJoinOrigin } from './join-url';

const LAN = 'http://192.168.1.43:3000';

test('hosts locais usam o origin da LAN', () => {
  for (const host of ['localhost', '127.0.0.1', '::1', '[::1]', '192.168.1.43', '10.0.0.5', '172.20.1.1', '172.16.0.1', '172.31.255.255', 'LOCALHOST']) {
    assert.equal(isLocalHostname(host), true, host);
    assert.equal(pickJoinOrigin(host, `http://${host}:3000`, LAN), LAN, host);
  }
});

test('hosts públicos usam window.location.origin (preserva https)', () => {
  for (const host of ['rixa.onrender.com', '172.32.0.1', '172.15.0.1', 'example.com', '8.8.8.8', '192.169.0.1', '11.0.0.1', '10.example.com', '999.1.1.1']) {
    const origin = `https://${host}`;
    assert.equal(isLocalHostname(host), false, host);
    assert.equal(pickJoinOrigin(host, origin, 'http://10.20.30.40'), origin, host);
  }
});

test('sem resposta do /api/lan cai no origin da página', () => {
  assert.equal(pickJoinOrigin('localhost', 'http://localhost:3000', null), 'http://localhost:3000');
  assert.equal(pickJoinOrigin('localhost', 'http://localhost:3000', undefined), 'http://localhost:3000');
});

test('buildJoinUrl monta o link de entrada', () => {
  assert.equal(buildJoinUrl('https://rixa.onrender.com', 'ABCD'), 'https://rixa.onrender.com/jogar?code=ABCD');
  assert.equal(buildJoinUrl('http://192.168.1.43:3000/', 'ABCD'), 'http://192.168.1.43:3000/jogar?code=ABCD');
});
