const { requestCompletion } = require('./llmService');

const REQUIRED_FIELDS = {
  requirement: ['requirementId', 'label', 'mustHave', 'niceToHave'],
  question: ['questionId', 'requirementId', 'prompt', 'mustAsk'],
  schedule: ['day', 'title', 'durationMinutes', 'mustDo'],
};

const extractRequirementsFromJD = (jobDescription) => {
  const rawText = String(jobDescription || '').trim();
  if (!rawText) {
    return [];
  }

  const lines = rawText
    .split(/\r?\n|\.|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.length > 3);

  const requirementCandidates = lines.map((line) => {
    const lower = line.toLowerCase();
    const isMustHave = /(must|required|strong|deep|expert|proven|experience)/.test(lower);
    const isNiceToHave = /(nice to have|preferred|bonus|plus|advantage)/.test(lower);
    const label = line.replace(/^(must have|nice to have|required|preferred|bonus|experience with|knowledge of)\s*[:\-]?\s*/i, '').trim();

    return {
      requirementId: `jd-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'requirement'}`,
      label,
      mustHave: isMustHave && !isNiceToHave,
      niceToHave: isNiceToHave || (!isMustHave && !isNiceToHave),
      description: line,
      difficulty: /design|architecture|scalab|leadership|ml|distributed|system/.test(lower) ? 'hard' : 'medium',
    };
  });

  return requirementCandidates
    .filter((item) => item.label.length > 2)
    .slice(0, 20)
    .map(normalizeRequirement);
};

const searchInterviewDiscussions = (companySignals = []) => {
  return (companySignals || []).map((signal, index) => ({
    id: `signal-${index + 1}`,
    title: signal && signal.title ? signal.title : `Interview signal ${index + 1}`,
    summary: signal && signal.summary ? signal.summary : 'Company-specific interview signal collected from public research.',
    source: 'public-company-research',
    category: signal && signal.category ? signal.category : 'general',
  }));
};

const normalizeRequirement = (requirement) => ({
  requirementId: requirement.requirementId || requirement.id || `req-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  label: String(requirement.label || '').trim(),
  description: String(requirement.description || '').trim(),
  mustHave: Boolean(requirement.mustHave ?? true),
  niceToHave: Boolean(requirement.niceToHave ?? false),
  difficulty: requirement.difficulty || 'medium',
  weight: Number.isFinite(Number(requirement.weight)) ? Number(requirement.weight) : 5,
});

const slugify = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 80);

const normalizeLLMOutput = (output, category) => {
  const requirements = (Array.isArray(output?.requirements) ? output.requirements : [])
    .map((item) => normalizeRequirement({
      ...item,
      requirementId: item.requirementId || `jd-${slugify(item.label)}`,
    }))
    .filter((item) => item.label.length > 2)
    .slice(0, 30);
  const requirementIds = new Set(requirements.map((item) => item.requirementId));
  const questions = (Array.isArray(output?.questions) ? output.questions : [])
    .map((item, index) => ({
      questionId: item.questionId || `${category}-q-${index + 1}`,
      requirementId: item.requirementId,
      prompt: String(item.prompt || '').trim(),
      answerKey: String(item.answerKey || '').trim(),
      category: String(item.category || category),
      mustAsk: Boolean(item.mustAsk),
      niceToAsk: Boolean(item.niceToAsk),
      difficulty: item.difficulty || 'medium',
    }))
    .filter((item) => item.prompt.length > 10 && requirementIds.has(item.requirementId));

  return {
    requirements,
    questions,
    companyBrief: String(output?.companyBrief || '').trim(),
    researchSignals: Array.isArray(output?.researchSignals) ? output.researchSignals : [],
  };
};

const generateWithGemini = async ({ jobDescription, companyUrl, category, companySignals = [], requirements = [], missingRequirementIds = [] }) => {
  const repairContext = missingRequirementIds.length
    ? `Repair only these missing requirement IDs: ${missingRequirementIds.join(', ')}. Return questions for those IDs.`
    : 'Generate the complete preparation content from the job description.';
  const prompt = [
    `Role category: ${category}`,
    `Company URL: ${companyUrl || 'not provided'}`,
    `Discovered company signals: ${JSON.stringify(companySignals).slice(0, 12000)}`,
    `Existing requirements for repair: ${JSON.stringify(requirements).slice(0, 12000)}`,
    repairContext,
    'Job description:',
    String(jobDescription).slice(0, 24000),
  ].join('\n\n');

  return requestCompletion({
    system: [
      'You are an expert interview preparation strategist.',
      'Analyze the job description and produce practical, role-specific preparation content.',
      'Return only valid JSON matching this shape: {"requirements":[],"questions":[],"companyBrief":"","researchSignals":[]}.',
      'Each requirement needs label, description, mustHave, niceToHave, difficulty (easy|medium|hard), and weight (1-10).',
      'Each question needs requirementId, prompt, answerKey, category, mustAsk, niceToAsk, and difficulty.',
      'Use requirementId values exactly when repairing existing requirements.',
      'Create at least one question for every must-have requirement.',
      'Do not invent company facts. Mark unknown company details as unknown.',
    ].join(' '),
    user: prompt,
  });
};

const runGenerationPipeline = async ({ jobDescription, companyUrl, category = 'general', daysRequested = 7, minutesPerSession = 45, discoverCompanyUrlsFn = null, llmGenerateFn = generateWithGemini }) => {
  if (companyUrl) {
    try {
      const parsedUrl = new URL(companyUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Company URL must use HTTP or HTTPS.');
      }
    } catch (error) {
      throw new Error(`Invalid company URL: ${error.message}`);
    }
  }

  if (String(jobDescription || '').trim().length < 10) {
    throw new Error('Job description must contain at least 10 characters.');
  }

  const companySignals = discoverCompanyUrlsFn
    ? await discoverCompanyUrlsFn(companyUrl)
    : [];
  const discussionSignals = searchInterviewDiscussions(companySignals);
  const initialOutput = normalizeLLMOutput(await llmGenerateFn({
    jobDescription,
    companyUrl,
    category,
    companySignals,
  }), category);
  const baseRequirements = initialOutput.requirements;

  if (!baseRequirements.length) {
    throw new Error('The LLM did not identify any usable job requirements.');
  }

  const gapCheck = coverageGapCheck(baseRequirements, initialOutput.questions);
  let finalQuestions = initialOutput.questions;
  if (!gapCheck.isCovered) {
    const missingRequirements = baseRequirements.filter((item) => gapCheck.missingRequirementIds.includes(item.requirementId));
    const repairOutput = normalizeLLMOutput(await llmGenerateFn({
      jobDescription,
      companyUrl,
      category,
      companySignals,
      requirements: missingRequirements,
      missingRequirementIds: gapCheck.missingRequirementIds,
    }), category);
    finalQuestions = [...finalQuestions, ...repairOutput.questions];
  }

  const finalGapCheck = coverageGapCheck(baseRequirements, finalQuestions);
  if (!finalGapCheck.isCovered) {
    throw new Error(`The LLM output missed must-have requirements: ${finalGapCheck.missingRequirementIds.join(', ')}`);
  }

  const schedule = allocateStudySchedule(baseRequirements, daysRequested, minutesPerSession);
  const kit = {
    name: `${category || 'Interview'} prep kit`,
    role: category,
    user: 'pipeline-user',
    requirements: baseRequirements,
    questions: finalQuestions,
    schedule,
    companyBrief: initialOutput.companyBrief,
    researchSignals: [...discussionSignals, ...initialOutput.researchSignals],
  };
  const validation = validateGeneratedKit(kit);

  return {
    requirements: baseRequirements,
    companySignals,
    interviewSignals: discussionSignals,
    questions: finalQuestions,
    schedule,
    validation,
    kit,
  };
};

const getDifficultyScore = (item) => {
  const difficulty = String(item.difficulty || 'medium').toLowerCase();
  if (difficulty === 'hard') return 3;
  if (difficulty === 'easy') return 1;
  return 2;
};

const allocateStudySchedule = (requirements, daysRequested, minutesPerSession = 45) => {
  const safeDays = Math.min(30, Math.max(1, Number(daysRequested) || 1));
  const safeMinutes = Math.min(180, Math.max(15, Number(minutesPerSession) || 45));
  const mustHaveItems = (requirements || [])
    .filter((item) => item && item.mustHave)
    .map((item) => ({ ...normalizeRequirement(item), score: getDifficultyScore(item) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(a.label).localeCompare(String(b.label));
    });

  const output = Array.from({ length: safeDays }, (_, index) => ({
    day: index + 1,
    title: `Day ${index + 1} focus`,
    items: [],
    durationMinutes: 0,
    mustDo: true,
    niceToDo: false,
  }));

  if (!mustHaveItems.length) {
    return output;
  }

  const chunkSize = Math.max(1, Math.ceil(mustHaveItems.length / safeDays));
  const sessionMinutes = Math.max(15, Math.round(safeMinutes / chunkSize));

  mustHaveItems.forEach((item, index) => {
    const dayIndex = Math.min(Math.floor(index / chunkSize), safeDays - 1);
    output[dayIndex].items.push({
      ...item,
      durationMinutes: sessionMinutes,
    });
    output[dayIndex].durationMinutes += sessionMinutes;
  });

  return output.map((day, index) => ({
    ...day,
    title: index === 0 ? 'High-priority foundations' : `Day ${index + 1} review`,
    items: [...day.items].sort((a, b) => b.score - a.score),
  }));
};

const coverageGapCheck = (requirements, questions) => {
  const reqItems = (requirements || []).filter((item) => item && item.mustHave);
  const qItems = questions || [];

  const missingRequirementIds = reqItems
    .map((item) => item.requirementId || item.id)
    .filter((requirementId) => !qItems.some((question) => (question.requirementId || question.requirement_id) === requirementId));

  const generatedQuestions = missingRequirementIds.map((requirementId, index) => ({
    questionId: `auto-${requirementId}-${index + 1}`,
    requirementId,
    prompt: `Generate a targeted interview question for the requirement: ${requirementId}.`,
    mustAsk: true,
    niceToAsk: false,
    category: 'generated',
  }));

  return {
    missingRequirementIds,
    generatedQuestions,
    isCovered: missingRequirementIds.length === 0,
  };
};

const buildQuestionBank = (requirements, category = 'general') => {
  const items = (requirements || []).map((requirement, index) => ({
    questionId: `${category}-q-${index + 1}`,
    requirementId: requirement.requirementId || requirement.id || `req-${index + 1}`,
    prompt: `Discuss your experience with ${requirement.label || 'this requirement'} in an interview context.`,
    answerKey: '',
    category,
    mustAsk: Boolean(requirement.mustHave ?? true),
    niceToAsk: Boolean(requirement.niceToHave ?? false),
    difficulty: requirement.difficulty || 'medium',
  }));

  return items;
};

const validateGeneratedKit = (kit) => {
  const errors = [];

  if (!kit || typeof kit !== 'object') {
    return { valid: false, errors: ['Kit payload is required.'] };
  }

  if (!kit.name || String(kit.name).trim().length < 3) {
    errors.push('Kit name is required and must be at least 3 characters long.');
  }

  if (!kit.user || String(kit.user).trim() === '') {
    errors.push('Kit user ownership is required.');
  }

  if (!Array.isArray(kit.requirements) || kit.requirements.length === 0) {
    errors.push('At least one requirement is required.');
  } else {
    kit.requirements.forEach((item, index) => {
      if (!item || typeof item !== 'object') {
        errors.push(`Requirement at index ${index} is invalid.`);
        return;
      }

      for (const field of REQUIRED_FIELDS.requirement) {
        if (field === 'mustHave' || field === 'niceToHave') {
          if (typeof item[field] !== 'boolean') {
            errors.push(`Requirement ${index} field '${field}' must be boolean.`);
          }
        } else if (!String(item[field] || '').trim()) {
          errors.push(`Requirement ${index} field '${field}' is required.`);
        }
      }
    });
  }

  if (!Array.isArray(kit.questions)) {
    errors.push('Questions must be an array.');
  } else {
    kit.questions.forEach((item, index) => {
      if (!item || typeof item !== 'object') {
        errors.push(`Question at index ${index} is invalid.`);
        return;
      }

      for (const field of REQUIRED_FIELDS.question) {
        if (field === 'mustAsk') {
          if (typeof item[field] !== 'boolean') {
            errors.push(`Question ${index} field '${field}' must be boolean.`);
          }
        } else if (!String(item[field] || '').trim()) {
          errors.push(`Question ${index} field '${field}' is required.`);
        }
      }
    });
  }

  if (!Array.isArray(kit.schedule)) {
    errors.push('Schedule must be an array.');
  } else {
    kit.schedule.forEach((item, index) => {
      if (!item || typeof item !== 'object') {
        errors.push(`Schedule item at index ${index} is invalid.`);
        return;
      }

      for (const field of REQUIRED_FIELDS.schedule) {
        if (field === 'day' || field === 'durationMinutes') {
          if (!Number.isInteger(Number(item[field]))) {
            errors.push(`Schedule item ${index} field '${field}' must be an integer.`);
          }
        } else if (field === 'mustDo' && typeof item[field] !== 'boolean') {
          errors.push(`Schedule item ${index} field 'mustDo' must be boolean.`);
        } else if (!String(item[field] || '').trim()) {
          errors.push(`Schedule item ${index} field '${field}' is required.`);
        }
      }
    });
  }

  return { valid: errors.length === 0, errors };
};

module.exports = {
  normalizeRequirement,
  extractRequirementsFromJD,
  searchInterviewDiscussions,
  runGenerationPipeline,
  allocateStudySchedule,
  coverageGapCheck,
  buildQuestionBank,
  validateGeneratedKit,
};
