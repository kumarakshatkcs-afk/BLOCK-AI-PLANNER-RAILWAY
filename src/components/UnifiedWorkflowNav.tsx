import React from 'react';
import { 
  Layers, Cpu, Calendar, AlertOctagon, MapPin, Play, UserCheck, 
  ChevronRight, Sparkles, Train
} from 'lucide-react';

export type WorkflowStepId = 
  | 'intake' 
  | 'priority' 
  | 'gantt' 
  | 'conflict' 
  | 'corridor' 
  | 'whatif' 
  | 'approval';

interface Props {
  activeStep: WorkflowStepId;
  onSelectStep: (step: WorkflowStepId) => void;
}

export const UnifiedWorkflowNav: React.FC<Props> = ({
  activeStep,
  onSelectStep
}) => {
  const steps: { id: WorkflowStepId; number: string; title: string; subtitle: string; icon: React.ReactNode; isCore?: boolean }[] = [
    {
      id: 'intake',
      number: '1',
      title: '3-Dept Intake',
      subtitle: 'Eng / S&T / Traction',
      icon: <Layers className="w-4 h-4" />
    },
    {
      id: 'priority',
      number: '2',
      title: 'AI Priority',
      subtitle: 'XAI Scoring 89/100',
      icon: <Cpu className="w-4 h-4" />
    },
    {
      id: 'gantt',
      number: '3',
      title: 'Main Block Planner ⭐',
      subtitle: 'Timeline & Shadow Block',
      icon: <Calendar className="w-4 h-4" />,
      isCore: true
    },
    {
      id: 'conflict',
      number: '4',
      title: 'Conflict Detection',
      subtitle: 'Timetable Resolution',
      icon: <AlertOctagon className="w-4 h-4" />
    },
    {
      id: 'corridor',
      number: '5',
      title: 'Corridor Map',
      subtitle: 'Trunk Geographic View',
      icon: <MapPin className="w-4 h-4" />
    },
    {
      id: 'whatif',
      number: '6',
      title: 'What-If Sim',
      subtitle: 'Dynamic Re-Planner',
      icon: <Play className="w-4 h-4" />
    },
    {
      id: 'approval',
      number: '7',
      title: 'Human Approval',
      subtitle: 'Sr. DOM Sanction',
      icon: <UserCheck className="w-4 h-4" />
    }
  ];

  return (
    <div className="w-full bg-slate-900 border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3 overflow-x-auto custom-scrollbar gap-2">
          {steps.map((step, idx) => {
            const isActive = activeStep === step.id;
            return (
              <button
                key={step.id}
                id={`nav-step-${step.id}`}
                onClick={() => onSelectStep(step.id)}
                className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-left transition whitespace-nowrap cursor-pointer shrink-0 ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40 ring-1 ring-blue-400' 
                    : step.isCore
                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
                    : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold font-mono ${
                  isActive 
                    ? 'bg-white/20 text-white' 
                    : step.isCore 
                    ? 'bg-amber-500/20 text-amber-300' 
                    : 'bg-slate-700 text-slate-300'
                }`}>
                  {step.number}
                </div>
                
                <div>
                  <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                    {step.title}
                  </div>
                  <div className={`text-[10px] ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                    {step.subtitle}
                  </div>
                </div>

                {idx < steps.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 hidden xl:block ml-1 opacity-50" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
