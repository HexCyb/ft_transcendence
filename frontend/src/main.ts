import { route, startRouter } from './router.js';
import { aiView, homeView, notFoundView, playView, settingsView } from './views/pages.js';
import { tournamentView } from './views/tournament.js';

route('/', homeView);
route('/play', playView);
route('/ai', aiView);
route('/tournament', tournamentView);
route('/settings', settingsView);
route('*', notFoundView);

const app = document.getElementById('app');
if (app) startRouter(app);
