import type { Configuration } from "lint-staged";

const config: Configuration = {
  "**/*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "**/*.css": ["prettier --write"],
  "**/*.md": ["prettier --write --parser markdown"],
  "**/*.json": ["prettier --write"],
};

export default config;
