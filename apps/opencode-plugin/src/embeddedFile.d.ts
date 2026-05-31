// Bun's `import x from "./file" with { type: "file" }` returns a virtual
// `$bunfs/…` path at runtime (a real disk path in dev). TypeScript needs an
// explicit module declaration to type these imports; bun-types only covers
// the `import.meta` side. Default-export-only is unavoidable here — the
// import syntax requires a default binding.

/* eslint-disable import-x/no-default-export */
declare module "*.html.gz" {
  const path: string;
  export default path;
}
/* eslint-enable import-x/no-default-export */
