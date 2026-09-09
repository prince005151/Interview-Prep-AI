const test = require('node:test');
const assert = require('node:assert/strict');

const {
  allocateStudySchedule,
  coverageGapCheck,
  buildQuestionBank,
  validateGeneratedKit,
  extractRequirementsFromJD,
  runGenerationPipeline,
} = require('../services/generationService');

test('study schedule allocates must-have items across the requested days and keeps harder items earlier', () => {
  const requirements = [
    { requirementId: 'r1', label: 'System design', mustHave: true, difficulty: 'hard' },
    { requirementId: 'r2', label: 'Python', mustHave: true, difficulty: 'medium' },
    { requirementId: 'r3', label: 'SQL', mustHave: true, difficulty: 'hard' },
    { requirementId: 'r4', label: 'REST APIs', mustHave: true, difficulty: 'medium' },
    { requirementId: 'r5', label: 'Leadership', mustHave: true, difficulty: 'easy' },
  ];

  const schedule = allocateStudySchedule(requirements, 3, 45);

  assert.equal(schedule.length, 3);
  assert.ok(schedule[0].items.some((item) => item.label === 'System design'));
  assert.ok(schedule[0].items.some((item) => item.label === 'SQL'));
  assert.ok(schedule[2].items.some((item) => item.label === 'Leadership'));
  schedule.forEach((day) => {
    day.items.forEach((item) => assert.equal(Number.isInteger(item.durationMinutes), true));
  });
});

test('coverage gap check triggers missing question generation for unmet must-have requirements', () => {
  const requirements = [
    { requirementId: 'r1', label: 'System design', mustHave: true },
    { requirementId: 'r2', label: 'Data modeling', mustHave: true },
  ];

  const questions = [
    { questionId: 'q1', requirementId: 'r1', prompt: 'Explain a scalable system design interview approach.' },
  ];

  const result = coverageGapCheck(requirements, questions);

  assert.deepEqual(result.missingRequirementIds, ['r2']);
  assert.equal(result.generatedQuestions.length, 1);
  assert.equal(result.generatedQuestions[0].requirementId, 'r2');
});

test('generated kit validation rejects invalid structures before persistence', () => {
  const validKit = {
    name: 'Senior backend engineer',
    role: 'backend',
    user: 'user-123',
    requirements: [
      { requirementId: 'req-1', label: 'System design', mustHave: true, niceToHave: false },
    ],
    questions: [
      { questionId: 'q-1', requirementId: 'req-1', prompt: 'Design a real-time API', mustAsk: true },
    ],
    schedule: [
      { day: 1, title: 'System design', durationMinutes: 45, mustDo: true, niceToDo: false },
    ],
  };

  assert.equal(validateGeneratedKit(validKit).valid, true);

  const invalidKit = {
    name: '',
    requirements: [{ requirementId: '', label: 'x', mustHave: true }],
    questions: [{ requirementId: 'missing', prompt: 'bad' }],
    schedule: [{ day: 1, durationMinutes: 12.5, mustDo: true }],
  };

  const result = validateGeneratedKit(invalidKit);
  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
});

test('buildQuestionBank groups prompts by requirement and category', () => {
  const requirements = [
    { requirementId: 'r1', label: 'System design', mustHave: true },
    { requirementId: 'r2', label: 'SQL', mustHave: false, niceToHave: true },
  ];

  const questions = buildQuestionBank(requirements, 'backend');

  assert.equal(questions.length, 2);
  assert.equal(questions[0].category, 'backend');
  assert.equal(questions[0].requirementId, 'r1');
  assert.equal(questions[0].mustAsk, true);
});

test('generation pipeline extracts JD requirements, crawls company signals, and validates before return', async () => {
  const jd = 'Must have strong system design experience. Must have Python and SQL. Nice to have mentoring experience.';
  const llmGenerateFn = async () => ({
    requirements: [
      { requirementId: 'r1', label: 'System design', description: 'Strong system design experience', mustHave: true, niceToHave: false, difficulty: 'hard' },
      { requirementId: 'r2', label: 'Python and SQL', description: 'Python and SQL experience', mustHave: true, niceToHave: false, difficulty: 'medium' },
      { requirementId: 'r3', label: 'Mentoring', description: 'Mentoring experience', mustHave: false, niceToHave: true, difficulty: 'medium' },
    ],
    questions: [
      { questionId: 'q1', requirementId: 'r1', prompt: 'Design a resilient system for a high-volume product.', answerKey: 'Discuss tradeoffs and failure modes.', mustAsk: true, category: 'backend' },
      { questionId: 'q2', requirementId: 'r2', prompt: 'Describe a production project using Python and SQL.', answerKey: 'Cover design choices and outcomes.', mustAsk: true, category: 'backend' },
      { questionId: 'q3', requirementId: 'r3', prompt: 'Tell us about mentoring another engineer.', answerKey: 'Use a specific example.', niceToAsk: true, category: 'backend' },
    ],
  });

  const pipeline = await runGenerationPipeline({
    jobDescription: jd,
    companyUrl: 'https://example.com',
    category: 'backend',
    daysRequested: 2,
    minutesPerSession: 50,
    discoverCompanyUrlsFn: async () => [
      { title: 'About', summary: 'Fast-growing engineering org', category: 'company' },
      { title: 'Careers', summary: 'Hiring backend engineers', category: 'careers' },
    ],
    llmGenerateFn,
  });

  assert.ok(pipeline.requirements.length >= 3);
  assert.equal(pipeline.interviewSignals.length, 2);
  assert.equal(pipeline.validation.valid, true);
  assert.ok(pipeline.questions.length >= pipeline.requirements.length);
});

test('generation pipeline asks the LLM to repair uncovered must-have requirements', async () => {
  let calls = 0;
  const llmGenerateFn = async ({ missingRequirementIds = [] }) => {
    calls += 1;
    if (!missingRequirementIds.length) {
      return {
        requirements: [{ requirementId: 'r1', label: 'System design', description: 'System design', mustHave: true, niceToHave: false }],
        questions: [],
      };
    }
    return {
      requirements: [{ requirementId: 'r1', label: 'System design', description: 'System design', mustHave: true, niceToHave: false }],
      questions: [{ requirementId: 'r1', prompt: 'Design a scalable service and explain your tradeoffs.', mustAsk: true }],
    };
  };

  const pipeline = await runGenerationPipeline({
    jobDescription: 'Must have strong system design experience.',
    category: 'backend',
    llmGenerateFn,
  });

  assert.equal(calls, 2);
  assert.equal(pipeline.validation.valid, true);
  assert.equal(pipeline.questions[0].requirementId, 'r1');
});

test('schedule allocation remains bounded for short-session and long-horizon requests', () => {
  const schedule = allocateStudySchedule([
    { requirementId: 'r1', label: 'System design', mustHave: true, difficulty: 'hard' },
  ], 72, 5);

  assert.equal(schedule.length, 30);
  assert.equal(schedule[0].items[0].durationMinutes, 15);
});

test('generation rejects invalid URLs and stub job descriptions before research', async () => {
  await assert.rejects(
    () => runGenerationPipeline({ jobDescription: 'Build APIs for a team', companyUrl: 'ftp://example.com' }),
    /Invalid company URL/,
  );

  await assert.rejects(
    () => runGenerationPipeline({ jobDescription: 'JD' }),
    /at least 10 characters/,
  );
});
