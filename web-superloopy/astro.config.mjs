import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://superloopy.dev",
  output: "static",
  image: {
    responsiveStyles: true,
  },
});
