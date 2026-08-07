const mongoose = require('mongoose');

const structuredSubmissionSchema = new mongoose.Schema(
  {
    clinicalSignificance: { type: String, default: '' }, // e.g. Pathogenic, VUS, Benign
    reviewStatus: { type: String, default: '' }, // e.g. practice guideline, criteria provided
    evidenceContext: {
      type: String,
      enum: ['germline', 'somatic', 'therapeutic', 'unspecified', 'somatic_impact', 'oncogenicity'],
      default: 'unspecified',
    },
    somaticImpact: { type: String, default: '' }, // e.g. Tier I - Strong, Tier II
    oncogenicity: { type: String, default: '' }, // e.g. Oncogenic, Likely Oncogenic
    therapeuticResponse: { type: String, default: '' }, // e.g. Sensitivity/Response, Resistance
    submissionCount: { type: Number, default: 1 },
    submitter: { type: String, default: '' },
    assertionCriteria: { type: String, default: '' },
    condition: { type: String, default: '' },
  },
  { _id: false }
);

const evidenceSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      enum: ['ClinVar', 'COSMIC', 'CIViC', 'OncoKB', 'Other'],
      default: 'ClinVar',
    },
    reference: { type: String, default: '' },
    summary: { type: String, default: 'ClinVar Evidence Record' },
    variationId: { type: String, default: '' },
    url: { type: String, default: '' },
    retrievedAt: { type: Date, default: Date.now },
    submissions: [structuredSubmissionSchema],
  },
  { _id: false }
);

const geneAnalysisSchema = new mongoose.Schema(
  {
    geneName: { type: String, required: true },
    codingChange: { type: String, default: '' },
    proteinChange: { type: String, default: '' },
    clinicalSignificance: { type: String, default: '' },

    // Normalized Identifiers
    hgvs_c: { type: String, default: '' },
    hgvs_p: { type: String, default: '' },
    rsId: { type: String, default: '' },
    clinvarId: { type: String, default: '' },
    chromosome: { type: String, default: '' },
    position: { type: String, default: '' },
    referenceAllele: { type: String, default: '' },
    alternateAllele: { type: String, default: '' },

    // Matching Status
    variantMatchStatus: {
      type: String,
      enum: ['matched', 'not_matched', 'insufficient_information'],
      default: 'insufficient_information',
    },

    // Evidence Evaluation Breakdown
    evidenceEvaluation: {
      germlineSubmissionsCount: { type: Number, default: 0 },
      somaticClinicalImpactSubmissionsCount: { type: Number, default: 0 },
      somaticOncogenicitySubmissionsCount: { type: Number, default: 0 },
      therapeuticSubmissionsCount: { type: Number, default: 0 },
      totalSubmissions: { type: Number, default: 0 },
      germlineClassifications: [{ type: String }],
      somaticImpacts: [{ type: String }],
      somaticOncogenicityClassifications: [{ type: String }],
      therapeuticResponses: [{ type: String }],
      tumorTypes: [{ type: String }],
      hasSomaticContext: { type: Boolean, default: false },
      hasTherapeuticContext: { type: Boolean, default: false },
      hasGermlineContext: { type: Boolean, default: false },
    },

    // Decision Support Output
    statusBadge: { type: String, default: '' },
    statusKey: { type: String, default: '' },
    clinicalSummary: { type: String, default: '' },
    evidenceSummary: { type: String, default: '' },
    physicianReview: { type: String, default: '' },
    rawEvidence: [evidenceSchema],

    // Legacy fields
    aiSummary: { type: String, default: '' },
    confidenceNote: { type: String, default: '' },
    evidence: [evidenceSchema],
  },
  { _id: false }
);

const analysisSchema = new mongoose.Schema(
  {
    reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', required: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
    geneAnalyses: [geneAnalysisSchema],

    reviewStatus: {
      type: String,
      enum: ['pending_review', 'approved', 'flagged'],
      default: 'pending_review',
    },
    reviewNotes: { type: String, default: '' },
    reviewedAt: { type: Date },

    version: { type: Number, default: 1 },
    isLatest: { type: Boolean, default: true, index: true },

    modelUsed: { type: String, default: '' },
    promptVersion: { type: String, default: '' },
    processingTimeMs: { type: Number },
  },
  { timestamps: true }
);

analysisSchema.index({ doctorId: 1, isLatest: 1, createdAt: -1 });

module.exports = mongoose.model('Analysis', analysisSchema);