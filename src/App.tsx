/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { I18nProvider } from './i18n';
import { Whiteboard } from './components/Whiteboard';

export default function App() {
  return (
    <I18nProvider>
      <Whiteboard />
    </I18nProvider>
  );
}
