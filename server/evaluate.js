#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const { runGenerationPipeline } = require('./services/generationService');

const parseArgs = (argv) => {
  const args = { input: '', output: '' };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--input') args.input = argv[i + 1];
    if (arg === '--output') args.output = argv[i + 1];
  }

  return args;
};

const safeReadJson = (filePath) => {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Failed to read JSON input from ${filePath}: ${error.message}`);
  }
};

const writeJson = (filePath, payload) => {
  const outputDirectory = path.dirname(filePath);
  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
};

const runCase = async (testCase, index) => {
  const { jobDescription, companyUrl, role = 'general', daysRequested = 7, minutesPerSession = 45 } = testCase;

  const pipeline = await runGenerationPipeline({
    jobDescription,
    companyUrl,
    category: role,
    daysRequested,
    minutesPerSession,
    discoverCompanyUrlsFn: async () => [
      { title: 'About', summary: 'Company-specific interview signal', category: 'company' },
      { title: 'Careers', summary: 'Hiring for role ', category: 'careers' },
    ],
  });

  return {
    caseIndex: index,
    ok: pipeline.validation.valid,
    kit: pipeline.kit,
    errors: pipeline.validation.errors,
    summary: {
      requirementCount: pipeline.requirements.length,
      questionCount: pipeline.questions.length,
      scheduleDays: pipeline.schedule.length,
    },
  };
};

const main = async () => {
  const { input, output } = parseArgs(process.argv.slice(2));

  if (!input || !output) {
    console.error('Usage: npm run evaluate -- --input <cases.json> --output <kits.json>');
    process.exit(1);
  }

  try {
    const inputData = safeReadJson(input);
    const cases = Array.isArray(inputData) ? inputData : [inputData];

    const results = [];
    for (let index = 0; index < cases.length; index += 1) {
      try {
        const result = await runCase(cases[index], index);
        results.push(result);
      } catch (error) {
        results.push({
          caseIndex: index,
          ok: false,
          errors: [error.message || 'Unknown evaluation failure'],
          summary: { requirementCount: 0, questionCount: 0, scheduleDays: 0 },
        });
      }
    }

    const payload = {
      generatedAt: new Date().toISOString(),
      totalCases: cases.length,
      successCount: results.filter((item) => item.ok).length,
      failedCount: results.filter((item) => !item.ok).length,
      results,
    };

    writeJson(output, payload);
    console.log(JSON.stringify({
      totalCases: cases.length,
      successCount: payload.successCount,
      failedCount: payload.failedCount,
      output,
    }, null, 2));
  } catch (error) {
    console.error(`Evaluation failed: ${error.message}`);
    process.exit(1);
  }
};

main();
