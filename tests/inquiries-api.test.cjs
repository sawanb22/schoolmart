const assert = require('assert');
const path = require('path');

function resolveModule(modName) {
  try {
    return require(path.resolve(__dirname, '../backend/node_modules', modName));
  } catch {
    return require(modName);
  }
}

const tsNode = resolveModule('ts-node');
tsNode.register({
  transpileOnly: true,
  project: path.resolve(__dirname, '../backend/tsconfig.json'),
});

const express = require('express');
const inquiriesRoutes = require('../backend/src/routes/inquiries.routes.ts').default;
const prisma = require('../backend/src/lib/prisma').default;

const app = express();
app.use(express.json());
app.use('/api/inquiries', inquiriesRoutes);

async function testInquirySubmission() {
  console.log('Testing live POST /api/inquiries with user scenario...');

  const server = app.listen(0);
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}/api/inquiries`;

  try {
    const userPayload = {
      name: 'sawan bhardwaj',
      email: 'bhardwajsa@gmail.com',
      phone: '+918219511151',
      institutionName: 'asdfgn',
      designation: 'dean',
      location: 'shahpur',
      projectType: 'Existing Campus',
      budget: '45',
      timeline: '',
      message: 'adsfdbghhgfdy\n\nSelected Infrastructure Scope:\n- Turnkey Outdoor & Indoor Campus Sports Infrastructure\n- Football Ground',
      metadata: {
        traceId: 'trace-test-123456',
        selectedSolutions: ['sports-infra', 'football-ground'],
        source: 'solutions-finder-consultation',
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userPayload),
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    console.log('Response:', data);
    assert.strictEqual(data.success, true);
    assert.ok(data.id > 0);

    // Verify in database
    const saved = await prisma.contactEnquiry.findUnique({
      where: { id: data.id },
    });
    assert.ok(saved);
    assert.strictEqual(saved.name, 'sawan bhardwaj');
    assert.strictEqual(saved.email, 'bhardwajsa@gmail.com');
    assert.strictEqual(saved.phone, '+918219511151');
    assert.ok(saved.message.includes('adsfdbghhgfdy'));
    assert.ok(saved.message.includes('Turnkey Outdoor & Indoor Campus Sports Infrastructure'));
    console.log('✅ PASS: Enquiry successfully saved to database with ID:', saved.id);

    // Clean up test entry
    await prisma.contactEnquiry.delete({ where: { id: data.id } });
    console.log('✅ PASS: Test cleanup complete');

  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

testInquirySubmission().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
