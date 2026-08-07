// services/knowledgeRetrieval.js
const axios = require('axios');

const CLINVAR_ESEARCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const CLINVAR_ESUMMARY_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi';
const CLINVAR_WEB_BASE_URL = 'https://www.ncbi.nlm.nih.gov/clinvar/variation/';

/**
 * Helper to construct a working ClinVar web link.
 */
function getClinVarUrl(variationId) {
  if (!variationId || variationId === 'Unknown' || variationId === '0') {
    return 'https://www.ncbi.nlm.nih.gov/clinvar/';
  }
  return `${CLINVAR_WEB_BASE_URL}${variationId}/`;
}

/**
 * Fetches ClinVar record data given a variation ID or variant search term.
 */
async function fetchClinVarData(variationId) {
  try {
    const response = await axios.get(CLINVAR_ESUMMARY_URL, {
      params: {
        db: 'clinvar',
        id: variationId,
        retmode: 'json',
      },
      timeout: 10000,
    });

    return parseClinVarRecord(response.data, variationId);
  } catch (error) {
    console.error(`Error fetching ClinVar data for Variation ID ${variationId}:`, error.message);
    return parseClinVarRecord(null, variationId);
  }
}

/**
 * Searches NCBI ClinVar for a variation ID using HGVS / Gene + Protein notation.
 */
async function searchClinVarVariationId(gene, proteinOrCoding) {
  try {
    const term = `${gene} ${proteinOrCoding}`.trim();
    
    const searchResponse = await axios.get(CLINVAR_ESEARCH_URL, {
      params: {
        db: 'clinvar',
        term,
        retmode: 'json',
      },
      timeout: 10000,
    });

    const idList = searchResponse.data?.esearchresult?.idlist || [];
    return idList.length > 0 ? idList[0] : null;
  } catch (error) {
    console.error(`Error searching ClinVar ID for ${gene} ${proteinOrCoding}:`, error.message);
    return null;
  }
}

/**
 * Retrieves full evidence structure for a gene finding.
 */
async function retrieveEvidenceForGene(finding) {
  let variationId = finding.clinvarId || finding.variationId;

  if (!variationId && finding.geneName) {
    const change = finding.proteinChange || finding.codingChange || '';
    variationId = await searchClinVarVariationId(finding.geneName, change);
  }

  if (!variationId) {
    return parseClinVarRecord(null, 'Unknown');
  }

  return await fetchClinVarData(variationId);
}

/**
 * Parses raw NCBI ClinVar ESummary or VCV record into structured categories.
 */
function parseClinVarRecord(summaryData, variationId) {
  const record = summaryData?.result?.[variationId] || summaryData;
  const validId = String(variationId);

  const parsed = {
    variant: {
      gene: record?.genes?.[0]?.symbol || record?.gene_sort || 'Unknown',
      hgvs: record?.canonical_spdi || record?.title || '',
      clinvarVariationId: validId,
      url: getClinVarUrl(validId), // Explicit working ClinVar link
    },
    germline: {
      classifications: [],
      submissionsCount: 0,
      submissions: [],
    },
    somaticClinicalImpact: {
      classifications: [],
      tumorTypes: [],
      submissionsCount: 0,
      submissions: [],
    },
    somaticOncogenicity: {
      classifications: [],
      tumorTypes: [],
      submissionsCount: 0,
      submissions: [],
    },
    therapeuticEvidence: {
      drugs: [],
      classifications: [],
      submissionsCount: 0,
      submissions: [],
    },
  };

  if (!record) return parsed;

  // 1. Process Germline
  const germlineSignificance = record?.germline_classification?.description || record?.clinical_significance?.description;
  if (germlineSignificance) {
    parsed.germline.classifications.push(germlineSignificance);
  }

  // 2. Process Submissions / Classifications Set
  const classifiedSubmissions = record?.classified_submissions || record?.clinical_assertions || [];

  if (Array.isArray(classifiedSubmissions) && classifiedSubmissions.length > 0) {
    classifiedSubmissions.forEach((sub) => {
      const category = (sub.category || sub.evidence_context || sub.type || '').toLowerCase();
      const reviewStatus = sub.review_status || sub.reviewStatus || 'no assertion criteria provided';
      const submitter = sub.submitter_name || sub.submitter || 'ClinVar Submitter';
      const assertionCriteria = sub.assertion_criteria || sub.citation || 'N/A';
      const classification = sub.clinical_significance || sub.description || sub.impact || sub.classification || '';
      const condition = sub.trait_name || sub.condition || sub.tumor_type || '';

      const submissionEntry = {
        submitter,
        reviewStatus,
        assertionCriteria,
        classification,
        condition,
        evidenceContext: category || 'germline',
      };

      if (category.includes('somatic_impact') || category.includes('clinical_impact') || sub.impact) {
        parsed.somaticClinicalImpact.submissions.push(submissionEntry);
        if (classification && !parsed.somaticClinicalImpact.classifications.includes(classification)) {
          parsed.somaticClinicalImpact.classifications.push(classification);
        }
        if (condition && !parsed.somaticClinicalImpact.tumorTypes.includes(condition)) {
          parsed.somaticClinicalImpact.tumorTypes.push(condition);
        }
      } else if (category.includes('oncogenicity')) {
        parsed.somaticOncogenicity.submissions.push(submissionEntry);
        if (classification && !parsed.somaticOncogenicity.classifications.includes(classification)) {
          parsed.somaticOncogenicity.classifications.push(classification);
        }
        if (condition && !parsed.somaticOncogenicity.tumorTypes.includes(condition)) {
          parsed.somaticOncogenicity.tumorTypes.push(condition);
        }
      } else if (category.includes('drug') || category.includes('therapeutic') || category.includes('response')) {
        parsed.therapeuticEvidence.submissions.push(submissionEntry);
        if (classification && !parsed.therapeuticEvidence.classifications.includes(classification)) {
          parsed.therapeuticEvidence.classifications.push(classification);
        }
        if (condition && !parsed.therapeuticEvidence.drugs.includes(condition)) {
          parsed.therapeuticEvidence.drugs.push(condition);
        }
      } else {
        parsed.germline.submissions.push(submissionEntry);
      }
    });
  }

  // 3. Fallbacks
  if (record.somatic_clinical_impact) {
    const sci = record.somatic_clinical_impact;
    if (sci.classification && !parsed.somaticClinicalImpact.classifications.includes(sci.classification)) {
      parsed.somaticClinicalImpact.classifications.push(sci.classification);
    }
    if (sci.tumor_type && !parsed.somaticClinicalImpact.tumorTypes.includes(sci.tumor_type)) {
      parsed.somaticClinicalImpact.tumorTypes.push(sci.tumor_type);
    }
    parsed.somaticClinicalImpact.submissionsCount = sci.submission_count || parsed.somaticClinicalImpact.submissions.length;
  } else {
    parsed.somaticClinicalImpact.submissionsCount = parsed.somaticClinicalImpact.submissions.length;
  }

  if (record.oncogenicity_classification) {
    const onc = record.oncogenicity_classification;
    if (onc.classification && !parsed.somaticOncogenicity.classifications.includes(onc.classification)) {
      parsed.somaticOncogenicity.classifications.push(onc.classification);
    }
    parsed.somaticOncogenicity.submissionsCount = onc.submission_count || parsed.somaticOncogenicity.submissions.length;
  } else {
    parsed.somaticOncogenicity.submissionsCount = parsed.somaticOncogenicity.submissions.length;
  }

  parsed.germline.submissionsCount = parsed.germline.submissions.length || (germlineSignificance ? 1 : 0);
  parsed.therapeuticEvidence.submissionsCount = parsed.therapeuticEvidence.submissions.length;

  return parsed;
}

module.exports = {
  fetchClinVarData,
  searchClinVarVariationId,
  retrieveEvidenceForGene,
  parseClinVarRecord,
  getClinVarUrl,
};