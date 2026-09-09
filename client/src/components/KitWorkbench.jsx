import { useMemo, useState } from 'react';

const tabs = ['brief', 'role', 'questions', 'flashcards', 'schedule', 'practice'];
const tabLabels = {
  brief: 'Company Brief',
  role: 'Role Breakdown',
  questions: 'Question Bank',
  flashcards: 'Flashcards',
  schedule: 'Schedule',
  practice: 'Practice Mode',
};

const makeFlashcards = (questions = []) => questions.map((question) => ({
  cardId: `card-${question.questionId}`,
  questionId: question.questionId,
  front: question.prompt,
  back: question.answerKey || 'Add an answer outline before practice.',
  confidence: null,
}));

const makeInitialState = (kit) => ({
  ...kit,
  researchSignals: kit.researchSignals || [],
  questions: (kit.questions || []).map((question) => ({
    answerKey: '',
    category: kit.role || 'general',
    pinned: false,
    edited: false,
    ...question,
  })),
  flashcards: kit.flashcards?.length ? kit.flashcards : makeFlashcards(kit.questions || []),
});

const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500';
const cardClass = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm';

function SectionHeader({ title, description, onRegenerate }) {
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <button type="button" onClick={onRegenerate} className="rounded-xl border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">
        Regenerate section
      </button>
    </div>
  );
}

export default function KitWorkbench({ kit, onChange }) {
  const [activeTab, setActiveTab] = useState('brief');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [practiceConfidence, setPracticeConfidence] = useState({});

  const state = useMemo(() => makeInitialState(kit), [kit]);
  const categories = useMemo(() => [...new Set(state.questions.map((item) => item.category || 'general'))], [state.questions]);
  const visibleQuestions = selectedCategory === 'all'
    ? state.questions
    : state.questions.filter((item) => (item.category || 'general') === selectedCategory);
  const practiceCards = useMemo(() => [...state.flashcards].sort((a, b) => {
    const confidenceA = practiceConfidence[a.cardId] ?? a.confidence ?? 0;
    const confidenceB = practiceConfidence[b.cardId] ?? b.confidence ?? 0;
    return confidenceA - confidenceB;
  }), [state.flashcards, practiceConfidence]);
  const activeCard = practiceCards[practiceIndex % Math.max(practiceCards.length, 1)];
  const coveredCount = practiceCards.filter((card) => (practiceConfidence[card.cardId] ?? card.confidence) !== null && (practiceConfidence[card.cardId] ?? card.confidence) !== undefined).length;

  const updateState = (nextState) => onChange(nextState);

  const updateQuestion = (questionId, patch) => {
    updateState({
      ...state,
      questions: state.questions.map((question) => question.questionId === questionId
        ? { ...question, ...patch, edited: true }
        : question),
    });
  };

  const moveQuestion = (questionId, direction) => {
    const index = state.questions.findIndex((question) => question.questionId === questionId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= state.questions.length) return;
    const questions = [...state.questions];
    [questions[index], questions[target]] = [questions[target], questions[index]];
    updateState({ ...state, questions });
  };

  const regenerateSection = (section) => {
    if (section === 'questions') {
      const generated = state.questions.map((question) => {
        const isSelectedCategory = selectedCategory === 'all' || (question.category || 'general') === selectedCategory;
        return !isSelectedCategory || question.edited || question.pinned
          ? question
          : { ...question, prompt: `Discuss your experience with ${question.requirementId} in an interview context.`, answerKey: '' };
      });
      updateState({ ...state, questions: generated });
      return;
    }

    if (section === 'flashcards') {
      const generated = state.flashcards.map((card) => card.pinned || card.edited
        ? card
        : { ...card, front: state.questions.find((question) => question.questionId === card.questionId)?.prompt || card.front });
      updateState({ ...state, flashcards: generated });
      return;
    }

    if (section === 'brief') {
      updateState({ ...state, brief: state.brief?.edited ? state.brief : { ...(state.brief || {}), summary: `Research brief for ${state.role || 'this role'} at the target company.` } });
    }
  };

  const updateFlashcard = (cardId, patch) => {
    updateState({
      ...state,
      flashcards: state.flashcards.map((card) => card.cardId === cardId ? { ...card, ...patch, edited: true } : card),
    });
  };

  const setConfidence = (cardId, confidence) => {
    setPracticeConfidence((current) => ({ ...current, [cardId]: confidence }));
    updateFlashcard(cardId, { confidence });
  };

  const renderBrief = () => (
    <section className={cardClass}>
      <SectionHeader title="Company Brief" description="Research signals and the working narrative for this target." onRegenerate={() => regenerateSection('brief')} />
      <textarea
        className={`${inputClass} min-h-32`}
        value={state.brief?.summary || state.researchSignals.map((signal) => signal.summary).join('\n\n') || 'No company brief has been generated yet.'}
        onChange={(event) => updateState({ ...state, brief: { ...(state.brief || {}), summary: event.target.value, edited: true } })}
      />
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {state.researchSignals.map((signal) => (
          <div key={signal.id} className="rounded-xl bg-slate-50 p-3">
            <p className="font-semibold text-slate-800">{signal.title}</p>
            <p className="mt-1 text-sm text-slate-600">{signal.summary}</p>
          </div>
        ))}
      </div>
    </section>
  );

  const renderRole = () => (
    <section className={cardClass}>
      <SectionHeader title="Role Breakdown" description="Edit requirements and keep the highest-value topics visible." onRegenerate={() => onChange({ ...state, requirements: state.requirements })} />
      <div className="space-y-3">
        {state.requirements.map((requirement) => (
          <div key={requirement.requirementId} className="grid gap-3 rounded-xl bg-slate-50 p-3 md:grid-cols-[1fr_auto]">
            <div>
              <input className={inputClass} value={requirement.label} onChange={(event) => updateState({ ...state, requirements: state.requirements.map((item) => item.requirementId === requirement.requirementId ? { ...item, label: event.target.value, edited: true } : item) })} />
              <textarea className={`${inputClass} mt-2`} value={requirement.description || ''} onChange={(event) => updateState({ ...state, requirements: state.requirements.map((item) => item.requirementId === requirement.requirementId ? { ...item, description: event.target.value, edited: true } : item) })} />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={Boolean(requirement.mustHave)} onChange={(event) => updateState({ ...state, requirements: state.requirements.map((item) => item.requirementId === requirement.requirementId ? { ...item, mustHave: event.target.checked, edited: true } : item) })} />
              Must have
            </label>
          </div>
        ))}
      </div>
    </section>
  );

  const renderQuestions = () => (
    <section className={cardClass}>
      <SectionHeader title="Question Bank" description={`Edit prompts, answer outlines, categories, and order without losing custom work. Regenerates ${selectedCategory === 'all' ? 'all categories' : selectedCategory}.`} onRegenerate={() => regenerateSection('questions')} />
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => setSelectedCategory('all')} className={`rounded-full px-3 py-1.5 text-sm ${selectedCategory === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>All</button>
        {categories.map((category) => <button type="button" key={category} onClick={() => setSelectedCategory(category)} className={`rounded-full px-3 py-1.5 text-sm ${selectedCategory === category ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>{category}</button>)}
      </div>
      <div className="space-y-4">
        {visibleQuestions.map((question) => (
          <article key={question.questionId} className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{question.questionId}</span>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => moveQuestion(question.questionId, -1)} className="rounded-lg border px-2 py-1 text-sm" title="Move up">↑</button>
                <button type="button" onClick={() => moveQuestion(question.questionId, 1)} className="rounded-lg border px-2 py-1 text-sm" title="Move down">↓</button>
                <label className="flex items-center gap-1 text-sm text-slate-600"><input type="checkbox" checked={Boolean(question.pinned)} onChange={(event) => updateQuestion(question.questionId, { pinned: event.target.checked })} /> Pinned</label>
              </div>
            </div>
            <textarea className={`${inputClass} min-h-20`} value={question.prompt} onChange={(event) => updateQuestion(question.questionId, { prompt: event.target.value })} />
            <textarea className={`${inputClass} mt-3 min-h-20`} value={question.answerKey || ''} placeholder="Answer outline" onChange={(event) => updateQuestion(question.questionId, { answerKey: event.target.value })} />
            <select className={`${inputClass} mt-3 md:w-56`} value={question.category || 'general'} onChange={(event) => updateQuestion(question.questionId, { category: event.target.value })}>
              {[...new Set(['general', state.role || 'general', ...categories])].map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </article>
        ))}
      </div>
    </section>
  );

  const renderFlashcards = () => (
    <section className={cardClass}>
      <SectionHeader title="Flashcards" description="Edit prompts and answers, then take them into practice mode." onRegenerate={() => regenerateSection('flashcards')} />
      <div className="space-y-4">
        {state.flashcards.map((card) => (
          <article key={card.cardId} className="rounded-xl border border-slate-200 p-4">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Front</label>
            <textarea className={`${inputClass} min-h-16`} value={card.front} onChange={(event) => updateFlashcard(card.cardId, { front: event.target.value })} />
            <label className="mb-1 mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">Answer</label>
            <textarea className={`${inputClass} min-h-16`} value={card.back} onChange={(event) => updateFlashcard(card.cardId, { back: event.target.value })} />
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={Boolean(card.pinned)} onChange={(event) => updateFlashcard(card.cardId, { pinned: event.target.checked })} /> Pinned</label>
          </article>
        ))}
      </div>
    </section>
  );

  const renderSchedule = () => (
    <section className={cardClass}>
      <SectionHeader title="Study Schedule" description="A day-by-day plan with focus areas, linked question IDs, and minute allocations." onRegenerate={() => onChange({ ...state, schedule: state.schedule })} />
      <div className="grid gap-4 md:grid-cols-2">
        {state.schedule.map((day) => (
          <article key={day.day} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3"><h3 className="font-bold text-slate-900">Day {day.day}: {day.title}</h3><span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">{day.durationMinutes} min</span></div>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {day.items.map((item) => <li key={item.requirementId} className="rounded-lg bg-slate-50 px-3 py-2"><span className="font-medium">{item.label}</span><span className="block text-xs text-slate-500">{item.durationMinutes} min · {state.questions.filter((question) => question.requirementId === item.requirementId).map((question) => question.questionId).join(', ') || 'No linked question'}</span></li>)}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );

  const renderPractice = () => (
    <section className={cardClass}>
      <SectionHeader title="Practice Mode" description="Low-confidence cards move to the front of the next review session." onRegenerate={() => setPracticeIndex(0)} />
      <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><span>Coverage: {coveredCount}/{practiceCards.length} cards rated</span><span>Review order: lowest confidence first</span></div>
      {activeCard ? <div className="mx-auto max-w-2xl rounded-2xl border border-blue-200 bg-blue-50 p-6 text-center"><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Card {practiceIndex + 1} of {practiceCards.length}</p><p className="mt-5 text-xl font-semibold text-slate-900">{activeCard.front}</p>{answerRevealed && <p className="mt-5 rounded-xl bg-white p-4 text-left text-slate-700">{activeCard.back}</p>}<button type="button" onClick={() => setAnswerRevealed((value) => !value)} className="mt-6 rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white">{answerRevealed ? 'Hide answer' : 'Reveal answer'}</button>{answerRevealed && <div className="mt-5 flex flex-wrap justify-center gap-2">{[1, 2, 3, 4, 5].map((rating) => <button type="button" key={rating} onClick={() => { setConfidence(activeCard.cardId, rating); setAnswerRevealed(false); setPracticeIndex((index) => (index + 1) % practiceCards.length); }} className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-blue-700">{rating}/5 confidence</button>)}</div>}</div> : <p className="text-sm text-slate-500">No flashcards available.</p>}
    </section>
  );

  const renderActive = { brief: renderBrief, role: renderRole, questions: renderQuestions, flashcards: renderFlashcards, schedule: renderSchedule, practice: renderPractice }[activeTab];

  return (
    <section className="mt-8">
      <div className="mb-4 flex gap-2 overflow-x-auto border-b border-slate-200 pb-2">
        {tabs.map((tab) => <button type="button" key={tab} onClick={() => setActiveTab(tab)} className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold ${activeTab === tab ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{tabLabels[tab]}</button>)}
      </div>
      {renderActive()}
    </section>
  );
}
