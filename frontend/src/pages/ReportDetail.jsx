import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import api from '@/lib/api';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';

// Priority order for sorting clinical significance
const SIGNIFICANCE_PRIORITY = {
  pathogenic: 1,
  'likely pathogenic': 2,
  uncertain_significance: 3,
  vus: 3,
  'likely benign': 4,
  benign: 5,
};

// Ergonomic color mappings for clinical significance badges
const SIGNIFICANCE_STYLES = {
  pathogenic: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50',
  'likely pathogenic': 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/50',
  uncertain_significance: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50',
  vus: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50',
  'likely benign': 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50',
  benign: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50',
  default: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
};

function getBadgeStyle(significance) {
  if (!significance) return SIGNIFICANCE_STYLES.default;
  const key = significance.toLowerCase().trim();
  return SIGNIFICANCE_STYLES[key] || SIGNIFICANCE_STYLES.default;
}

// Complete evidence status badge mapping
function getStatusBadgeStyle(statusKey) {
  switch (statusKey) {
    case 'INSUFFICIENT_VARIANT_INFO':
      return 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800';
    case 'CONFLICTING':
      return 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
    case 'SOMATIC_EVIDENCE':
      return 'bg-purple-50 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-800';
    case 'CONSISTENT_PATHOGENIC':
      return 'bg-red-50 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800';
    case 'VUS':
      return 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
    case 'BENIGN':
      return 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
    case 'CONSISTENT_EVIDENCE':
      return 'bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }
}

/**
 * Resolves a reliable web URL for ClinVar variations
 */
function resolveClinVarUrl(item) {
  if (item?.url && item.url.startsWith('http')) return item.url;

  const varId = item?.variationId || item?.clinvarId;
  if (varId && varId !== 'Unknown' && varId !== 'None' && varId !== 'Matched') {
    return `https://www.ncbi.nlm.nih.gov/clinvar/variation/${varId}/`;
  }

  return null;
}

export default function ReportDetail() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [activeGeneIndex, setActiveGeneIndex] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get(`/reports/single/${id}`).then((res) => setReport(res.data.report)),
      api.get(`/analysis/${id}`).then((res) => setAnalysis(res.data.analysis)).catch(() => setAnalysis(null)),
    ]).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (activeGeneIndex === null) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setActiveGeneIndex(null);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeGeneIndex]);

  const sortedGenes = useMemo(() => {
    if (!analysis?.geneAnalyses) return [];

    return [...analysis.geneAnalyses].sort((a, b) => {
      const sigA = (a.clinicalSignificance || '').toLowerCase().trim();
      const sigB = (b.clinicalSignificance || '').toLowerCase().trim();

      const priorityA = SIGNIFICANCE_PRIORITY[sigA] ?? 99;
      const priorityB = SIGNIFICANCE_PRIORITY[sigB] ?? 99;

      return priorityA - priorityB;
    });
  }, [analysis]);

  const handleRunAnalysis = async () => {
    setError('');
    setRunning(true);
    try {
      const res = await api.post(`/analysis/${id}`);
      setAnalysis(res.data.analysis);
    } catch (err) {
      setError(err.response?.data?.message || 'Analysis failed');
    } finally {
      setRunning(false);
    }
  };

  const handleReview = async (reviewStatus) => {
    const res = await api.put(`/analysis/${analysis._id}/review`, { reviewStatus });
    setAnalysis(res.data.analysis);
  };

  if (loading || !report) {
    return (
      <Layout>
        <p className="text-muted-foreground text-sm">Loading...</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{report.originalFileName}</h1>
          <a href={report.filePath} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
            View original PDF
          </a>
        </div>
        {!analysis && report.status === 'analyzed' && (
          <Button onClick={handleRunAnalysis} disabled={running}>
            {running ? 'Analyzing...' : 'Run Analysis'}
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      {!analysis ? (
        <p className="text-muted-foreground text-sm">
          No analysis yet. {report.status === 'analyzed' ? 'Click "Run Analysis" to extract gene findings.' : `Report status: ${report.status}`}
        </p>
      ) : (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <span
              className={`text-xs px-3 py-1 rounded-full border ${
                analysis.reviewStatus === 'approved'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : analysis.reviewStatus === 'flagged'
                  ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300'
                  : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {analysis.reviewStatus.replace('_', ' ')}
            </span>
            {analysis.reviewStatus === 'pending_review' && (
              <>
                <Button size="sm" onClick={() => handleReview('approved')}>
                  Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleReview('flagged')}>
                  Flag
                </Button>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedGenes.map((gene, i) => (
              <motion.div
                key={gene._id || gene.geneName || i}
                layoutId={`gene-card-${i}`}
                onClick={() => setActiveGeneIndex(i)}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="relative bg-card border border-border/80 rounded-xl p-5 cursor-pointer hover:border-primary/60 transition-colors overflow-hidden shadow-sm hover:shadow-md flex flex-col justify-between"
                whileHover={{ y: -2 }}
              >
                <div>
                  <motion.span
                    layoutId={`gene-rank-${i}`}
                    className="absolute top-3.5 right-3.5 text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                  >
                    #{i + 1}
                  </motion.span>

                  <div className="flex items-center justify-between mb-2 pr-8">
                    <motion.h3
                      layoutId={`gene-title-${i}`}
                      className="text-lg font-semibold text-slate-900 dark:text-slate-100 tracking-tight"
                    >
                      {gene.geneName}
                    </motion.h3>
                  </div>

                  {gene.statusBadge && (
                    <div className="mb-2.5">
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded border inline-block ${getStatusBadgeStyle(
                          gene.statusKey
                        )}`}
                      >
                        {gene.statusBadge}
                      </span>
                    </div>
                  )}

                  {gene.clinicalSignificance && (
                    <motion.div layoutId={`gene-badge-${i}`} className="mb-2.5">
                      <span
                        className={`text-[11px] font-medium px-2.5 py-0.5 rounded-md border inline-block ${getBadgeStyle(
                          gene.clinicalSignificance
                        )}`}
                      >
                        {gene.clinicalSignificance}
                      </span>
                    </motion.div>
                  )}

                  {(gene.codingChange || gene.proteinChange) && (
                    <motion.p
                      layoutId={`gene-coding-${i}`}
                      className="font-mono text-xs text-slate-500 dark:text-slate-400 mb-2 truncate bg-slate-50 dark:bg-slate-900/50 px-2 py-1 rounded border border-slate-100 dark:border-slate-800"
                    >
                      {[gene.codingChange, gene.proteinChange].filter(Boolean).join(' | ')}
                    </motion.p>
                  )}

                  <motion.p
                    layoutId={`gene-summary-${i}`}
                    className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3"
                  >
                    {gene.clinicalSummary || gene.aiSummary}
                  </motion.p>
                </div>
              </motion.div>
            ))}
          </div>

          <AnimatePresence>
            {activeGeneIndex !== null && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setActiveGeneIndex(null)}
                  className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                />

                <motion.div
                  layoutId={`gene-card-${activeGeneIndex}`}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="bg-card border border-border rounded-2xl p-7 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl z-10 relative"
                >
                  <ExpandedGeneContent
                    index={activeGeneIndex}
                    gene={sortedGenes[activeGeneIndex]}
                    onClose={() => setActiveGeneIndex(null)}
                  />
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </Layout>
  );
}

function ExpandedGeneContent({ index, gene, onClose }) {
  const rawEvidence = gene.rawEvidence || gene.evidence || [];
  const evalMeta = gene.evidenceEvaluation || {};
  const geneClinVarUrl = resolveClinVarUrl(gene);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-3">
          <motion.h3
            layoutId={`gene-title-${index}`}
            className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight"
          >
            {gene.geneName}
          </motion.h3>

          <motion.span
            layoutId={`gene-rank-${index}`}
            className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
          >
            #{index + 1}
          </motion.span>
        </div>

        <button
          onClick={onClose}
          aria-label="Close modal"
          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xl leading-none p-1 rounded-md transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Identifiers & Variant Details */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/80 dark:border-slate-800 font-mono text-xs">
        <div>
          <span className="block text-[10px] uppercase font-semibold text-slate-400">HGVS Coding</span>
          <span className="text-slate-800 dark:text-slate-200 truncate block">{gene.hgvs_c || gene.codingChange || 'N/A'}</span>
        </div>
        <div>
          <span className="block text-[10px] uppercase font-semibold text-slate-400">HGVS Protein</span>
          <span className="text-slate-800 dark:text-slate-200 truncate block">{gene.hgvs_p || gene.proteinChange || 'N/A'}</span>
        </div>
        <div>
          <span className="block text-[10px] uppercase font-semibold text-slate-400">dbSNP ID</span>
          <span className="text-slate-800 dark:text-slate-200 truncate block">{gene.rsId || 'None'}</span>
        </div>
        <div>
          <span className="block text-[10px] uppercase font-semibold text-slate-400">ClinVar VarID</span>
          {geneClinVarUrl ? (
            <a
              href={geneClinVarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-semibold truncate block"
            >
              {gene.clinvarId || 'Link'} ↗
            </a>
          ) : (
            <span className="text-slate-800 dark:text-slate-200 truncate block">{gene.clinvarId || 'None'}</span>
          )}
        </div>
      </div>

      {/* Badges & Context Breakdown */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 items-center">
          {gene.statusBadge && (
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-md border inline-block ${getStatusBadgeStyle(
                gene.statusKey
              )}`}
            >
              {gene.statusBadge}
            </span>
          )}

          {gene.clinicalSignificance && (
            <motion.div layoutId={`gene-badge-${index}`}>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-md border inline-block ${getBadgeStyle(
                  gene.clinicalSignificance
                )}`}
              >
                Reported Significance: {gene.clinicalSignificance}
              </span>
            </motion.div>
          )}
        </div>

        {/* Structured Context Badges (Somatic, Oncogenicity, Therapeutic) */}
        {evalMeta.totalSubmissions > 0 && (
          <div className="flex flex-wrap gap-1.5 text-[11px] pt-1">
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-medium border border-slate-200 dark:border-slate-700">
              Total Submissions: {evalMeta.totalSubmissions}
            </span>
            {evalMeta.somaticImpacts?.map((imp, i) => (
              <span key={i} className="px-2 py-0.5 bg-purple-50 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 rounded font-medium border border-purple-200 dark:border-purple-800">
                Somatic Impact: {imp}
              </span>
            ))}
            {evalMeta.oncogenicityClassifications?.map((onc, i) => (
              <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 rounded font-medium border border-indigo-200 dark:border-indigo-800">
                Oncogenicity: {onc}
              </span>
            ))}
            {evalMeta.therapeuticResponses?.map((tx, i) => (
              <span key={i} className="px-2 py-0.5 bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 rounded font-medium border border-teal-200 dark:border-teal-800">
                Therapeutic: {tx}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Clinical Summary */}
      <div>
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          Clinical Summary
        </p>
        <motion.p
          layoutId={`gene-summary-${index}`}
          className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed max-w-prose whitespace-pre-line"
        >
          {gene.clinicalSummary || gene.aiSummary}
        </motion.p>
      </div>

      {/* Evidence Summary */}
      {gene.evidenceSummary && (
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Evidence & References
          </p>
          <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 whitespace-pre-line leading-relaxed">
            {gene.evidenceSummary}
          </div>
        </div>
      )}

      {/* Physician Review Block */}
      {gene.physicianReview && (
        <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-xl space-y-1">
          <p className="text-[11px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
            Physician Review Required
          </p>
          <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
            {gene.physicianReview}
          </p>
        </div>
      )}

      {/* External Database Records */}
      {rawEvidence.length > 0 && (
        <div className="pt-2">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Raw External Database Records
          </p>
          <div className="space-y-2">
            {rawEvidence.map((e, j) => {
              const evidenceUrl = resolveClinVarUrl(e) || geneClinVarUrl;

              return (
                <div
                  key={j}
                  className="text-xs p-3 rounded-lg bg-slate-50 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800 space-y-2"
                >
                  <div className="flex justify-between items-center">
                    {evidenceUrl ? (
                      <a
                        href={evidenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-semibold"
                      >
                        [{e.source || 'ClinVar'}] Variation ID: {e.variationId || gene.clinvarId || 'Matched'} ↗
                      </a>
                    ) : (
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        [{e.source || 'ClinVar'}] Variation ID: {e.variationId || 'Matched'}
                      </span>
                    )}
                  </div>

                  <p className="text-slate-600 dark:text-slate-400 leading-normal">{e.summary}</p>

                  {/* Individual Submission Badges */}
                  {e.submissions?.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/40 dark:border-slate-800/60 flex flex-wrap gap-1.5">
                      {e.submissions.map((sub, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-2 py-0.5 bg-white dark:bg-slate-800 border rounded text-[10px] text-slate-600 dark:text-slate-300"
                        >
                          Context: <b className="capitalize">{sub.evidenceContext}</b> | Classification: <b>{sub.clinicalSignificance}</b>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}