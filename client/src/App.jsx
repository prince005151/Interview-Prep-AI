import { useMemo, useState } from 'react';
import AuthForm from './components/AuthForm';
import KitForm from './components/KitForm';
import KitWorkbench from './components/KitWorkbench';
import { generateKit, loginUser, registerUser } from './services/api';

const getStoredUser = () => {
  try {
    if (!localStorage.getItem('ai-prep-token')) return null;
    const user = localStorage.getItem('ai-prep-user');
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

export default function App() {
  const [authMode, setAuthMode] = useState('login');
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [kitLoading, setKitLoading] = useState(false);
  const [kitError, setKitError] = useState('');
  const [kitResult, setKitResult] = useState(null);

  const summary = useMemo(() => {
    if (!kitResult) return null;

    return {
      requirements: kitResult.kit?.requirements?.length || 0,
      questions: kitResult.kit?.questions?.length || 0,
      scheduleDays: kitResult.kit?.schedule?.length || 0,
    };
  }, [kitResult]);

  const handleAuthSubmit = async (payload) => {
    setAuthError('');
    setAuthLoading(true);

    try {
      const action = authMode === 'register' ? registerUser : loginUser;
      const result = await action(payload);

      localStorage.setItem('ai-prep-token', result.token);
      localStorage.setItem('ai-prep-user', JSON.stringify(result.user));
      setCurrentUser(result.user);
      setKitResult(null);
    } catch (error) {
      setAuthError(error.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGenerateSubmit = async (payload) => {
    setKitError('');
    setKitLoading(true);

    try {
      const result = await generateKit({
        ...payload,
        user: currentUser?.id,
        category: payload.role,
      });

      setKitResult(result);
    } catch (error) {
      setKitError(error.message || 'Unable to generate the interview kit.');
    } finally {
      setKitLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ai-prep-token');
    localStorage.removeItem('ai-prep-user');
    setCurrentUser(null);
    setKitResult(null);
    setAuthMode('login');
  };

  if (!currentUser) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-16 text-slate-900">
        <div className="mx-auto max-w-6xl grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-soft">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
              AI Interview Prep Kit Generator
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-6xl">
              Build smarter interview prep kits from real company signals.
            </h1>

            <p className="mt-6 max-w-2xl text-lg text-slate-600">
              The platform gathers company research, identifies likely interview themes, and packages them
              into focused prep materials for each role and target company.
            </p>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {[
                ['Company research', 'Crawls site structure and care pages while respecting robots rules.'],
                ['Role matching', 'Maps standout requirements into must-have and nice-to-have categories.'],
                ['Prep outputs', 'Generates questions, flashcards, and study schedules automatically.'],
              ].map(([title, text]) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                  <p className="mt-3 text-sm text-slate-600">{text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
            <div className="mb-6 flex items-center gap-2 rounded-full bg-slate-100 p-1">
              {['login', 'register'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setAuthMode(mode)}
                  className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition ${
                    authMode === mode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  {mode === 'login' ? 'Login' : 'Register'}
                </button>
              ))}
            </div>

            <h2 className="mb-4 text-2xl font-bold text-slate-900">
              {authMode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>

            {authError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {authError}
              </div>
            )}

            <AuthForm mode={authMode} onSubmit={handleAuthSubmit} loading={authLoading} />
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 md:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-blue-600">Workspace</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Interview prep dashboard</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
              Signed in as {currentUser?.name || currentUser?.email}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Log out
            </button>
          </div>
        </header>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          {[
            ['Generated kits', `${summary?.requirements || 0}`],
            ['Questions', `${summary?.questions || 0}`],
            ['Study days', `${summary?.scheduleDays || 0}`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <KitForm onSubmit={handleGenerateSubmit} loading={kitLoading} />

          <aside className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
            <h2 className="text-xl font-bold text-slate-900">Latest output</h2>

            {kitError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {kitError}
              </div>
            )}

            {!kitResult && !kitError && (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                Generate a kit to see requirements, questions, and a study schedule appear here.
              </div>
            )}

            {kitResult && (
              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-sm text-slate-500">Kit name</p>
                  <p className="text-xl font-semibold text-slate-900">{kitResult.kit?.name}</p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Role</p>
                  <p className="text-base font-medium text-slate-800">{kitResult.kit?.role}</p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Requirements</p>
                  <ul className="mt-2 space-y-2 text-sm text-slate-700">
                    {kitResult.kit?.requirements?.slice(0, 4).map((item) => (
                      <li key={item.requirementId} className="rounded-xl bg-slate-50 px-3 py-2">
                        {item.label}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Study plan</p>
                  <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {kitResult.kit?.schedule?.length || 0} day plan queued for review.
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>

        {kitResult?.kit && (
          <KitWorkbench
            kit={kitResult.kit}
            onChange={(updatedKit) => setKitResult((current) => ({ ...current, kit: updatedKit }))}
          />
        )}
      </div>
    </main>
  );
}
