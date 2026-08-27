/**
 * Architecture rules, enforced rather than documented.
 *
 * The shape: features own their model / hooks / components and expose one
 * barrel. Shared code knows nothing about features. Pure logic knows nothing
 * about React. Every one of these was written after a real violation — the
 * cycle between the tutor's panel and the shared fixtures was found by this
 * config, not by review.
 */
const FEATURE_INTERNALS = "^src/features/([^/]+)/(model|hooks|components|fixtures|types)";

module.exports = {
  forbidden: [
    {
      name: "no-circular",
      comment: "A cycle means neither module can be understood, moved or tested alone.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "shared-must-not-know-features",
      comment:
        "src/lib, src/components/ui and src/hooks are shared. If they reach into a " +
        "feature, that feature can no longer import them without a cycle.",
      severity: "error",
      from: { path: "^src/(lib|hooks|components/ui)/" },
      to: { path: "^src/features/" },
    },
    {
      name: "features-talk-through-barrels",
      comment:
        "Cross-feature imports go through the barrel. Reaching into another " +
        "feature's internals makes its layout impossible to change.",
      severity: "error",
      from: { path: "^src/features/([^/]+)/" },
      to: {
        path: FEATURE_INTERNALS,
        pathNot: ["^src/features/$1/"],
      },
    },
    {
      name: "app-talks-through-barrels",
      comment: "Routes compose features; they do not reach past the barrel.",
      severity: "error",
      from: { path: "^src/app/" },
      to: { path: FEATURE_INTERNALS },
    },
    {
      name: "model-stays-pure",
      comment:
        "model/ is the layer that can be proved without a DOM. Importing React, " +
        "a hook or a component is what makes logic untestable in the first place.",
      severity: "error",
      from: { path: "^src/features/[^/]+/model/" },
      to: {
        path: ["^src/features/[^/]+/(hooks|components)/", "^src/components/", "^src/hooks/"],
      },
    },
    {
      name: "model-imports-no-react",
      severity: "error",
      from: { path: "^src/features/[^/]+/model/", pathNot: "\\.test\\.ts$" },
      // Resolved npm paths look like `node_modules/react/index.js`; matching on
      // the bare package name silently matches nothing.
      to: { path: "^node_modules/(react|react-dom|next)(/|$)" },
    },
    {
      name: "hooks-render-nothing",
      comment: "A hook returns data and callbacks; JSX belongs to components.",
      severity: "error",
      from: { path: "^src/features/[^/]+/hooks/", pathNot: "\\.test\\.tsx?$" },
      to: { path: "^src/features/[^/]+/components/" },
    },
    {
      name: "no-orphans",
      severity: "warn",
      from: {
        orphan: true,
        pathNot: ["\\.d\\.ts$", "(next|vitest|postcss)\\.config", "^src/app/"],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
    exclude: { path: "\\.test\\.tsx?$" },
  },
};
