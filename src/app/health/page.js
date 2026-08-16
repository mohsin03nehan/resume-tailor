async function getTodo() {
  const res = await fetch("https://jsonplaceholder.typicode.com/todos/1", {
    cache: "force-cache",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch health data");
  }

  return res.json();
}

export default async function HealthPage() {
  const todo = await getTodo();

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold text-slate-900">Health check</h1>
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-lg font-medium text-slate-800">Todo title: {todo.title}</p>
        <p className="mt-2 text-slate-600">
          Completion status: {todo.completed ? "Completed" : "Not completed"}
        </p>
      </div>
    </section>
  );
}
