import Link from "next/link";

export default function HomePage() {
  return (
    <section className="space-y-6">
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">Resume Tailor</h1>
      <p className="max-w-2xl text-lg text-slate-600">
        Create tailored resumes and cover letters from your experience and the job description you want to target.
      </p>
      <Link
        href="/tailor"
        className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
      >
        Start tailoring
      </Link>
    </section>
  );
}
