// Loaded only by the Playwright web server. Exercise streaming against a slow,
// deterministic export without sending browser-test traffic to Google Docs.
const { MockAgent, setGlobalDispatcher } = require('undici');
const mock = new MockAgent();
mock.enableNetConnect(host => host !== 'docs.google.com');
mock.get('https://docs.google.com')
  .intercept({ path: '/document/d/1pJZg5qvL2GOy0ppOqKEE65Tv001PaVUhpo6hEC4R284/export?format=html', method: 'GET' })
  .reply(200, '<html><head><style>.title{font-size:26pt}</style></head><body><p class="title">Slow example review</p><p>Example preview content.</p></body></html>', { headers: { 'content-type': 'text/html' } })
  .delay(5000)
  .persist();
setGlobalDispatcher(mock);
