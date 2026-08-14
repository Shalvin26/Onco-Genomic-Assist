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

const ITEMS_PER_PAGE = 6;

export default function MedicalNewsPage() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');

  // Server-side Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Fetch news whenever page, tag, or search changes
  useEffect(() => {
    fetchNews();
  }, [currentPage, selectedTag, searchTerm]);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const res = await api.get('/news', {
        params: {
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          tag: selectedTag !== 'All' ? selectedTag : undefined,
          search: searchTerm || undefined,
        },
      });

      setNews(res.data.news || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalItems(res.data.totalItems || 0);
    } catch (err) {
      console.error('Failed to load news:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post('/news/sync');
      setTimeout(() => {
        fetchNews();
        setSyncing(false);
      }, 1500);
    } catch (err) {
      console.error('Failed to sync news:', err);
      setSyncing(false);
    }
  };

  const handleTagChange = (tag) => {
    setSelectedTag(tag);
    setCurrentPage(1); // Reset to page 1 on filter change
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to page 1 on search change
  };

  return (
    <Layout>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <Link to="/dashboard" className="text-xs text-primary hover:underline font-mono mb-1 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2">
            <span></span> Oncology & Genomic News Directory
          </h1>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleSync}
          disabled={syncing}
          className="text-xs h-9 w-full sm:w-auto shrink-0"
        >
          {syncing ? 'Syncing...' : 'Sync Latest PubMed & NIH'}
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mb-6 bg-card border border-border rounded-xl p-3 shadow-sm">
        <input
          type="text"
          placeholder="Search by keyword (e.g., immunotherapy, cancer)..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="w-full lg:w-80 px-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
        />

        {/* Tag Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {['All', 'Research', 'Clinical Trial'].map((tag) => (
            <button
              key={tag}
              onClick={() => handleTagChange(tag)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors shrink-0 ${
                selectedTag === tag
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-slate-400'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Grid */}
      {loading ? (
        <div className="py-12 text-center">
          <p className="text-xs text-muted-foreground animate-pulse">Loading articles from server...</p>
        </div>
      ) : news.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <p className="text-muted-foreground text-sm">
            No articles match your search criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
          {news.map((item) => (
            <article
              key={item._id || item.externalId}
              className="bg-card border border-border rounded-xl p-4 sm:p-5 flex flex-col justify-between hover:border-slate-400 transition-colors shadow-sm"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900 shrink-0">
                    {item.tag || 'Medical Update'}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono shrink-0">{item.publishedAt}</span>
                </div>

                <h2 className="text-sm sm:text-base font-semibold text-foreground leading-snug">
                  {item.title}
                </h2>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <HighlightNewsText text={item.summary} />
                </p>
              </div>

              <div className="pt-3 mt-4 border-t border-border/50 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span className="font-medium truncate max-w-[50%] sm:max-w-40">{item.source}</span>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline font-medium flex items-center gap-0.5 shrink-0"
                >
                  Read full paper ↗
                </a>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Server-Side Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border border-border rounded-xl p-3 shadow-sm">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            Showing <span className="font-semibold text-foreground">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
            <span className="font-semibold text-foreground">
              {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)}
            </span>{' '}
            of <span className="font-semibold text-foreground">{totalItems}</span> articles
          </p>

          <div className="flex items-center justify-center gap-2 w-full sm:w-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1 || loading}
              className="text-xs h-8 px-3 flex-1 sm:flex-none"
            >
              Previous
            </Button>

            <span className="text-xs font-medium px-2 shrink-0">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages || loading}
              className="text-xs h-8 px-3 flex-1 sm:flex-none"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </Layout>
  );
}