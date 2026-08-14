import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';

const CRITICAL_NEWS_TERMS = [
  'fda-approved', 'fda approval', 'phase 3', 'phase iii', 'clinical trial',
  'immunotherapy', 'overall survival', 'progression-free', 'biomarker',
  'egfr', 'kras', 'brca1', 'brca2', 'pd-l1', 'car-t', 'target therapy',
  'breakthrough', 'resistance', 'metastatic', 'combination therapy'
];

function HighlightNewsText({ text }) {
  if (!text) return null;

  const pattern = new RegExp(`\\b(${CRITICAL_NEWS_TERMS.join('|')})\\b`, 'gi');
  const parts = text.split(pattern);

  return (
    <span>
      {parts.map((part, index) => {
        const isCritical = CRITICAL_NEWS_TERMS.includes(part.toLowerCase());
        if (isCritical) {
          return (
            <mark
              key={index}
              className="inline-block font-semibold px-1 py-0.5 mx-0.5 rounded border text-[11px] leading-tight bg-rose-100 text-rose-900 border-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-900"
            >
              {part}
            </mark>
          );
        }
        return part;
      })}
    </span>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncingNews, setSyncingNews] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/doctors/dashboard').then((res) => {
        setStats(res.data.stats);
        setRecentAnalyses(res.data.recentAnalyses);
      }),
      api.get('/news').then((res) => {
        setNews(res.data.news || []);
      }).catch((err) => console.error('Error fetching news:', err)),
    ]).finally(() => setLoading(false));
  }, []);

  const handleSyncNews = async () => {
    setSyncingNews(true);
    try {
      const res = await api.post('/news/sync');
      if (res.data.news) setNews(res.data.news);
    } catch (err) {
      console.error('Failed to trigger sync:', err);
    } finally {
      setSyncingNews(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <p className="text-muted-foreground text-sm py-4">Loading dashboard...</p>
      </Layout>
    );
  }

  const cards = [
    { label: 'Total Patients', value: stats?.totalPatients ?? 0 },
    { label: 'Total Reports', value: stats?.totalReports ?? 0 },
    { label: 'Pending Analysis', value: stats?.reportsPendingAnalysis ?? 0 },
    { label: 'Awaiting Review', value: stats?.pendingReviewCount ?? 0 },
  ];

  return (
    <Layout>
      <h1 className="text-xl sm:text-2xl font-semibold text-foreground mb-4 sm:mb-6">Dashboard</h1>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {cards.map((card) => (
          <div key={card.label} className="bg-card border border-border rounded-xl p-3.5 sm:p-4 shadow-sm flex flex-col justify-between">
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.label}</p>
            <p className="text-xl sm:text-2xl font-bold text-primary mt-1 sm:mt-2">{card.value}</p>
          </div>
        ))}
      </div>

      {/* SECTION 1: Recent Analyses */}
      <section className="mb-8 sm:mb-10 space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-semibold text-foreground">Recent Analyses</h2>
          <span className="text-xs text-muted-foreground font-mono">Sorted by date</span>
        </div>

        {recentAnalyses.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <p className="text-muted-foreground text-sm">No recent genomic analyses found.</p>
          </div>
        ) : (
          <div className="space-y-2.5 sm:space-y-3">
            {recentAnalyses.map((analysis) => (
              <Link
                key={analysis._id}
                to={`/reports/${
                  typeof analysis.reportId === 'object' && analysis.reportId !== null
                    ? analysis.reportId._id
                    : analysis.reportId || analysis._id
                }`}
                className="block bg-card border border-border rounded-xl p-3.5 sm:p-4 hover:border-primary hover:shadow-sm transition-all"
              >                   
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground text-sm sm:text-base truncate">
                      {analysis.patientId?.name || 'Unknown patient'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      {analysis.geneAnalyses?.length || 0} gene finding(s) extracted
                    </p>
                  </div>
                  <span
                    className={`self-start sm:self-center text-xs px-2.5 py-1 rounded-md border font-medium shrink-0 capitalize ${
                      analysis.reviewStatus === 'approved'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
                        : analysis.reviewStatus === 'flagged'
                        ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
                        : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {analysis.reviewStatus ? analysis.reviewStatus.replace('_', ' ') : 'Pending'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 2: Medical News Section with Side-by-Side Controls */}
      <section className="space-y-4 pt-4 border-t border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              <span></span> Global Oncology & Genomic News
            </h2>
            <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900 shrink-0">
              Live Updates
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSyncNews}
              disabled={syncingNews}
              className="text-xs h-8 flex-1 sm:flex-none"
            >
              {syncingNews ? 'Syncing...' : 'Refresh Feed'}
            </Button>

            <Button size="sm" asChild className="text-xs h-8 flex-1 sm:flex-none">
              <Link to="/news">
                View All News ↗
              </Link>
            </Button>
          </div>
        </div>

        {news.length === 0 ? (
          <p className="text-muted-foreground text-xs sm:text-sm">No oncology updates available.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {news.slice(0, 6).map((item) => (
              <article
                key={item._id || item.externalId}
                className="bg-card border border-border rounded-xl p-3.5 sm:p-4 flex flex-col justify-between hover:border-slate-400 transition-colors shadow-sm"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900 shrink-0">
                      {item.tag || 'Medical Update'}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono shrink-0">{item.publishedAt}</span>
                  </div>

                  <h3 className="text-xs sm:text-sm font-semibold text-foreground leading-snug line-clamp-2">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                    <HighlightNewsText text={item.summary} />
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground gap-2">
                  <span className="font-medium truncate max-w-[50%] sm:max-w-[140px]">{item.source}</span>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline font-medium flex items-center gap-0.5 shrink-0"
                  >
                    Read article ↗
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}