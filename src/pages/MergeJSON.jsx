import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GitMerge, ChevronRight, Check } from 'lucide-react'
import { toast } from 'react-hot-toast'
import useAppStore from '../store/useAppStore'
import { analyzeFieldsFromA, performSelectiveMerge } from '../services/mergeEngine'
import FileLoadStep    from '../components/merge/FileLoadStep'
import DiffStep        from '../components/merge/DiffStep'
import MergeResultStep from '../components/merge/MergeResultStep'

const STEPS = ['Load Files', 'Select Fields', 'Result']

export default function MergeJSON() {
  const [step,         setStep]         = useState(0)
  const [fileA,        setFileA]        = useState(null) // { name, json }
  const [fileB,        setFileB]        = useState(null)
  const [analysis,     setAnalysis]     = useState(null)
  const [selectedKeys, setSelectedKeys] = useState(new Set())
  const [resolutions,  setResolutions]  = useState({})
  const [mergedJson,   setMergedJson]   = useState(null)

  const { setCurrentJson } = useAppStore()

  const handleAnalyze = () => {
    try {
      const a = analyzeFieldsFromA(fileA.json, fileB.json)
      setAnalysis(a)
      // Pre-select every non-identical field
      const preSelected = new Set()
      for (const ga of a)
        for (const fa of ga.fields)
          if (fa.status !== 'identical') preSelected.add(fa.field.key)
      setSelectedKeys(preSelected)
      setResolutions({})
      setStep(1)
    } catch (err) {
      toast.error('Could not analyse files: ' + err.message)
    }
  }

  const handleMerge = () => {
    try {
      const result = performSelectiveMerge(fileA.json, fileB.json, selectedKeys, resolutions)
      setMergedJson(result)
      setStep(2)
    } catch (err) {
      toast.error('Merge failed: ' + err.message)
    }
  }

  const handleLoadResult = () => {
    setCurrentJson(mergedJson)
    toast.success('Merged JSON loaded into workspace')
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-6 border-b border-edge shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-success/15 flex items-center justify-center">
            <GitMerge size={14} className="text-success" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-ink leading-none">Merge ACF JSON</h1>
            <p className="text-[10px] text-dim mt-0.5">
              Cherry-pick fields from File A to transfer into File B
            </p>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-1">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-1">
              <button
                onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                  i === step ? 'bg-accent-dim text-accent-light' :
                  i <  step  ? 'text-muted hover:text-ink cursor-pointer' :
                               'text-dim cursor-default'
                }`}
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                  i <  step  ? 'bg-success/20 text-success' :
                  i === step ? 'bg-accent text-white' :
                               'bg-elevated border border-edge text-dim'
                }`}>
                  {i < step ? <Check size={8} /> : i + 1}
                </span>
                {label}
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight size={11} className="text-dim shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="s0"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.18 }}
              className="h-full"
            >
              <FileLoadStep
                fileA={fileA} setFileA={setFileA}
                fileB={fileB} setFileB={setFileB}
                onAnalyze={handleAnalyze}
              />
            </motion.div>
          )}

          {step === 1 && analysis && (
            <motion.div
              key="s1"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.18 }}
              className="h-full"
            >
              <DiffStep
                analysis={analysis}
                fileA={fileA}
                fileB={fileB}
                selectedKeys={selectedKeys}
                setSelectedKeys={setSelectedKeys}
                resolutions={resolutions}
                setResolutions={setResolutions}
                onMerge={handleMerge}
                onBack={() => setStep(0)}
              />
            </motion.div>
          )}

          {step === 2 && mergedJson && (
            <motion.div
              key="s2"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.18 }}
              className="h-full"
            >
              <MergeResultStep
                mergedJson={mergedJson}
                onLoad={handleLoadResult}
                onBack={() => setStep(1)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
