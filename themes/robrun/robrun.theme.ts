// The robrun theme. `astryx experimental theme editor` wrote this file once and never changes it again.
// The checked settings live in robrun.settings.json and the generated robrun.settings.ts;
// change them with `astryx experimental theme editor set robrun ...`. Add your own changes below: they win over the settings.
import {defineTheme} from '@astryxdesign/core/theme';
import {robrunSettings} from './robrun.settings';

export const robrunTheme = defineTheme({
  extends: robrunSettings,
  name: 'robrun',
});
