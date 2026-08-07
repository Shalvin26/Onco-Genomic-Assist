const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL_NAME = 'llama-3.3-70b-versatile';
const PROMPT_VERSION = 'v5-separated-evidence-context';

/**
 * Evaluates evidence consistency, conflicting classifications,
 * somatic vs germline distinctions, and separate submission volume counts.
 */
const evaluateEvidenceStructured = (geneFinding, parsedClinvarData = {}) => {
  const germlineCount = parsedClinvarData?.germline?.submissionsCount || 0;
  const somaticImpactCount = parsedClinvarData?.somaticClinicalImpact?.submissionsCount || 0;
  const somaticOncCount = parsedClinvarData?.somaticOncogenicity?.submissionsCount || 0;
  const therapeuticCount = parsedClinvarData?.therapeuticEvidence?.submissionsCount || 0;

  const totalSubmissions = germlineCount + somaticImpactCount + somaticOncCount + therapeuticCount;

  const germlineClassifications = parsedClinvarData?.germline?.classifications || [];
  const somaticImpacts = parsedClinvarData?.somaticClinicalImpact?.classifications || [];
  const somaticOncogenicity = parsedClinvarData?.somaticOncogenicity?.classifications || [];
  const therapeuticResponses = parsedClinvarData?.therapeuticEvidence?.drugs || [];

  const tumorTypes = [
    ...(parsedClinvarData?.somaticClinicalImpact?.tumorTypes || []),
    ...(parsedClinvarData?.somaticOncogenicity?.tumorTypes || []),
  ];

  const evaluationMeta = {
    germlineSubmissionsCount: germlineCount,
    somaticClinicalImpactSubmissionsCount: somaticImpactCount,
    somaticOncogenicitySubmissionsCount: somaticOncCount,
    therapeuticSubmissionsCount: therapeuticCount,
    totalSubmissions,
    germlineClassifications,
    somaticImpacts,
    somaticOncogenicityClassifications: somaticOncogenicity,
    therapeuticResponses,
    tumorTypes,
    hasSomaticContext: somaticImpactCount > 0 || somaticOncCount > 0,
    hasTherapeuticContext: therapeuticCount > 0 || therapeuticResponses.length > 0,
    hasGermlineContext: germlineCount > 0 || germlineClassifications.length > 0,
  };

  if (geneFinding?.variantMatchStatus === 'insufficient_information') {
    return {
      statusKey: 'INSUFFICIENT_VARIANT_INFO',
      badgeText: 'Insufficient Variant Information',
      isConflicting: false,
      evaluationMeta,
    };
  }

  // Check for conflicting germline evidence
  const hasPathogenic = germlineClassifications.some((s) => /likely pathogenic|pathogenic/i.test(s));
  const hasVUS = germlineClassifications.some((s) => /uncertain significance|vus/i.test(s));
  const hasBenign = germlineClassifications.some((s) => /likely benign|benign/i.test(s));
  const isConflicting = (hasPathogenic && hasVUS) || (hasPathogenic && hasBenign) || (hasVUS && hasBenign);

  if (isConflicting) {
    return {
      statusKey: 'CONFLICTING',
      badgeText: 'Conflicting Germline Evidence — Physician Review Recommended',
      isConflicting: true,
      evaluationMeta,
    };
  }

  // Somatic / Therapeutic priority state
  if (evaluationMeta.hasSomaticContext || evaluationMeta.hasTherapeuticContext) {
    return {
      statusKey: 'SOMATIC_EVIDENCE',
      badgeText: 'Somatic & Therapeutic Evidence Available — Physician Review Recommended',
      isConflicting: false,
      evaluationMeta,
    };
  }

  if (hasPathogenic) {
    return {
      statusKey: 'CONSISTENT_PATHOGENIC',
      badgeText: 'Consistent Pathogenic Evidence',
      isConflicting: false,
      evaluationMeta,
    };
  }

  if (hasVUS) {
    return {
      statusKey: 'VUS',
      badgeText: 'Uncertain Significance',
      isConflicting: false,
      evaluationMeta,
    };
  }

  if (hasBenign) {
    return {
      statusKey: 'BENIGN',
      badgeText: 'Consistent Benign Evidence',
      isConflicting: false,
      evaluationMeta,
    };
  }

  if (totalSubmissions === 0) {
    return {
      statusKey: 'LIMITED',
      badgeText: 'Limited Evidence Available',
      isConflicting: false,
      evaluationMeta,
    };
  }

  return {
    statusKey: 'CONSISTENT_EVIDENCE',
    badgeText: 'Consistent Evidence Available',
    isConflicting: false,
    evaluationMeta,
  };
};

const buildPrompt = (geneFinding, parsedClinvarData = {}, statusInfo = {}) => {
  const meta = statusInfo?.evaluationMeta || {};

  const structuredContextSummary = `
- Variant: ${geneFinding?.geneName || 'Unknown'} ${geneFinding?.proteinChange || geneFinding?.codingChange || ''}
- ClinVar Variation ID: ${parsedClinvarData?.variant?.clinvarVariationId || geneFinding?.clinvarId || 'Matched'}
- Submission Breakdown:
  * Germline Submissions: ${meta.germlineSubmissionsCount || 0}
  * Somatic Clinical Impact Submissions: ${meta.somaticClinicalImpactSubmissionsCount || 0}
  * Somatic Oncogenicity Submissions: ${meta.somaticOncogenicitySubmissionsCount || 0}
  * Therapeutic/Drug Response Submissions: ${meta.therapeuticSubmissionsCount || 0}
- Total Combined Submissions: ${meta.totalSubmissions || 0}

- Categorized Evidence Details:
  * Germline Classifications: ${meta.germlineClassifications?.length ? meta.germlineClassifications.join(', ') : 'None'}
  * Somatic Clinical Impact: ${meta.somaticImpacts?.length ? meta.somaticImpacts.join(', ') : 'None'} (Tumor/Conditions: ${meta.tumorTypes?.length ? meta.tumorTypes.join(', ') : 'Unspecified'})
  * Somatic Oncogenicity: ${meta.somaticOncogenicityClassifications?.length ? meta.somaticOncogenicityClassifications.join(', ') : 'None'}
  * Therapeutic/Drug Responses: ${meta.therapeuticResponses?.length ? meta.therapeuticResponses.join(', ') : 'None'}
`;

  const systemInstructions = `
You are a decision support tool for clinical genomic report interpretation.
You are NOT a diagnostic system and must NEVER assign definitive pathogenicity, diagnose disease, or prescribe treatment.

CRITICAL INSTRUCTIONS:
1. Reference the exact gene and variant (${geneFinding?.geneName || ''} ${geneFinding?.proteinChange || geneFinding?.codingChange || ''}) and its matched ClinVar ID (${parsedClinvarData?.variant?.clinvarVariationId || ''}).
2. DO NOT state "Limited evidence is available" if there are somatic or therapeutic records present.
3. Differentiate clearly between Germline classifications, Somatic clinical impact, Somatic oncogenicity, and Therapeutic relevance. Keep them strictly separated.
4. NEVER state "This variant causes cancer", "This variant increases disease risk", or "The patient has cancer".
5. Present therapeutic/drug response evidence purely as database findings for physician review, NOT as a clinical prescription or treatment recommendation.
6. Always conclude with guidance emphasizing interpretation in the context of the patient's specimen type, tumor diagnosis, pathology, and clinical presentation.

Return strictly a JSON object:
{
  "clinicalSummary": "...",
  "evidenceSummary": "...",
  "physicianReview": "..."
}
`;

  const userPrompt = `
Gene & Variant: ${geneFinding?.geneName || ''} ${geneFinding?.proteinChange || geneFinding?.codingChange || ''}
Calculated Evidence Status: ${statusInfo?.badgeText || 'Evidence Available'}

Structured ClinVar Categories:
${structuredContextSummary}

Raw Classified Submissions:
${JSON.stringify(parsedClinvarData, null, 2)}

Generate the clinical decision support JSON adhering strictly to instructions.
`;

  return { systemInstructions, userPrompt };
};

const generateExplanationForGene = async (geneFinding, parsedClinvarData = {}, retriesLeft = 2) => {
  const startTime = Date.now();
  const statusInfo = evaluateEvidenceStructured(geneFinding, parsedClinvarData);

  if (statusInfo.statusKey === 'INSUFFICIENT_VARIANT_INFO') {
    return {
      statusBadge: 'Insufficient Variant Information',
      statusKey: 'INSUFFICIENT_VARIANT_INFO',
      clinicalSummary: `A ${geneFinding?.geneName || 'gene'} finding was identified, but the specific variant could not be determined from the available report data. Clinical significance cannot be reliably assessed without exact variant information.`,
      evidenceSummary: 'External database evidence was not used because the specific variant could not be reliably identified.',
      physicianReview: 'Review the original laboratory report to identify the exact variant before interpreting external database evidence.',
      rawEvidence: parsedClinvarData,
      evaluationMeta: statusInfo.evaluationMeta,
      processingTimeMs: Date.now() - startTime,
      modelUsed: 'deterministic-rules',
      promptVersion: PROMPT_VERSION,
    };
  }

  const { systemInstructions, userPrompt } = buildPrompt(geneFinding, parsedClinvarData, statusInfo);

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: 'system', content: systemInstructions },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 700,
      temperature: 0.1,
    });

    const rawJson = completion.choices[0]?.message?.content?.trim() || '{}';
    const parsed = JSON.parse(rawJson);

    return {
      statusBadge: statusInfo.badgeText,
      statusKey: statusInfo.statusKey,
      clinicalSummary: parsed.clinicalSummary || '',
      evidenceSummary: parsed.evidenceSummary || '',
      physicianReview:
        parsed.physicianReview ||
        "Interpret the variant in the context of the patient's clinical presentation, specimen/sample type, diagnosis, pathology, and other molecular findings. Review underlying database submissions before determining clinical significance.",
      rawEvidence: parsedClinvarData,
      evaluationMeta: statusInfo.evaluationMeta,
      processingTimeMs: Date.now() - startTime,
      modelUsed: MODEL_NAME,
      promptVersion: PROMPT_VERSION,
    };
  } catch (error) {
    if (error.status === 429 && retriesLeft > 0) {
      await new Promise((res) => setTimeout(res, 2000));
      return generateExplanationForGene(geneFinding, parsedClinvarData, retriesLeft - 1);
    }
    throw error;
  }
};

module.exports = {
  generateExplanationForGene,
  evaluateEvidenceStructured,
  determineEvidenceStatus: evaluateEvidenceStructured,
  MODEL_NAME,
  PROMPT_VERSION,
};