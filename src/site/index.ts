import * as shell from 'shelljs';
import * as path from 'path';
import * as fs from 'fs';
import Liquid from 'liquidjs';

main()
  .then(() => console.log('DONE'))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

async function main() {
  shell.exec('yarn typedoc --options typedoc.js src');
  shell.exec(
    'yarn node-sass site/typedoc/typedoc_theme/assets/css/main.sass site/typedoc/typedoc_theme/assets/css/main.css',
  );
  shell.cp('-R', 'docs', 'site/landing/typedoc');
  await generateTypeDocTemplates();
  shell.exec('bundle exec jekyll build', { cwd: 'site/landing' });
}

async function generateTypeDocTemplates() {
  const engine = new Liquid({
    root: path.resolve(__dirname, '../../site'),
    extname: '.html',
  });

  const navbar = await engine.renderFile('common/partials/navbar.html', {
    page: { url: 'typedoc' },
    github_reverse: true,
  });
  fs.writeFileSync('site/typedoc/typedoc_theme/partials/header.hbs', navbar);
}
