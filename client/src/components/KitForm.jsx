import { useState } from 'react';

const initialState = {
  name: '',
  role: 'backend',
  jobDescription: '',
  companyUrl: '',
  daysRequested: 7,
  minutesPerSession: 45,
};

export default function KitForm({ onSubmit, loading }) {
  const [form, setForm] = useState(initialState);
  const [fileName, setFileName] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    try {
      const json = JSON.parse(text);
      const firstCase = Array.isArray(json) ? json[0] : json;
      setFileName(file.name);
      setForm((current) => ({
        ...current,
        role: firstCase.role || current.role,
        jobDescription: firstCase.jobDescription || current.jobDescription,
        companyUrl: firstCase.companyUrl || current.companyUrl,
        daysRequested: firstCase.daysRequested || current.daysRequested,
        minutesPerSession: firstCase.minutesPerSession || current.minutesPerSession,
      }));
    } catch {
      alert('Batch file must contain valid JSON.');
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Kit name</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
            placeholder="Senior backend prep"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
          >
            <option value="backend">Backend</option>
            <option value="frontend">Frontend</option>
            <option value="data">Data</option>
            <option value="product">Product</option>
            <option value="platform">Platform</option>
            <option value="general">General</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Job description</label>
        <textarea
          name="jobDescription"
          value={form.jobDescription}
          onChange={handleChange}
          rows={7}
          className="w-full rounded-xl border border-slate-300 px-3 py-2"
          placeholder="Paste the job posting or role brief here..."
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Company URL</label>
        <input
          name="companyUrl"
          value={form.companyUrl}
          onChange={handleChange}
          className="w-full rounded-xl border border-slate-300 px-3 py-2"
          placeholder="https://company.com"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Days requested</label>
          <input
            type="number"
            min="1"
            max="30"
            name="daysRequested"
            value={form.daysRequested}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Minutes per session</label>
          <input
            type="number"
            min="15"
            max="180"
            name="minutesPerSession"
            value={form.minutesPerSession}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-slate-700">
          <span>Batch JSON upload</span>
          <input type="file" accept="application/json" className="hidden" onChange={handleFileUpload} />
          <span className="rounded-lg bg-blue-600 px-3 py-1.5 font-medium text-white">Choose file</span>
        </label>
        {fileName && <p className="mt-2 text-sm text-slate-600">Loaded: {fileName}</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-slate-900 px-4 py-2.5 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {loading ? 'Generating kit...' : 'Generate kit'}
      </button>
    </form>
  );
}
