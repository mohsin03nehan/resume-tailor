import Link from "next/link";
import ShaderHero from "./components/ShaderHero";

export default function HomePage() {
  return (
    <section className="relative isolate flex min-h-[32rem] items-center overflow-hidden rounded-3xl bg-[#0B0A0F] px-6 py-16 shadow-xl sm:px-12">
      <ShaderHero />
      <div className="absolute inset-0 z-10 bg-slate-950/55" aria-hidden="true" />
      <div className="relative z-20 space-y-6 text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Resume Tailor</h1>
        <p className="max-w-2xl text-lg text-slate-100">
          Create tailored resumes and cover letters from your experience and the job description you want to target.
        </p>
        <Link
          href="/tailor"
          className="inline-block rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
        >
          Start tailoring
        </Link>
      </div>
    </section>
  );
}
