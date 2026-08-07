const Analysis = require('../models/Analysis');
const Report = require('../models/Report');
const asyncHandler = require('../middlewares/asyncHandler');
const AppError = require('../utils/AppError');
const { extractGeneFindings } = require('../services/geneExtraction');
const { retrieveEvidenceForGene } = require('../services/knowledgeRetrieval');
const { generateExplanationForGene } = require('../services/aiExplanation');

exports.runAnalysis = asyncHandler(async (req, res) => {
  const { reportId } = req.params;

  const report = await Report.findById(reportId);
  if (!report) throw new AppError('Report not found', 404);

  const geneFindings = extractGeneFindings(report.extractedText || '');
  if (geneFindings.length === 0) {
    throw new AppError('No recognized genes found in report', 422);
  }

  const geneAnalyses = [];
  let totalProcessingTimeMs = 0;
  let modelUsed = '';
  let promptVersion = '';

  for (const finding of geneFindings) {
    const parsedClinvarData = await retrieveEvidenceForGene(finding);
    const explanation = await generateExplanationForGene(finding, parsedClinvarData);

    totalProcessingTimeMs += explanation.processingTimeMs || 0;
    modelUsed = explanation.modelUsed;
    promptVersion = explanation.promptVersion;

    // Collect all sub-submissions
    const allSubmissions = [
      ...(parsedClinvarData?.germline?.submissions || []),
      ...(parsedClinvarData?.somaticClinicalImpact?.submissions || []),
      ...(parsedClinvarData?.somaticOncogenicity?.submissions || []),
      ...(parsedClinvarData?.therapeuticEvidence?.submissions || []),
    ];

    const varId = parsedClinvarData?.variant?.clinvarVariationId || finding.clinvarId || '';
    
    // Construct valid ClinVar URL or use the one parsed from knowledgeRetrieval
    const clinvarUrl =
      parsedClinvarData?.variant?.url ||
      (varId && varId !== 'Unknown' && varId !== 'None'
        ? `https://www.ncbi.nlm.nih.gov/clinvar/variation/${varId}/`
        : '');

    const formattedEvidenceItem = {
      source: 'ClinVar',
      summary: explanation.clinicalSummary || 'ClinVar variant evidence summary',
      variationId: varId,
      url: clinvarUrl,
      reference: parsedClinvarData?.variant?.hgvs || '',
      submissions: allSubmissions,
      retrievedAt: new Date(),
    };

    geneAnalyses.push({
      geneName: finding.geneName,
      codingChange: finding.codingChange,
      proteinChange: finding.proteinChange,
      clinicalSignificance: finding.clinicalSignificance,
      hgvs_c: finding.hgvs_c,
      hgvs_p: finding.hgvs_p,
      rsId: finding.rsId,
      clinvarId: varId,
      variantMatchStatus: finding.variantMatchStatus || 'matched',
      evidenceEvaluation: explanation.evaluationMeta || {},
      statusBadge: explanation.statusBadge,
      statusKey: explanation.statusKey,
      clinicalSummary: explanation.clinicalSummary,
      evidenceSummary: explanation.evidenceSummary,
      physicianReview: explanation.physicianReview,
      rawEvidence: [formattedEvidenceItem],
      aiSummary: explanation.clinicalSummary,
      confidenceNote: explanation.statusBadge,
      evidence: [formattedEvidenceItem],
    });
  }

  await Analysis.updateMany({ reportId, isLatest: true }, { isLatest: false });

  const analysis = await Analysis.create({
    reportId,
    patientId: report.patientId,
    doctorId: req.doctor?.id || report.doctorId,
    geneAnalyses,
    version: 1,
    isLatest: true,
    modelUsed,
    promptVersion,
    processingTimeMs: totalProcessingTimeMs,
  });

  res.status(201).json({ success: true, analysis });
});

exports.getAnalysisByReportId = asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const analysis = await Analysis.findOne({ reportId, isLatest: true });

  if (!analysis) {
    return res.status(404).json({ success: false, message: 'Analysis not found' });
  }

  res.status(200).json({ success: true, analysis });
});

exports.updateReviewStatus = asyncHandler(async (req, res) => {
  const { analysisId } = req.params;
  const { reviewStatus, reviewNotes } = req.body;

  const analysis = await Analysis.findByIdAndUpdate(
    analysisId,
    {
      reviewStatus,
      reviewNotes: reviewNotes || '',
      reviewedAt: Date.now(),
    },
    { new: true }
  );

  if (!analysis) {
    return res.status(404).json({ success: false, message: 'Analysis record not found' });
  }

  res.status(200).json({ success: true, analysis });
});