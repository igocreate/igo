
const fs        = require('fs');
const path      = require('path');

const config    = require('../src/config');
const IgoDust   = require('@igojs/dust');

const green  = (s) => `\x1b[32m${s}\x1b[0m`;
const dim    = (s) => `\x1b[2m${s}\x1b[0m`;

// Recursively find files with given extensions in a directory
const findFiles = (dir, extensions) => {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(fullPath, extensions));
    } else if (!entry.name.startsWith('_') && extensions.some(ext => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
};

// Initialize i18next for standalone usage
const initI18n = async () => {
  const i18nFsBackend  = require('i18next-fs-backend');
  const i18next        = require('i18next');

  await i18next
    .use(i18nFsBackend)
    .init({ showSupportNotice: false, ...config.i18n });

  return i18next;
};

// Generate all static pages into outputDir
const generate = async ({ root, outputDir, mdLayout, baseContext, staticConfig, uneval }) => {
  const viewsRoot = path.resolve('views', root);
  const files     = findFiles(viewsRoot, ['.dust', '.md']);

  let count = 0;

  // Process each file
  for (const filePath of files) {
    const relPath = path.relative(viewsRoot, filePath);
    const ext     = path.extname(filePath);

    // Compute output path: about.dust → about/index.html, index.dust → index.html
    const baseName = relPath.replace(/\.(dust|md)$/, '');
    const htmlRelPath = path.basename(baseName) === 'index'
      ? baseName + '.html'
      : baseName + '/index.html';
    const outputPath  = path.join(outputDir, htmlRelPath);

    let html;

    if (ext === '.dust') {
      // Render Dust template
      const templatePath = root + '/' + relPath;
      html = await IgoDust.renderFile(templatePath, { ...baseContext });
    } else if (ext === '.md') {
      // Parse frontmatter + markdown
      const matter  = require('gray-matter');
      const { marked } = require('marked');

      const raw       = fs.readFileSync(filePath, 'utf8');
      const parsed    = matter(raw);
      const content   = marked(parsed.content);
      const layout    = parsed.data.layout || mdLayout;

      // Render layout with markdown content
      html = await IgoDust.renderFile(layout + '.dust', {
        ...baseContext,
        ...parsed.data,
        content,
      });
    }

    // Write output
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, html);
    console.log(dim(`  ${htmlRelPath}`));
    count++;
  }

  // Dynamic pages
  let dynamicPages;
  if (staticConfig.pages) {
    dynamicPages = await staticConfig.pages();

    for (const page of dynamicPages) {
      const context = { ...baseContext, ...page.data };

      // SSR for components
      if (page.components && page.components.length > 0) {
        for (const ComponentClass of page.components) {
          if (ComponentClass?.ssr) {
            const derived = ComponentClass.ssr(page.data);
            Object.assign(context, derived);
          }
        }

        // Serialize component props for client hydration
        if (uneval) {
          try {
            const ComponentServer = require('@igojs/component/server');
            const serializedProps = ComponentServer.serialize(page.data);
            context.__component_props = uneval(serializedProps);
          } catch (err) {
            context.__component_props = '{}';
          }
        }
      }

      const html = await IgoDust.renderFile(page.template + '.dust', context);

      const outputPath = path.join(outputDir, page.output);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, html);
      console.log(dim(`  ${page.output}`));
      count++;
    }
  }

  // Generate static component template JSON files
  if (dynamicPages) {
    const templateNames = new Set();
    for (const page of dynamicPages) {
      if (page.components) {
        for (const ComponentClass of page.components) {
          const instance = new ComponentClass(null, {});
          if (instance.template) {
            templateNames.add(instance.template);
          }
        }
      }
    }
    if (templateNames.size > 0) {
      for (const template of templateNames) {
        const source = await IgoDust.getSource(`${template}.dust`);
        const templateOutputPath = path.join(outputDir, '__component', 'templates', `${template}.json`);
        fs.mkdirSync(path.dirname(templateOutputPath), { recursive: true });
        fs.writeFileSync(templateOutputPath, JSON.stringify({ file: template, source }));
        console.log(dim(`  __component/templates/${template}.json`));
      }
      console.log(green(`✓ ${templateNames.size} component templates generated`));
    }
  }

  console.log(green(`\n✓ ${count} pages generated`));
};

// igo ssg
module.exports = async (argv) => {

  // Initialize config
  config.init();

  const serveMode = argv && argv.serve;

  // Initialize Dust standalone (views + helpers)
  IgoDust.configure({
    views: config.projectRoot + '/views',
    cache: !serveMode,
  });

  // load custom helpers
  try {
    const helpers = require(config.projectRoot + '/app/helpers');
    helpers.init(IgoDust);
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND') {
      throw err;
    }
  }

  // Initialize i18next
  const i18next = await initI18n();

  // Load devalue for component serialization
  let uneval;
  try {
    const devalue = await import('devalue');
    uneval = devalue.uneval;
  } catch (err) {
    // devalue not available, component SSR won't work
  }

  // Load static config
  let staticConfig;
  try {
    staticConfig = require(config.projectRoot + '/app/static');
  } catch (err) {
    console.error('Missing app/static.js configuration file.');
    process.exit(1);
  }

  const root      = staticConfig.root || 'static';
  const outputDir = path.resolve(staticConfig.output || 'public');
  const mdLayout  = staticConfig.md_layout || (root + '/_md_layout');

  // Build base context
  const buildContext = async () => {
    if (serveMode) {
      // Clear require cache for app/ files so changes are picked up
      Object.keys(require.cache).forEach((key) => {
        if (key.startsWith(config.projectRoot + '/app/')) {
          delete require.cache[key];
        }
      });
    }
    const globals = staticConfig.globals ? await staticConfig.globals() : {};
    const lang = config.i18n?.fallbackLng || 'en';
    return {
      env: config.env,
      lang,
      t: (params) => i18next.t(params.key, { ...params, lng: lang }),
      ...globals,
    };
  };

  // Run generation
  const run = async () => {
    const baseContext = await buildContext();
    await generate({ root, outputDir, mdLayout, baseContext, staticConfig, uneval });
  };

  await run();

  if (!serveMode) {
    process.exit(0);
  }

  // Serve mode
  const devServer = require('./ssg-dev-server');
  devServer(outputDir, {
    port:      argv.port || 3000,
    watchDirs: ['views', 'app', 'locales'].map(d => path.resolve(d)),
    onBeforeReload: run,
  });
};
