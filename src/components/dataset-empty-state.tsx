export function DatasetEmptyState({ name }: { name: string }) {
  return (
    <section className="dataset-page" aria-labelledby="dataset-title">
      <h1 id="dataset-title">{name}</h1>
      <div className="dataset-empty-state">
        <svg width="230" height="230" viewBox="0 0 280 280" className="dataset-empty-illustration" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round">
          <ellipse cx="144" cy="248" rx="92" ry="13" fill="#ffffff03" stroke="none" />
          <path d="M94 65 157 29 224 67 162 105Z" fill="#25252b" />
          <path d="M162 105 224 67V219L162 255Z" fill="#18181e" />
          <path d="M94 65 162 105V255L94 215Z" fill="#202026" />
          <path d="m100 78 55 32v58l-55-32Z" fill="#24242c" />
          <path d="m120 101 16 9v10l-16-9Z" fill="#15151b" />
          <path d="m115 123 4 6 17 10 5-1" />
          <path d="m99 147 57 33v63l-57-33Z" fill="#111116" />
          <path d="m99 153-44 30 56 33 45-29Z" fill="#19191f" />
          <path d="m55 183 56 33v47l-56-33Z" fill="#28282f" />
          <path d="m111 216 45-29v46l-45 30Z" fill="#17171d" />
          <path d="m63 185 42 25 39-23-42-24Z" fill="#101015" />
          <path d="m72 205 16 9v10l-16-9Z" fill="#141419" />
          <path d="m69 227 4 6 17 10 4-1" />
          <path d="m166 243 7 4 47-27v-7M95 214v8l9 5" />
        </svg>
        <h2>Belum ada data</h2>
        <p>Data {name} akan muncul di sini setelah Anda<br className="hidden sm:block" /> menambahkan atau mengimpor record pertama.</p>
      </div>
    </section>
  );
}
