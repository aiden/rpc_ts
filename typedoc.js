/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

module.exports = {
  out: 'site/landing/typedoc',
  exclude: '**/__tests__/**,**/examples/**,**/private/**,**/utils/**',
  mode: 'modules',
  excludeExternals: true,
  excludeNotExported: true,
  excludePrivate: true,
  listInvalidSymbolLinks: true,
  theme: 'site/typedoc/typedoc_theme',
};
