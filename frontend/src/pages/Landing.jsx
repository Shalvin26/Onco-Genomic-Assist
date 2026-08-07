import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Nav */}
      <nav className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-semibold text-primary text-lg">GenomicAssist</span>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link to="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.5, 0.35] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-40 -left-40 w-lg h-128 rounded-full bg-green-300/40 blur-3xl"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.25, 0.4, 0.25] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="absolute top-20 -right-32 w-md h-112 rounded-full bg-green-500/30 blur-3xl"
          />
        </div>

        <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-28 text-center">
          <motion.div initial="hidden" animate="show" variants={stagger}>
            <motion.span
              variants={fadeUp}
              className="inline-block text-xs font-medium px-3 py-1 rounded-full bg-secondary text-secondary-foreground mb-6"
            >
              Evidence-first · AI-assisted · Built for oncologists
            </motion.span>
            <motion.h1
              variants={fadeUp}
              className="text-4xl md:text-6xl font-semibold text-foreground tracking-tight leading-tight"
            >
              Genomic reports,
              <br />
              <span className="text-primary">explained clearly.</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto"
            >
              Upload a genomic test report and get structured gene findings,
              evidence from trusted databases like ClinVar and CIViC, and
              plain-language explanations — reviewed and approved by you before
              anything is final.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex items-center justify-center gap-3">
              <Link to="/register">
                <Button size="lg">Start free</Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline">I have an account</Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Problem statement */}
      <section className="border-t border-border bg-secondary/30">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
          className="max-w-5xl mx-auto px-6 py-20"
        >
          <motion.h2 variants={fadeUp} className="text-2xl md:text-3xl font-semibold text-foreground text-center mb-4">
            Genomic reports take too long to review manually
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
            Doctors spend hours cross-referencing variants against ClinVar, CIViC,
            and published literature before making a clinical decision. GenomicAssist
            compresses that workflow without replacing your judgment.
          </motion.p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { stat: 'Hours', label: 'spent manually cross-referencing variant databases per report' },
              { stat: 'Multiple', label: 'databases to check separately — ClinVar, CIViC, and more' },
              { stat: 'Zero', label: 'AI-originated clinical claims — every explanation is evidence-backed' },
            ].map((item) => (
              <motion.div key={item.label} variants={fadeUp} className="bg-card border border-border rounded-xl p-6">
                <p className="text-2xl font-semibold text-primary mb-2">{item.stat}</p>
                <p className="text-sm text-muted-foreground">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="border-t border-border">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
          className="max-w-5xl mx-auto px-6 py-20"
        >
          <motion.h2 variants={fadeUp} className="text-2xl md:text-3xl font-semibold text-foreground text-center mb-12">
            How it works
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Upload', desc: 'Upload a genomic test report PDF for a patient.' },
              { step: '02', title: 'Extract', desc: 'Genes and variants are identified from the report text.' },
              { step: '03', title: 'Retrieve', desc: 'Evidence is pulled from ClinVar and CIViC for each finding.' },
              { step: '04', title: 'Review', desc: 'AI explains the evidence in plain language — you approve or flag it.' },
            ].map((item) => (
              <motion.div key={item.step} variants={fadeUp} className="relative">
                <span className="text-4xl font-semibold text-green-300">{item.step}</span>
                <h3 className="text-foreground font-semibold mt-2 mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Evidence sources */}
      <section className="border-t border-border bg-secondary/30">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
          className="max-w-4xl mx-auto px-6 py-20 text-center"
        >
          <motion.h2 variants={fadeUp} className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
            Built on trusted genomic evidence
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground mb-10 max-w-xl mx-auto">
            Every explanation is grounded in evidence retrieved before the AI ever
            writes a word — never the other way around.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-4">
            {['ClinVar', 'CIViC', 'NCI', 'PubMed'].map((source) => (
              <span
                key={source}
                className="px-5 py-2.5 rounded-full bg-card border border-border text-sm font-medium text-foreground"
              >
                {source}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          className="max-w-2xl mx-auto px-6 py-20 text-center"
        >
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">
            Ready to try it?
          </h2>
          <p className="text-muted-foreground mb-8">
            Free to get started. Built for doctors, oncologists, and cancer researchers.
          </p>
          <Link to="/register">
            <Button size="lg">Create your account</Button>
          </Link>
        </motion.div>
      </section>

      <footer className="border-t border-border py-8">
        <p className="text-center text-xs text-muted-foreground">
          GenomicAssist — AI-assisted genomic report interpretation for clinical use.
        </p>
      </footer>
    </div>
  );
}