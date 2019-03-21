/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const path = require('path');

module.exports = {
  out: 'typedoc',
  exclude: '**/__tests__/**,**/examples/**,**/private/**,**/utils/**',
  mode: 'modules',
  excludeExternals: true,
  excludeNotExported: true,
  excludePrivate: true,
  listInvalidSymbolLinks: true,
  hideGenerator: true,
  readme: path.resolve('docs/primer.md'),
  theme: path.resolve(
    path.dirname(require.resolve('aiden-doc' + '/package.json')),
    'typedoc_theme',
  ),
};
