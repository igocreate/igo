import { defineConfig } from 'vitepress';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname    = path.dirname(fileURLToPath(import.meta.url));
const dustGrammar  = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'grammars/igo-dust.tmLanguage.json'), 'utf8')
);

export default defineConfig({
  title:        'Igo.js',
  description:  'Full-stack Node.js web framework — ORM, templates, reactive components',
  base:         '/igo/',
  cleanUrls:    true,
  lastUpdated:  true,

  head: [
    ['meta', { name: 'theme-color', content: '#5f67ee' }],
  ],

  markdown: {
    languages: [
      // Igo Dust syntax highlighting (grammar from igocreate/igo-dust-language-support)
      {
        ...dustGrammar,
        name: 'dust',
      },
    ],
  },

  themeConfig: {
    nav: [
      { text: 'Guide',     link: '/guide/development',         activeMatch: '/guide/' },
      { text: 'Server',    link: '/server/getting-started',    activeMatch: '/server/' },
      { text: 'DB',        link: '/db/getting-started',        activeMatch: '/db/' },
      { text: 'Dust',      link: '/dust/getting-started',      activeMatch: '/dust/' },
      { text: 'Component', link: '/component/getting-started', activeMatch: '/component/' },
      {
        text: 'v6',
        items: [
          { text: 'Changelog', link: 'https://github.com/igocreate/igo/blob/master/CHANGELOG.md' },
          { text: 'Releases',  link: 'https://github.com/igocreate/igo/releases' },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Development & CLI', link: '/guide/development' },
            { text: 'Production',        link: '/guide/production' },
            { text: 'Testing',           link: '/guide/tests' },
          ],
        },
      ],

      '/server/': [
        {
          text: '@igojs/server',
          items: [
            { text: 'Getting started',      link: '/server/getting-started' },
            { text: 'Routes & controllers', link: '/server/routes' },
            { text: 'Views',                link: '/server/views' },
            { text: 'Forms',                link: '/server/forms' },
            { text: 'Cache (Redis)',        link: '/server/cache' },
            { text: 'Mailer',               link: '/server/mailer' },
            { text: 'Flash scope',          link: '/server/flash' },
            { text: 'i18n',                 link: '/server/i18n' },
            { text: 'Error handling',       link: '/server/errors' },
          ],
        },
      ],

      '/db/': [
        {
          text: '@igojs/db',
          items: [
            { text: 'Getting started',       link: '/db/getting-started' },
            { text: 'Models',                link: '/db/models' },
            { text: 'Query builder',         link: '/db/queries' },
            { text: 'Optimized pagination',  link: '/db/optimized-pagination' },
            { text: 'Configuration',         link: '/db/config' },
            { text: 'Migrations',            link: '/db/migrations' },
            { text: 'Seeds',                 link: '/db/seeds' },
            { text: 'Query caching',         link: '/db/cache' },
          ],
        },
      ],

      '/dust/': [
        {
          text: '@igojs/dust',
          items: [
            { text: 'Getting started',     link: '/dust/getting-started' },
            { text: 'Basics',              link: '/dust/basics' },
            { text: 'Logic',               link: '/dust/logic' },
            { text: 'Loops',               link: '/dust/loops' },
            { text: 'Helpers',             link: '/dust/helpers' },
            { text: 'Filters',             link: '/dust/filters' },
            { text: 'Partials & layouts',  link: '/dust/partials' },
            { text: 'API reference',       link: '/dust/api' },
          ],
        },
      ],

      '/component/': [
        {
          text: '@igojs/component',
          items: [
            { text: 'Getting started', link: '/component/getting-started' },
            { text: 'Components',      link: '/component/components' },
            { text: 'Reactivity',      link: '/component/reactivity' },
            { text: 'Events & forms',  link: '/component/events-forms' },
            { text: 'SSR',             link: '/component/ssr' },
            { text: 'Translations',    link: '/component/translations' },
            { text: 'Internals',       link: '/component/internals' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/igocreate/igo' },
    ],

    editLink: {
      pattern: 'https://github.com/igocreate/igo/edit/master/docs/:path',
      text:    'Edit this page on GitHub',
    },

    search: {
      provider: 'local',
    },

    footer: {
      message:   'Released under the ISC license.',
      copyright: 'Copyright © igocreate',
    },
  },
});
