/**
 * Generic extraction service for genomic report text
 */
const HGVS_C_REGEX = /(?:c\.)?([0-9]+[a-zA-Z]>[a-zA-Z]|[0-9]+(?:_[0-9]+)?(?:del|ins|dup)[a-zA-Z]*)/i;
const HGVS_P_REGEX = /(?:p\.)?([A-Z][a-z]{2}[0-9]+[A-Z][a-z]{2}|[A-Z][0-9]+[A-Z])/i;
const RSID_REGEX = /(rs[0-9]+)/i;
const CLINVAR_ID_REGEX = /(?:clinvar(?::|\s*id)?:?\s*)([0-9]+)/i;

/**
 * Validates whether enough info exists to form a specific variant query
 */
const determineVariantMatchStatus = (finding) => {
  if (finding.hgvs_c || finding.rsId || finding.clinvarId) {
    return 'matched';
  }
  if (finding.hgvs_p && finding.hgvs_p.length > 3) {
    return 'matched';
  }
  if (
    finding.chromosome &&
    finding.position &&
    finding.referenceAllele &&
    finding.alternateAllele
  ) {
    return 'matched';
  }
  return 'insufficient_information';
};

const extractGeneFindings = (extractedText) => {
  if (!extractedText) return [];

  const findings = [];
  const lines = extractedText.split('\n');

  // Generic regular expressions for common oncology genes
  const GENE_REGEX = /\b(BRAF|IDH2|EGFR|TP53|BRCA1|BRCA2|KRAS|NRAS|PIK3CA|ALK|ROS1|RET|MET)\b/gi;

  let currentGeneMatch;
  const foundGenes = new Set();

  while ((currentGeneMatch = GENE_REGEX.exec(extractedText)) !== null) {
    const geneName = currentGeneMatch[1].toUpperCase();
    if (foundGenes.has(geneName)) continue;
    foundGenes.add(geneName);

    // Extract local context window around gene match (200 chars)
    const matchIndex = currentGeneMatch.index;
    const contextWindow = extractedText.substring(
      Math.max(0, matchIndex - 100),
      Math.min(extractedText.length, matchIndex + 200)
    );

    const cMatch = contextWindow.match(HGVS_C_REGEX);
    const pMatch = contextWindow.match(HGVS_P_REGEX);
    const rsMatch = contextWindow.match(RSID_REGEX);
    const clinvarMatch = contextWindow.match(CLINVAR_ID_REGEX);

    const hgvs_c = cMatch ? (cMatch[0].startsWith('c.') ? cMatch[0] : `c.${cMatch[0]}`) : '';
    const hgvs_p = pMatch ? (pMatch[0].startsWith('p.') ? pMatch[0] : `p.${pMatch[0]}`) : '';
    const rsId = rsMatch ? rsMatch[1].toLowerCase() : '';
    const clinvarId = clinvarMatch ? clinvarMatch[1] : '';

    // Extract clinical significance if explicitly mentioned
    let clinicalSignificance = '';
    if (/pathogenic/i.test(contextWindow) && !/likely benign|benign/i.test(contextWindow)) {
      clinicalSignificance = /likely pathogenic/i.test(contextWindow)
        ? 'Likely Pathogenic'
        : 'Pathogenic';
    } else if (/uncertain significance|vus/i.test(contextWindow)) {
      clinicalSignificance = 'Uncertain Significance';
    } else if (/benign/i.test(contextWindow)) {
      clinicalSignificance = /likely benign/i.test(contextWindow) ? 'Likely Benign' : 'Benign';
    }

    const finding = {
      geneName,
      codingChange: hgvs_c,
      proteinChange: hgvs_p,
      hgvs_c,
      hgvs_p,
      rsId,
      clinvarId,
      chromosome: '',
      position: '',
      referenceAllele: '',
      alternateAllele: '',
      clinicalSignificance,
    };

    finding.variantMatchStatus = determineVariantMatchStatus(finding);
    findings.push(finding);
  }

  return findings;
};

module.exports = { extractGeneFindings, determineVariantMatchStatus };