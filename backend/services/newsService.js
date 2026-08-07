const axios = require('axios');
const MedicalNews = require('../models/MedicalNews');

// PubMed date fields sometimes come back as a full citation string like
// "2026 Dec 31;31(1):2687238. doi:... Epub 2026 Jun 11." - the leading date
// is the print/issue date (can be months in the future), the date after
// "Epub" is when the article actually went live online. Always prefer the latter.
function extractBestDate(dateStr) {
  if (!dateStr) return null;
  const epubMatch = dateStr.match(/Epub\s+(\d{4}\s+\w+\s+\d{1,2})/i);
  if (epubMatch) return epubMatch[1];
  return dateStr;
}

// Helper to convert diverse date strings into unix timestamps for accurate sorting.
// Also clamps anything that lands in the future - never trust a source blindly.
function parseToTimestamp(dateStr) {
  if (!dateStr) return 0;
  const now = Date.now();
  const cleaned = extractBestDate(dateStr);

  const parsed = Date.parse(cleaned);
  if (!isNaN(parsed)) {
    return parsed > now ? now : parsed;
  }

  const match = cleaned.match(/\b(19|20)\d{2}\b/);
  if (match) {
    const yearTimestamp = new Date(match[0], 0, 1).getTime();
    return yearTimestamp > now ? now : yearTimestamp;
  }
  return 0;
}

// 1. Fetch latest oncology papers strictly sorted by publication date
async function fetchPubMedArticles() {
  try {
    const searchUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
    const searchRes = await axios.get(searchUrl, {
      params: {
        db: 'pubmed',
        term: '(cancer[Title/Abstract] OR oncology[Title/Abstract]) AND (genomics[Title/Abstract] OR "targeted therapy"[Title/Abstract])',
        retmode: 'json',
        retmax: 6,
        sort: 'pub_date',
      },
    });

    const ids = searchRes.data?.esearchresult?.idlist || [];
    if (ids.length === 0) return [];

    const summaryUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi';
    const summaryRes = await axios.get(summaryUrl, {
      params: {
        db: 'pubmed',
        id: ids.join(','),
        retmode: 'json',
      },
    });

    const result = summaryRes.data?.result || {};
    return ids.map((id) => {
      const item = result[id] || {};
      const rawDate = item.epubdate || item.sortpubdate || item.pubdate || 'Recent';
      const pubDate = extractBestDate(rawDate) || rawDate;

      return {
        externalId: `pubmed-${id}`,
        title: item.title ? item.title.replace(/\[|\]/g, '') : 'Oncology Research Article',
        summary: item.authors && item.authors.length > 0
          ? `Authored by: ${item.authors.slice(0, 3).map((a) => a.name).join(', ')}. Published in ${item.source || 'Medical Journal'}.`
          : `Recent genomic and targeted therapy research published in ${item.source || 'Medical Journal'}.`,
        source: item.source || 'PubMed',
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        tag: 'Research',
        publishedAt: pubDate,
        timestamp: parseToTimestamp(pubDate),
      };
    });
  } catch (error) {
    console.error('Error fetching PubMed articles:', error.message);
    return [];
  }
}

// 2. Fetch recent cancer trials from ClinicalTrials.gov
async function fetchClinicalTrials() {
  try {
    const trialUrl = 'https://clinicaltrials.gov/api/v2/studies';
    const res = await axios.get(trialUrl, {
      params: {
        'query.cond': 'cancer genomics',
        pageSize: 4,
        sort: 'LastUpdatePostDate:desc',
      },
    });

    const studies = res.data?.studies || [];
    return studies.map((study) => {
      const protocol = study.protocolSection || {};
      const id = protocol.identificationModule?.nctId || Math.random().toString();
      const title = protocol.identificationModule?.briefTitle || 'Cancer Biomarker Clinical Trial';
      const summary = protocol.descriptionModule?.briefSummary || 'Clinical study evaluating targeted gene therapies in oncology patients.';
      const dateStr = protocol.statusModule?.lastUpdatePostDateStruct?.date
        || protocol.statusModule?.startDateStruct?.date
        || '2026';

      return {
        externalId: `trial-${id}`,
        title,
        summary: summary.length > 200 ? `${summary.substring(0, 200)}...` : summary,
        source: 'ClinicalTrials.gov',
        url: `https://clinicaltrials.gov/study/${id}`,
        tag: 'Clinical Trial',
        publishedAt: dateStr,
        timestamp: parseToTimestamp(dateStr),
      };
    });
  } catch (error) {
    console.error('Error fetching ClinicalTrials:', error.message);
    return [];
  }
}

// Combine, Sort Descending by Timestamp, and Cache
async function syncMedicalNews() {
  const [pubmedItems, trialItems] = await Promise.all([
    fetchPubMedArticles(),
    fetchClinicalTrials(),
  ]);

  const allNews = [...pubmedItems, ...trialItems].sort((a, b) => b.timestamp - a.timestamp);

  for (const item of allNews) {
    await MedicalNews.updateOne(
      { externalId: item.externalId },
      { $set: item },
      { upsert: true }
    );
  }

  console.log(`[NEWS SYNC] Synced ${allNews.length} articles with strict date ordering.`);
  return allNews;
}

module.exports = { syncMedicalNews };