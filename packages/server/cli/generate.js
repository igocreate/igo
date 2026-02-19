
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

// igo generate
module.exports = async () => {

  // Initialize config
  config.init();

  // Initialize Dust standalone (views + helpers)
  IgoDust.configure({
    views: config.projectRoot + '/views',
    cache: true,
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

  // Load devalue for Signal serialization
  let uneval;
  try {
    const devalue = await import('devalue');
    uneval = devalue.uneval;
  } catch (err) {
    // devalue not available, Signal SSR won't work
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

  // Load globals
  const globals = staticConfig.globals ? await staticConfig.globals() : {};

  // Base context for all templates
  const lang = config.i18n?.fallbackLng || 'en';
  const baseContext = {
    env: config.env,
    lang,
    t: (params) => i18next.t(params.key, { ...params, lng: lang }),
    ...globals,
  };

  // Scan views/<root>/ for .dust and .md files
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
  if (staticConfig.pages) {
    const dynamicPages = await staticConfig.pages();

    for (const page of dynamicPages) {
      const context = { ...baseContext, ...page.data };

      // SSR for Signal components
      if (page.components && page.components.length > 0) {
        for (const ComponentClass of page.components) {
          if (ComponentClass?.ssr) {
            const derived = ComponentClass.ssr(page.data);
            Object.assign(context, derived);
          }
        }

        // Serialize signal_props for client hydration
        if (uneval) {
          try {
            const SignalServer = require('@igojs/signal/server');
            const serializedProps = SignalServer.serialize(page.data);
            context.__signal_props = uneval(serializedProps);
          } catch (err) {
            context.__signal_props = '{}';
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

  console.log(green(`\n✓ ${count} pages generated`));
  process.exit(0);
};
