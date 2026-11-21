require('../node_modules/dotenv').config({ path: './.env' });
require('../node_modules/ts-node').register({ transpileOnly: true });
const { InceptionMercuryProvider } = require('../src/services/solutions-finder/ai-providers/inception-mercury.provider.ts');

async function testFull() {
  const provider = new InceptionMercuryProvider();
  console.log('Provider initialized. Name:', provider.name, 'isAvailable:', provider.isAvailable());

  const result = await provider.extractIntent({
    queryText: 'We are a private medical college setting up an advanced 200-seat digital anatomy and simulation laboratory',
  });

  console.log('--- LIVE MERCURY-3 RESULT (MEDICAL LAB QUERY) ---');
  console.log(JSON.stringify(result, null, 2));
}

testFull().catch(console.error);
