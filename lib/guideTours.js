/**
 * Configurazione tour contestuali (Mostrami come)
 * Step per route: element = [data-tour-id="..."], popover con title/description da i18n.
 */

const TOUR_IDS = {
  DASHBOARD_INTRO: 'tour-dashboard-intro',
  DASHBOARD_AI: 'tour-dashboard-ai',
  DASHBOARD_TASK: 'tour-dashboard-task',
  DASHBOARD_SQUAD: 'tour-dashboard-squad',
  DASHBOARD_NAV: 'tour-dashboard-nav',
  DASHBOARD_ADD_MATCH: 'tour-dashboard-add-match',
  DASHBOARD_MATCHES: 'tour-dashboard-matches',
  DASHBOARD_INSIGHTS: 'tour-dashboard-insights',
}

/**
 * Ritorna gli step del tour per la route corrente.
 * @param {string} pathname - es. '/', '/gestione-formazione'
 * @param {(k: string) => string} t - useTranslation().t
 * @returns {{ element: string, popover: { title: string, description: string } }[]}
 */
export function getTourSteps(pathname, t) {
  const base = pathname?.replace(/\/$/, '') || '/'
  if (base === '/') {
    return getDashboardSteps(t)
  }
  return []
}

function getDashboardSteps(t) {
  return [
    {
      element: `[data-tour-id="${TOUR_IDS.DASHBOARD_INTRO}"]`,
      popover: {
        title: t('tourDashboardIntroTitle'),
        description: t('tourDashboardIntroDesc'),
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: `[data-tour-id="${TOUR_IDS.DASHBOARD_AI}"]`,
      popover: {
        title: t('tourDashboardAiTitle'),
        description: t('tourDashboardAiDesc'),
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: `[data-tour-id="${TOUR_IDS.DASHBOARD_TASK}"]`,
      popover: {
        title: t('tourDashboardTaskTitle'),
        description: t('tourDashboardTaskDesc'),
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: `[data-tour-id="${TOUR_IDS.DASHBOARD_SQUAD}"]`,
      popover: {
        title: t('tourDashboardSquadTitle'),
        description: t('tourDashboardSquadDesc'),
        side: 'left',
        align: 'center',
      },
    },
    {
      element: `[data-tour-id="${TOUR_IDS.DASHBOARD_NAV}"]`,
      popover: {
        title: t('tourDashboardNavTitle'),
        description: t('tourDashboardNavDesc'),
        side: 'left',
        align: 'center',
      },
    },
    {
      element: `[data-tour-id="${TOUR_IDS.DASHBOARD_ADD_MATCH}"]`,
      popover: {
        title: t('tourDashboardAddMatchTitle'),
        description: t('tourDashboardAddMatchDesc'),
        side: 'left',
        align: 'center',
      },
    },
    {
      element: `[data-tour-id="${TOUR_IDS.DASHBOARD_MATCHES}"]`,
      popover: {
        title: t('tourDashboardMatchesTitle'),
        description: t('tourDashboardMatchesDesc'),
        side: 'top',
        align: 'center',
      },
    },
    {
      element: `[data-tour-id="${TOUR_IDS.DASHBOARD_INSIGHTS}"]`,
      popover: {
        title: t('tourDashboardInsightsTitle'),
        description: t('tourDashboardInsightsDesc'),
        side: 'right',
        align: 'center',
      },
    },
  ]
}

export { TOUR_IDS }
